import {
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
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { QueryUserDto } from './dto/query-user.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  create(@Body({ schema: createUserSchema }) dto: CreateUserDto) {
    return this.userService.create(dto);
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
