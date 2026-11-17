import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from '../config.js';

@Injectable()
export class ModelsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    baseUrl: config.ollama.baseUrl,
    temperature: config.ollama.temperature,
  });

  // 基础调用
  async basicChat(message: string) {
    const res = await this.llm.invoke([new HumanMessage(message)]);

    return {
      question: message,
      answer: res.content,
      usage: res.usage_metadata,
    };
  }

  // 带 system 设定调用
  async chatWithSys(system: string, message: string) {
    const res = await this.llm.invoke([
      new SystemMessage(system),
      new HumanMessage(message),
    ]);

    return {
      system,
      question: message,
      answer: res.content,
    };
  }

  // SSE 流式输出（打字机效果）
  async streamChat(message: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = await this.llm.stream([new HumanMessage(message)]);

    for await (const chunk of stream) {
      if (chunk.content) {
        res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  // pipe 链 + StringOutputParser
  async chatWithParser(message: string) {
    const chain = this.llm.pipe(new StringOutputParser());
    const answer = await chain.invoke([new HumanMessage(message)]);

    return { question: message, answer };
  }
}
