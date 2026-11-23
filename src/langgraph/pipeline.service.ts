import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { config } from '../config.js';

// 内容创作流水线状态：五个通道，各阶段节点接力写入
const PipelineState = Annotation.Root({
  topic: Annotation<string>(), // 用户主题
  materials: Annotation<string>(), // 素材
  outline: Annotation<string>(), // 大纲
  draft: Annotation<string>(), // 初稿
  final: Annotation<string>(), // 终稿
});

@Injectable()
export class PipelineService implements OnModuleInit {
  private graph: any;

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature: config.langGraph.temperature,
    });

    // ── 素材收集：围绕主题收集背景资料与观点素材 ──
    const collectMaterials = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是素材收集员，请围绕主题收集相关的背景资料、事实数据、案例和观点，为后续写作提供充足的素材。

主题：${state.topic}`),
      ]);
      return { materials: res.content as string };
    };

    // ── 大纲：基于素材生成结构化的文章大纲 ──
    const makeOutline = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是大纲规划师，请根据主题和已收集的素材，生成结构清晰的文章大纲，包含标题建议和各部分要点。

主题：${state.topic}

素材：
${state.materials}`),
      ]);
      return { outline: res.content as string };
    };

    // ── 初稿：依据大纲撰写完整初稿 ──
    const writeDraft = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是初稿写手，请严格依据大纲撰写文章初稿，内容充实、段落完整，可暂不追求文字精炼。

主题：${state.topic}

大纲：
${state.outline}

素材：
${state.materials}`),
      ]);
      return { draft: res.content as string };
    };

    // ── 终稿：对初稿润色打磨，输出最终定稿 ──
    const polishFinal = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是资深编辑，请对初稿进行润色打磨：修正语病、优化表达、统一风格、提升可读性，输出最终定稿。

主题：${state.topic}

初稿：
${state.draft}`),
      ]);
      return { final: res.content as string };
    };

    this.graph = new StateGraph(PipelineState)
      .addNode('collectMaterials', collectMaterials)
      .addNode('makeOutline', makeOutline)
      .addNode('writeDraft', writeDraft)
      .addNode('polishFinal', polishFinal)
      .addEdge(START, 'collectMaterials')
      .addEdge('collectMaterials', 'makeOutline')
      .addEdge('makeOutline', 'writeDraft')
      .addEdge('writeDraft', 'polishFinal')
      .addEdge('polishFinal', END)
      .compile();

    console.log('✅ 内容创作流水线初始化完成（素材收集 → 大纲 → 初稿 → 终稿）');
  }

  // 对外入口：传入主题，返回流水线各阶段产物
  async run(topic: string) {
    const result = await this.graph.invoke({ topic });

    return {
      topic: result.topic,
      materials: result.materials,
      outline: result.outline,
      draft: result.draft,
      final: result.final,
    };
  }
}
