import { Module } from '@nestjs/common';
import { DemoService } from './demo.service.js';
import { DemoController } from './demo.controller.js';

@Module({
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
