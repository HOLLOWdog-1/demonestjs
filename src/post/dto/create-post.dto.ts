import { z } from 'zod';

// 创建文章的请求体 schema
export const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  published: z.boolean().optional(),
  authorId: z.number(),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;
