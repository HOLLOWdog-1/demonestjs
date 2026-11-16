import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  // 创建文章
  async create(dto: CreatePostDto) {
    const author = await this.prisma.orm.public.User.where({
      id: dto.authorId,
    }).first();

    if (!author) {
      return {
        success: false,
        message: `用户 ID ${dto.authorId} 不存在`,
      };
    }

    const post = await this.prisma.orm.public.Post.create({
      title: dto.title,
      content: dto.content,
      published: dto.published ?? false,
      authorId: dto.authorId,
    });

    const result = await this.prisma.orm.public.Post.where({ id: post.id })
      .include('author')
      .first();

    return {
      success: true,
      data: result,
    };
  }

  // 查询文章列表
  async findAll(published?: boolean) {
    let query = this.prisma.orm.public.Post;

    if (published !== undefined) {
      query = query.where({ published });
    }

    const posts = await query
      .include('author')
      .orderBy((post) => post.createdAt.desc())
      .all();

    return {
      total: posts.length,
      list: posts,
    };
  }

  // 查询单篇文章
  async findOne(id: number) {
    const post = await this.prisma.orm.public.Post.where({ id })
      .include('author')
      .first();

    if (!post) {
      return {
        success: false,
        message: `文章 ID ${id} 不存在`,
      };
    }

    return {
      success: true,
      data: post,
    };
  }

  // 更新文章
  async update(id: number, dto: UpdatePostDto) {
    const updated = await this.prisma.orm.public.Post.where({ id }).update({
      ...dto,
    });

    if (!updated) {
      return {
        success: false,
        message: `文章 ID ${id} 不存在`,
      };
    }

    return {
      success: true,
      message: '更新成功',
      data: updated,
    };
  }

  // 发布 / 取消发布
  async togglePublish(id: number) {
    const post = await this.prisma.orm.public.Post.where({ id }).first();

    if (!post) {
      return {
        success: false,
        message: `文章 ID ${id} 不存在`,
      };
    }

    const updated = await this.prisma.orm.public.Post.where({ id }).update({
      published: !post.published,
    });

    return {
      success: true,
      message: updated?.published ? '文章已发布' : '文章已取消发布',
      data: updated,
    };
  }

  // 删除文章
  async remove(id: number) {
    const deleted = await this.prisma.orm.public.Post.where({ id }).delete();

    if (!deleted) {
      return {
        success: false,
        message: `文章 ID ${id} 不存在`,
      };
    }

    return {
      success: true,
      message: `文章 ID ${id} 已删除`,
    };
  }

  // 查询某个作者的文章
  async findByAuthor(authorId: number) {
    const posts = await this.prisma.orm.public.Post.where({ authorId })
      .orderBy((post) => post.createdAt.desc())
      .all();

    return {
      total: posts.length,
      list: posts,
    };
  }
}
