import 'dotenv/config';
import { defineConfig as orm } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from 'prisma/config';

export default definePrismaConfig({
  orm: orm({
    contract: './src/prisma/contract.prisma', // Prisma 8 原生 contract 源文件
    db: { connection: process.env['DATABASE_URL']! },
  }),
  skills: { agents: ['claude', 'agents'] },
});
