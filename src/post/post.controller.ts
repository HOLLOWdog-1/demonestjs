import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PostService } from './post.service.js';
import { createPostSchema } from './dto/create-post.dto.js';
import { updatePostSchema } from './dto/update-post.dto.js';
import type { CreatePostDto } from './dto/create-post.dto.js';
import type { UpdatePostDto } from './dto/update-post.dto.js';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('create')
  create(@Body({ schema: createPostSchema }) dto: CreatePostDto) {
    return this.postService.create(dto);
  }

  @Get('list')
  findAll(@Query('published') published?: string) {
    const filter =
      published === 'true' ? true : published === 'false' ? false : undefined;
    return this.postService.findAll(filter);
  }

  @Get('author/:authorId')
  findByAuthor(@Param('authorId', ParseIntPipe) authorId: number) {
    return this.postService.findByAuthor(authorId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updatePostSchema }) dto: UpdatePostDto,
  ) {
    return this.postService.update(id, dto);
  }

  @Patch(':id/publish')
  togglePublish(@Param('id', ParseIntPipe) id: number) {
    return this.postService.togglePublish(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postService.remove(id);
  }
}
