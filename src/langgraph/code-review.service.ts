import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END, Annotation, Send } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { config } from '../config.js';

// 代码审查状态：
// - code：待审查代码
// - reviews：三个审查 agent 的结论，reducer 自动汇总
// - report：全部审查完成后生成的综合报告
const CodeReviewState = Annotation.Root({
  code: Annotation<string>(),
  reviews: Annotation<{ aspect: string; content: string }[]>({
    reducer: (prev, curr) => [...prev, ...curr],
    default: () => [],
  }),
  report: Annotation<string>(),
});

// 三个审查维度：节点名 + 中文标签 + 审查聚焦点
const REVIEW_TARGETS = [
  {
    name: 'security',
    label: '安全性',
    focus: '注入攻击、XSS、越权、敏感信息泄露、不安全依赖等安全漏洞',
  },
  {
    name: 'conventions',
    label: '规范',
    focus: '命名、代码结构、错误处理、类型安全、可维护性等编码规范',
  },
  {
    name: 'performance',
    label: '性能',
    focus: '时间复杂度、资源泄漏、N+1 查询、阻塞 IO、内存占用等性能问题',
  },
] as const;

@Injectable()
export class CodeReviewService implements OnModuleInit {
  private graph: any;

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      // 代码审查需要确定性输出，温度设为 0
      temperature: 0,
    });

    // ── 分发节点：纯路由节点，不调 LLM，只负责触发三路扇出 ──
    const dispatch = () => {
      console.log('📤 [dispatch] 分发代码审查任务：安全性 / 规范 / 性能');
      return {};
    };

    // 扇出函数：条件边返回三个 Send，三个审查 agent 并行执行
    const continueToReviewers = (state: typeof CodeReviewState.State) =>
      REVIEW_TARGETS.map((t) => new Send(t.name, { code: state.code }));

    // 审查 agent 工厂：按维度生成安全性/规范/性能三个审查节点
    const makeReviewer =
      (target: (typeof REVIEW_TARGETS)[number]) =>
      async (state: typeof CodeReviewState.State) => {
        const res = await llm.invoke([
          new HumanMessage(`你是代码审查专家，专门负责【${target.label}】维度的审查。请逐条审查以下代码在${target.focus}方面的问题，每条给出：问题描述、出现位置、修改建议；若该维度没有明显问题，请明确说明。

待审查代码：
\`\`\`
${state.code}
\`\`\``),
        ]);
        return {
          reviews: [{ aspect: target.label, content: res.content as string }],
        };
      };

    // ── 综合报告节点：三路审查全部完成后自动汇聚，生成综合报告 ──
    const mergeReport = async (state: typeof CodeReviewState.State) => {
      const reviewText = state.reviews
        .map((r) => `【${r.aspect}审查】\n${r.content}`)
        .join('\n\n');

      const res = await llm.invoke([
        new HumanMessage(`你是资深代码审查负责人，请汇总以下三个维度的审查结果，生成一份结构清晰的综合审查报告：先给出总体结论，再按安全性、规范、性能分类列出问题清单与修改建议，最后给出修复优先级排序。

待审查代码：
\`\`\`
${state.code}
\`\`\`

各维度审查结果：
${reviewText}`),
      ]);
      return { report: res.content as string };
    };

    this.graph = new StateGraph(CodeReviewState)
      .addNode('dispatch', dispatch, {
        ends: ['security', 'conventions', 'performance'],
      })
      .addNode('security', makeReviewer(REVIEW_TARGETS[0]), {
        ends: ['mergeReport'],
      })
      .addNode('conventions', makeReviewer(REVIEW_TARGETS[1]), {
        ends: ['mergeReport'],
      })
      .addNode('performance', makeReviewer(REVIEW_TARGETS[2]), {
        ends: ['mergeReport'],
      })
      .addNode('mergeReport', mergeReport)
      .addEdge(START, 'dispatch')
      .addConditionalEdges('dispatch', continueToReviewers, [
        'security',
        'conventions',
        'performance',
      ])
      // 三个审查 agent 完成后都汇聚到综合报告节点（等待全部完成才执行）
      .addEdge('security', 'mergeReport')
      .addEdge('conventions', 'mergeReport')
      .addEdge('performance', 'mergeReport')
      .addEdge('mergeReport', END)
      .compile();

    console.log(
      '✅ 代码审查多智能体初始化完成（分发 → 安全性/规范/性能 并行审查 → 综合报告）',
    );
  }

  // 对外入口：传入代码，返回三路审查结果与综合报告
  async review(code: string) {
    const result = await this.graph.invoke({ code });

    return {
      code: result.code,
      reviews: result.reviews,
      report: result.report,
    };
  }
}
