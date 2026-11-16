import { z } from 'zod';

// 创建用户的请求体 schema
export const createUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  role: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
