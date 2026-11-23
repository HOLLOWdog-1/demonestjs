import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
  Annotation,
} from '@langchain/langgraph';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { config } from '../config.js';

// Supervisor 多智能体状态：
// - messages：累积整个团队的对话历史（MessagesAnnotation 自带合并 reducer）
// - next：监督者的路由决策（researcher / analyst / writer / finish）
const SupervisorState = Annotation.Root({
  ...MessagesAnnotation.spec,
  next: Annotation<string>(),
});

// 团队成员名单，监督者只允许把任务派发给这三个角色
const MEMBERS = ['researcher', 'analyst', 'writer'] as const;

@Injectable()
export class SupervisorService implements OnModuleInit {
  private graph: any;

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature: config.langGraph.temperature,
    });

    // ── 监督者节点：根据对话进度决定下一步派给谁，或 FINISH 结束 ──
    const supervisorNode = async (state: typeof SupervisorState.State) => {
      const res = await llm.invoke([
        new SystemMessage(`你是多智能体团队的监督者（supervisor），负责统筹调度以下三名成员：
- researcher（研究员）：负责信息收集与事实调研
- analyst（分析师）：负责分析资料、提炼关键洞察
- writer（写作专员）：负责撰写最终成稿

决策规则：
1. 根据当前对话进度，判断下一步该派给哪位成员，只输出一个词：researcher / analyst / writer
2. 当你认为任务已完成、最终成稿已产出时，输出 FINISH
3. 除以上四个单词外，不要输出任何其他内容`),
        ...state.messages,
      ]);

      // 从 LLM 输出中提取决策词；非法输出兜底 finish，避免图陷入死循环
      const content = (res.content as string).toLowerCase();
      const matched = content.match(
        /\b(researcher|analyst|writer|finish)\b/,
      )?.[1];
      const next = matched ?? 'finish';

      console.log(`🧭 [supervisor] 下一步 → ${next}`);
      return { next };
    };

    // ── 研究员节点：信息收集与事实调研 ──
    const researcherNode = async (state: typeof SupervisorState.State) => {
      const res = await llm.invoke([
        new SystemMessage(
          '你是研究员，负责信息收集与事实调研。请围绕用户需求，客观、详实地收集和整理相关资料，为后续分析和写作打好基础。',
        ),
        ...state.messages,
      ]);
      return {
        messages: [
          new AIMessage({ content: res.content as string, name: 'researcher' }),
        ],
      };
    };

    // ── 分析师节点：分析资料、提炼洞察 ──
    const analystNode = async (state: typeof SupervisorState.State) => {
      const res = await llm.invoke([
        new SystemMessage(
          '你是分析师，负责对已有资料进行分析、归纳和提炼，输出清晰的分析结论与关键观点，供写作专员成文使用。',
        ),
        ...state.messages,
      ]);
      return {
        messages: [
          new AIMessage({ content: res.content as string, name: 'analyst' }),
        ],
      };
    };

    // ── 写作专员节点：基于调研与分析成果撰写最终成稿 ──
    const writerNode = async (state: typeof SupervisorState.State) => {
      const res = await llm.invoke([
        new SystemMessage(
          '你是写作专员，负责基于研究员和分析师的成果，撰写结构清晰、语言流畅、面向最终读者的成稿。',
        ),
        ...state.messages,
      ]);
      return {
        messages: [
          new AIMessage({ content: res.content as string, name: 'writer' }),
        ],
      };
    };

    // ── 路由函数：读取监督者写入的 next，映射到对应节点或结束 ──
    const routeByNext: any = (state: typeof SupervisorState.State) =>
      state.next;

    this.graph = new StateGraph(SupervisorState)
      .addNode('supervisor', supervisorNode)
      .addNode('researcher', researcherNode)
      .addNode('analyst', analystNode)
      .addNode('writer', writerNode)
      .addEdge(START, 'supervisor')
      .addConditionalEdges('supervisor', routeByNext, {
        researcher: 'researcher',
        analyst: 'analyst',
        writer: 'writer',
        finish: END,
      })
      // 三个成员完成任务后都回到监督者，由监督者决定下一步
      .addEdge('researcher', 'supervisor')
      .addEdge('analyst', 'supervisor')
      .addEdge('writer', 'supervisor')
      .compile();

    console.log(
      `✅ Supervisor 多智能体初始化完成（监督者 + ${MEMBERS.join(' / ')}）`,
    );
  }

  // 对外入口：接收用户任务，返回最终成稿
  async handle(userInput: string) {
    const result = await this.graph.invoke({
      messages: [new HumanMessage(userInput)],
    });

    // 监督者宣布 FINISH 时，最后一条消息即团队最终交付的成稿
    const lastMessage = result.messages.at(-1);

    return {
      input: userInput,
      response: lastMessage?.content ?? '',
    };
  }
}
