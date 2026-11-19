// src/langgraph/langgraph.module.ts

import { Module } from '@nestjs/common'
import { LanggraphController } from './langgraph.controller.js'
import { LanggraphService }    from './langgraph.service.js'
import { ArticleService }      from './article.service.js'

@Module({
  controllers: [LanggraphController],
  providers:   [LanggraphService, ArticleService],
  exports:     [LanggraphService, ArticleService],
})
  export class LanggraphModule {}