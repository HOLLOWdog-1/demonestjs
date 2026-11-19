import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
  MemorySaver,
} from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config.js';

@Injectable()
export class LanggraphService implements OnModuleInit {
  private simpleGraph: any;
  private memeoryGraph: any;

  onModuleInit() {
    // chatopenai接入ollama
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature: config.langGraph.temperature,
    });

    // 工作流1 无记忆，每次invoke独立
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const res = await llm.invoke(state.messages);
      return { messages: [res] };
    };

    this.simpleGraph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile();

    // 工作流2 有记忆，同threadId
    const callModelWithMemory = async (
      state: typeof MessagesAnnotation.State,
    ) => {
      const message = [
        new SystemMessage('你是专业的Ai助手，请记住对话上下文'),
        ...state.messages,
      ];

      const res = await llm.invoke(message);
      return { messages: [res] };
    };

    this.memeoryGraph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModelWithMemory)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile({ checkpointer: new MemorySaver() });

    console.log(`✅ LangGraph 初始化完成，模型：${config.langGraph.model}`);
  }

  async simpleChat(message: string): Promise<string> {
    const res = await this.simpleGraph.invoke({
      messages: [
        new SystemMessage('你是专业的ai助手，回答简洁清晰'),
        new HumanMessage(message),
      ],
    });
    return res.messages.at(-1).content as string;
  }

  async memoryChat(threadId: string, message: string): Promise<string> {
    const res = await this.memeoryGraph.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: threadId } },
    );

    return res.messages.at(-1).content as string;
  }

  async getHistory(threadId: string) {
    const state = await this.memeoryGraph.getState({
      configurable: { thread_id: threadId },
    });

    return (state.values.messages ?? []).map((m: any, i: number) => ({
      index: i,
      role: m.getType?.() === 'human' ? 'user' : 'assistant',
      content: m.content,
    }));
  }
}
