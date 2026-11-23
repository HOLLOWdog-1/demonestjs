// src/langgraph/langgraph.module.ts

import { Module } from '@nestjs/common'
import { LanggraphController } from './langgraph.controller.js'
import { ReactAgentService } from './react-agent.service.js';
import { RoutingService } from './routing.service.js';
import { ParallelService } from './parallel.service.js';
import { SupervisorService } from './supervisor.service.js';
import { PipelineService } from './pipeline.service.js';
import { CodeReviewService } from './code-review.service.js';
import { LanggraphService }    from './langgraph.service.js'
import { ArticleService }      from './article.service.js'

@Module({
  controllers: [LanggraphController],
  providers:   [LanggraphService, ArticleService, ReactAgentService, RoutingService, ParallelService, SupervisorService, PipelineService, CodeReviewService],
  exports:     [LanggraphService, ArticleService],
})
  export class LanggraphModule {}