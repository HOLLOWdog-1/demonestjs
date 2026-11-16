import { z } from 'zod';

// 创建文章的请求体 schema
export const createPostSchema = z.object({
  title: z.string({ required_error: '标题不能为空' }).min(1, '标题不能为空'),
  content: z.string({ required_error: '内容不能为空' }).min(1, '内容不能为空'),
  published: z.boolean().optional(),
  authorId: z.number({ required_error: '作者 ID 不能为空' }),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;
