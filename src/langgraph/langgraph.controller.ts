// src/langgraph/langgraph.controller.ts（完整版，包含第一章和第二章接口）

import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';
import { ArticleService } from './article.service.js';
import { ReactAgentService } from './react-agent.service.js';
import { RoutingService } from './routing.service.js';
import { ParallelService } from './parallel.service.js';

@Controller('langgraph')
export class LanggraphController {
  constructor(
    private readonly svc: LanggraphService,
    private readonly articleSvc: ArticleService,
    private readonly reactSvc: ReactAgentService,
    private readonly routingSvc: RoutingService,
    private readonly parallelSvc: ParallelService,
  ) {}

  // ── 第一章接口 ──────────────────────────────────────
  @Post('simple-chat')
  simpleChat(@Body() body: { message: string }) {
    return this.svc.simpleChat(body.message).then((answer) => ({ answer }));
  }

  @Post('memory-chat')
  memoryChat(@Body() body: { threadId: string; message: string }) {
    return this.svc
      .memoryChat(body.threadId, body.message)
      .then((answer) => ({ answer }));
  }

  @Get('history/:threadId')
  getHistory(@Param('threadId') threadId: string) {
    return this.svc.getHistory(threadId);
  }

  @Post('article')
  processArticle(@Body() body: { article: string }) {
    return this.articleSvc.process(body.article);
  }

  // ── 第二章接口 ──────────────────────────────────────
  @Post('react-chat')
  @HttpCode(200)
  reactChat(@Body() body: { threadId: string; message: string }) {
    return this.reactSvc
      .chat(body.threadId, body.message)
      .then((answer) => ({ answer }));
  }

  @Post('route')
  @HttpCode(200)
  route(@Body() body: { input: string }) {
    return this.routingSvc.handle(body.input);
  }

  @Post('parallel')
  @HttpCode(200)
  parallel(@Body() body: { task: string }) {
    return this.parallelSvc.run(body.task);
  }
}
