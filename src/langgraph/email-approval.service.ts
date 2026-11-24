import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import {
  StateGraph,
  START,
  END,
  Annotation,
  MemorySaver,
  interrupt,
  Command,
} from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { config } from '../config.js';

const EmailState = Annotation.Root({
  emailRequest: Annotation<string>(),
  draftEmail: Annotation<{
    subject: string;
    recipient: string;
    body: string;
  }>(),
  approvalStatus: Annotation<
    'pending' | 'approved' | 'rejected' | 'need_modify'
  >(),
  modifyFeedback: Annotation<string>(),
  revisionCount: Annotation<number>({
    reducer: (prev, curr) => prev + curr,
    default: () => 0,
  }),
  finalStatus: Annotation<string>(),
});

@Injectable()
export class EmailApprovalService implements OnModuleInit {
  private graph: any;
  private checkpointer: MemorySaver;

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.chatModel, // Ollama 模型名称
      temperature: config.ollama.temperature, // 生成文本的随机程度
      baseUrl: config.ollama.baseUrl, // Ollama 服务器地址
      think: false, // 是否开启思考模式，开启后模型会先返回一个思考中的消息，等生成完成后再返回最终回答
      numPredict: 512, // 生成文本的最大 token 数量，512 是一个比较合理的值，可以根据需要调整
    });

    // ── 节点一：起草邮件
    const draftNode = async (state: typeof EmailState.State) => {
      const isRevision = typeof state.modifyFeedback === 'string';
      console.log(
        `\n✍️  [draftNode] ${isRevision ? '根据修改意见重新起草' : '初次起草'}邮件`,
      );

      const prompt = isRevision
        ? `根据修改意见重新起草邮件:
                修改意见：${state.modifyFeedback},原始意见：${state.emailRequest},上次草稿：${JSON.stringify(state.draftEmail)}`
        : `根据需求起草一风专业邮件${state.emailRequest}`;

      const res = await llm.invoke([
        new HumanMessage(`${prompt}\n\n输出 JSON（不要其他内容）：
{"subject":"邮件主题","recipient":"收件人","body":"正文内容"}`),
      ]);

      let draft: { subject: string; recipient: string; body: string };

      try {
        const json = (res.content as string)
          .replace(/```json\n?|\n?```/g, '')
          .trim();
        draft = JSON.parse(json);
      } catch {
        draft = {
          subject: '草稿',
          recipient: '未知',
          body: res.content as string,
        };
      }

      console.log(`   收件人: ${draft.recipient}，主题: ${draft.subject}`);
      return {
        draftEmail: draft,
        approvalStatus: 'pending' as const,
        revisionCount: isRevision ? 1 : 0,
      };
    };

    // ── 节点二：等待人工审批（interrupt 暂停）──────────
    const waitNode = async (state: typeof EmailState.State) => {
      console.log(
        `\n⏸️[waitNode] 等待人工审批（第 ${state.revisionCount + 1} 版）`,
      );

      const decision = interrupt({
        type: 'email_review',
        message: `请审查意见（第${state.revisionCount} 版本）`,
        draft: state.draftEmail,
        options: {
          approve: '批准发送',
          reject: '拒绝发送/取消发送',
          modify: '需要修改（附修改意见）',
        },
      });

      console.log(`   人工决定: ${JSON.stringify(decision)} `);
      if (typeof decision === 'string') {
        // 兼容人工端按 options 键（approve/reject）或状态值（approved/rejected）两种方式恢复
        const normalized =
          { approve: 'approved', reject: 'rejected' }[decision] ?? decision;
        return { approvalStatus: normalized as any };
      }
      if (
        typeof decision === 'object' &&
        (decision as any).action === 'modify'
      ) {
        return {
          approvalStatus: 'need_modify' as const,
          modifyFeedback: (decision as any).feedback as string,
        };
      }

      return { approvalStatus: 'rejected' as const };
    };

    // ── 路由函数 ──────────────────────────────────────
    const routeAfterApproval = (state: typeof EmailState.State) => {
      console.log(`\n🔀[route] approvalStatus = ${state.approvalStatus} `);
      switch (state.approvalStatus) {
        case 'approved':
          return 'sendNode';
        case 'need_modify':
          return 'draftNode';
        default:
          return 'cancelNode';
      }
    };

    // ── 节点三：发送邮件 ──────────────────────────────
    const sendNode = async (state: typeof EmailState.State) => {
      console.log(`\n📤[sendNode] 发送邮件`);
      console.log(`   收件人: ${state.draftEmail.recipient} `);
      console.log(`   主题:   ${state.draftEmail.subject} `);
      // 实际项目里调用 Nodemailer / SendGrid / 企业邮件 API
      return {
        finalStatus: `✅ 邮件已发送\n收件人：${state.draftEmail.recipient} \n主题：${state.draftEmail.subject} `,
      };
    };

    // ── 节点四：取消发送 ──────────────────────────────
    const cancelNode = async (state: typeof EmailState.State) => {
      console.log(
        `\n🚫[cancelNode] 邮件已取消，状态: ${state.approvalStatus} `,
      );
      return {
        finalStatus: `❌ 邮件已取消（审批状态：${state.approvalStatus}）`,
      };
    };

    this.checkpointer = new MemorySaver();
    this.graph = new StateGraph(EmailState)
      .addNode('draftNode', draftNode)
      .addNode('waitNode', waitNode)
      .addNode('sendNode', sendNode)
      .addNode('cancelNode', cancelNode)
      .addEdge(START, 'draftNode')
      .addEdge('draftNode', 'waitNode')
      .addConditionalEdges('waitNode', routeAfterApproval, {
        sendNode: 'sendNode',
        draftNode: 'draftNode',
        cancelNode: 'cancelNode',
      })
      .addEdge('sendNode', END)
      .addEdge('cancelNode', END)
      .compile({ checkpointer: this.checkpointer });

    console.log('✅ 邮件审批工作流初始化完成');
  }

  // 校验线程确实存在且正挂起在 waitNode 等待人工审批，防止对未知/已结束的线程误报成功
  private async assertPendingApproval(threadId: string) {
    const snapshot = await this.graph.getState({
      configurable: { thread_id: threadId },
    });
    const values = snapshot.values ?? {};
    if (Object.keys(values).length === 0) {
      throw new NotFoundException(`线程 ${threadId} 不存在`);
    }
    const hasInterrupt = (snapshot.tasks ?? []).some(
      (t: any) => (t.interrupts ?? []).length > 0,
    );
    if (!hasInterrupt) {
      throw new BadRequestException(`线程 ${threadId} 当前没有待审批的邮件`);
    }
  }

  async start(emailRequest: string, threadId: string) {
    console.log(`\n${'═'.repeat(50)} `);
    console.log(`📨[email / start] threadId: ${threadId} `);
    console.log(`   需求: "${emailRequest}"`);

    // 清空该线程的历史 checkpoint，避免上一次流程残留的 modifyFeedback/finalStatus/revisionCount 串扰新邮件
    await this.checkpointer.deleteThread(threadId);

    const result = await this.graph.invoke(
      { emailRequest },
      { configurable: { thread_id: threadId } },
    );

    if (result.__interrupt__) {
      return {
        state: 'waiting_for_approval',
        threadId,
        reviewData: result.__interrupt__[0].value,
        message: '邮件草稿已生成，请审批',
      };
    }
    return { status: 'completed', result };
  }

  async approve(threadId: string) {
    console.log(`\n✅[email / approve] threadId: ${threadId} `);

    await this.assertPendingApproval(threadId);

    await this.graph.invoke(new Command({ resume: 'approved' }), {
      configurable: { thread_id: threadId },
    });

    const state = await this.graph.getState({
      configurable: { thread_id: threadId },
    });

    return { status: 'email_sent', finalStatus: state.values.finalStatus };
  }

  async reject(threadId: string) {
    console.log(`\n❌[email / reject] threadId: ${threadId} `);
    await this.assertPendingApproval(threadId);
    await this.graph.invoke(new Command({ resume: 'rejected' }), {
      configurable: { thread_id: threadId },
    });
    return { status: 'cancelled', message: '邮件已经取消发送' };
  }

  async requestModify(threadId: string, feedback: string) {
    console.log(`\n✏️[email / modify] threadId: ${threadId} `);
    console.log(`   修改意见: "${feedback}"`);

    await this.assertPendingApproval(threadId);

    const result = await this.graph.invoke(
      new Command({ resume: { action: 'modify', feedback } }),
      { configurable: { thread_id: threadId } },
    );

    if (result.__interrupt__) {
      return {
        state: 'waiting_for_approval',
        threadId,
        reviewData: result.__interrupt__[0].value,
        message: '邮件已经修改，请重新审批',
      };
    }

    return { status: 'completed' };
  }

  async getState(threadId: string) {
    const state = await this.graph.getState({
      configurable: { thread_id: threadId },
    });
    return state.values;
  }
}
