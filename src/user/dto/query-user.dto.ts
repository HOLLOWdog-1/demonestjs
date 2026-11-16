import { z } from 'zod';

// 用户列表查询参数 schema（query string 值都是字符串）
export const queryUserSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
});

export type QueryUserDto = z.infer<typeof queryUserSchema>;
