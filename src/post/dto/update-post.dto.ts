import { z } from 'zod';

// 更新文章的请求体 schema
export const updatePostSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
});

export type UpdatePostDto = z.infer<typeof updatePostSchema>;
