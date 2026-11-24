import { Test, TestingModule } from '@nestjs/testing';
import { LanggraphController } from './langgraph.controller.js';
import { LanggraphService } from './langgraph.service.js';
import { ArticleService } from './article.service.js';
import { ReactAgentService } from './react-agent.service.js';
import { RoutingService } from './routing.service.js';
import { ParallelService } from './parallel.service.js';
import { EmailApprovalService } from './email-approval.service.js';

describe('LanggraphController', () => {
  let controller: LanggraphController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanggraphController],
      providers: [
        LanggraphService,
        ArticleService,
        ReactAgentService,
        RoutingService,
        ParallelService,
        EmailApprovalService,
      ],
    }).compile();

    controller = module.get<LanggraphController>(LanggraphController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
