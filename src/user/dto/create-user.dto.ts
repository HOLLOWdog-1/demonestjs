import { z } from 'zod';

// 创建用户的请求体 schema
export const createUserSchema = z.object({
  name: z.string({ required_error: '姓名不能为空' }).min(1, '姓名不能为空'),
  email: z.string({ required_error: '邮箱不能为空' }).email('邮箱格式不正确'),
  password: z
    .string({ required_error: '密码不能为空' })
    .min(6, '密码至少 6 位'),
  role: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
