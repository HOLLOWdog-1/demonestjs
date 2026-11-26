// src/langgraph/tech-research/tech-research.module.ts

import { Module } from '@nestjs/common'
import { TechResearchController } from './tech-research.controller.js'
import { TechResearchService }    from './tech-research.service.js'

@Module({
  controllers: [TechResearchController],
  providers:   [TechResearchService],
  exports:     [TechResearchService],
})
  export class TechResearchModule {}