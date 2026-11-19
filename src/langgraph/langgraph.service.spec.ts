import { Test, TestingModule } from '@nestjs/testing';
import { AIMessage } from '@langchain/core/messages';
import { LanggraphService } from './langgraph.service.js';

// mock ChatOpenAI：拦截 LLM 调用，返回固定回复，避免依赖真实模型网络
const { llmInvoke } = vi.hoisted(() => ({ llmInvoke: vi.fn() }));

vi.mock('@langchain/openai', () => {
  class FakeChatOpenAI {
    invoke = llmInvoke;
  }
  return { ChatOpenAI: FakeChatOpenAI };
});

describe('LanggraphService', () => {
  let service: LanggraphService;

  beforeEach(async () => {
    llmInvoke.mockReset();
    llmInvoke.mockResolvedValue(new AIMessage('测试回复'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [LanggraphService],
    }).compile();

    service = module.get<LanggraphService>(LanggraphService);
    // TestingModule.compile() 不触发生命周期钩子，手动调用以初始化图
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('simpleChat 返回 AI 回复内容', async () => {
    await expect(service.simpleChat('你好')).resolves.toBe('测试回复');
  });

  it('memoryChat 返回 AI 回复内容', async () => {
    await expect(service.memoryChat('thread-1', '你好')).resolves.toBe(
      '测试回复',
    );
  });

  it('memoryChat 同一 threadId 时携带对话历史', async () => {
    await service.memoryChat('thread-1', '第一句');
    await service.memoryChat('thread-1', '第二句');

    expect(llmInvoke).toHaveBeenCalledTimes(2);
    const secondCallMessages = llmInvoke.mock.calls[1][0] as Array<{
      content: string;
    }>;
    expect(secondCallMessages.some((m) => m.content === '第一句')).toBe(true);
  });

  it('getHistory 返回对话历史', async () => {
    await service.memoryChat('thread-2', '你好');

    const history = await service.getHistory('thread-2');
    expect(history).toEqual([
      { index: 0, role: 'user', content: '你好' },
      { index: 1, role: 'assistant', content: '测试回复' },
    ]);
  });
});
