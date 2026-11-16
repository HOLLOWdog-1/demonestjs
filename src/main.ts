import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import multer from 'multer';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // 解析 multipart/form-data 的文本字段到 req.body（不接收文件），
  // 兼容 Apifox/Postman 用 form-data 发送的请求
  app.use(multer().none());

  // 校验所有声明了 schema 的 @Body/@Query/@Param，失败时返回 400 与明确错误信息
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
