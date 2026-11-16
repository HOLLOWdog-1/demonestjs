import { z } from 'zod';

// 更新用户的请求体 schema
export const updateUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  password: z.string().min(6, '密码至少 6 位').optional(),
  role: z.string().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
