import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { createUserSchema } from './dto/create-user.dto.js';
import { updateUserSchema } from './dto/update-user.dto.js';
import { queryUserSchema } from './dto/query-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { QueryUserDto } from './dto/query-user.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  create(@Body() body: unknown, @Query() query: unknown) {
    // 兼容两种发送方式：JSON/form-data body，或 query string（body 为空时取 query）
    const raw =
      body && typeof body === 'object' && Object.keys(body).length > 0
        ? body
        : query;
    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join('；'),
      );
    }
    return this.userService.create(parsed.data);
  }

  @Get('list')
  findAll(@Query({ schema: queryUserSchema }) query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateUserSchema }) dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
