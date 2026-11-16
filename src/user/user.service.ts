import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // 创建用户
  async create(dto: CreateUserDto) {
    const user = await this.prisma.orm.public.User.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role ?? 'user',
    });

    return {
      success: true,
      data: user,
    };
  }

  // 分页与条件查询
  async findAll(query: QueryUserDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Number(query.pageSize) || 10, 100);
    const offset = (page - 1) * pageSize;

    let usersQuery = this.prisma.orm.public.User;

    // name 模糊搜索
    if (query.name) {
      usersQuery = usersQuery.where((user) =>
        user.name.like(`%${query.name}%`),
      );
    }

    // role 精确过滤
    if (query.role) {
      usersQuery = usersQuery.where({ role: query.role });
    }

    const list = await usersQuery
      .orderBy((user) => user.createdAt.desc())
      .offset(offset)
      .limit(pageSize)
      .all();

    const totalResult = await this.prisma.orm.public.User.aggregate(
      (aggregate) => ({
        total: aggregate.count(),
      }),
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / pageSize);

    return {
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      list,
    };
  }

  // 查询单个用户
  async findOne(id: number) {
    const user = await this.prisma.orm.public.User.where({ id })
      .include('posts', (post) =>
        post
          .select('id', 'title', 'published', 'createdAt')
          .orderBy((post) => post.createdAt.desc()),
      )
      .first();

    if (!user) {
      return {
        success: false,
        message: `用户 ID ${id} 不存在`,
      };
    }

    return {
      success: true,
      data: user,
    };
  }

  // 更新用户
  async update(id: number, dto: UpdateUserDto) {
    const exists = await this.prisma.orm.public.User.where({ id }).first();

    if (!exists) {
      return {
        success: false,
        message: `用户 ID ${id} 不存在`,
      };
    }

    const updated = await this.prisma.orm.public.User.where({ id }).update({
      ...dto,
    });

    return {
      success: true,
      message: '更新成功',
      data: updated,
    };
  }

  // 删除用户
  async remove(id: number) {
    const exists = await this.prisma.orm.public.User.where({ id }).first();

    if (!exists) {
      return {
        success: false,
        message: `用户 ID ${id} 不存在`,
      };
    }

    await this.prisma.orm.public.User.where({ id }).delete();

    return {
      success: true,
      message: `用户 ID ${id} 已删除`,
    };
  }
}
