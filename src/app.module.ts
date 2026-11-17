import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DemoModule } from './demo/demo.module.js';
import { ArticleModule } from './article/article.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PostModule } from './post/post.module.js'
import { UserModule } from './user/user.module.js'
import { ModelsModule } from './models/models.module.js';
import { PromptsModule } from './prompts/prompts.module.js';
import { ChainsModule } from './chains/chains.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { MemoryModule } from './memory/memory.module.js';
import { RagModule } from './rag/rag.module.js';
import { FunctionCallingModule } from './function-calling/function-calling.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'my-nest-demo',
    }),
    DemoModule,
    ArticleModule,
    PrismaModule,
    UserModule,
    PostModule,
    ModelsModule,
    PromptsModule,
    ChainsModule,
    AgentsModule,
    MemoryModule,
    RagModule,
    FunctionCallingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
