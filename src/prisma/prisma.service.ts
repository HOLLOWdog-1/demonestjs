import { Injectable, OnModuleDestroy } from "@nestjs/common"
import { db } from "./db.js"


@Injectable()
    export class PrismaService implements OnModuleDestroy {
        get orm() {
            return db.orm
        }

        get sql() {
            return db.sql
        }

        get raw() {
            return db.raw
        }

        async onModuleDestroy() {
            await db.close()
            console.log('Prisma 8 数据库连接已经关闭')
        }
    }

