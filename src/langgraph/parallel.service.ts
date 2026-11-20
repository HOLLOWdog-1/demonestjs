import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import {
  StateGraph,
  Annotation,
  MessagesAnnotation,
  MemorySaver,
  START,
  END,
  Send,
  Command,
  task,
} from '@langchain/langgraph';
import { config } from '../config.js';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 主图state， 收集所有子任务结果
const ParallelState = Annotation.Root({
  task: Annotation<string>(),
  results: Annotation<{ task: string; result: string }[]>({
    reducer: (prev, curr) => [...prev, ...curr],
    default: () => [],
  }),
  finalReport: Annotation<string>(),
});

// 子图state
const SubState = Annotation.Root({
  task: Annotation<string>(),
});

@Injectable()
export class ParallelService implements OnModuleInit {
  private graph: any;
  onModuleInit() {
    // 创建chatollama实例
    const llm = new ChatOllama({
      model: config.ollama.chatModel,
      temperature: config.ollama.temperature,
      baseUrl: config.ollama.baseUrl,
      think: false,
      numPredict: 512,
    });

    const splitTask = async (state: typeof ParallelState.State) => {
      const res = await llm.invoke([
        new HumanMessage(
          `把以下任务拆成 3 个独立子任务，每个子任务单独一行，不要编号：\n\n${state.task}`,
        ),
      ]);
      console.log('拆分结果:', res.content);

      const subTasks = (res.content as string)
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);

      subTasks.forEach((t, i) => console.log(`子任务${i + 1}: ${t}}`));

      return new Command({
        goto: subTasks.map(
          (item, index) => new Send('processSubTask', { task: item }),
        ),
      });
    };
    const processSubTask = async (state: typeof SubState.State) => {
      console.log('\n⚡ [processSubTask] 处理子任务：', state.task);

      const res = await llm.invoke([
        new HumanMessage(`请完成以下任务, 100字以内：\n\n${state.task}`),
      ]);

      console.log('子任务结果是：', res.content);
      return { results: [{ task: state.task, result: res.content as string }] };
    };
    const mergeResults = async (state: typeof ParallelState.State) => {
      console.log('汇总子任务结果：', state.results.length);

      const text = state.results.map(
        (r, i) => `子任务${i + 1}: ${r.task}\n结果： ${r.result}`,
      );

      const res = await llm.invoke([
        new HumanMessage(
          `根据以下子任务结果，生成 200 字综合报告：\n\n${text}`,
        ),
      ]);

      return { finalReport: res.content as string };
    };

    this.graph = new StateGraph(ParallelState)
      .addNode('splitTask', splitTask, { ends: ['processSubTask'] })
      .addNode('processSubTask', processSubTask, { ends: ['mergeResults'] })
      .addNode('mergeResults', mergeResults)
      .addEdge(START, 'splitTask')
      .addEdge('processSubTask', 'mergeResults')
      .addEdge('mergeResults', END)
      .compile();
  }

  async run(task: string) {
    const t0 = Date.now();

    const result = await this.graph.invoke({ task });

    console.log('总耗时:', Date.now() - t0, 'ms');

    return {
      subTasks: result.results.map((r: any) => r.task),
      results: result.results,
      finalReport: result.finalReport,
      totalTime: `${Date.now() - t0}ms`,
    };
  }
}
