import { Test, TestingModule } from '@nestjs/testing';
import { EmailApprovalService } from './email-approval.service.js';

describe('EmailApprovalService', () => {
  let service: EmailApprovalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailApprovalService],
    }).compile();

    service = module.get<EmailApprovalService>(EmailApprovalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
