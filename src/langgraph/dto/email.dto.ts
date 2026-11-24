import { z } from 'zod';

// 邮件审批接口的请求 schema（配合全局 StandardSchemaValidationPipe 校验）
export const emailStartSchema = z.object({
  request: z
    .string({ required_error: 'request 不能为空' })
    .min(1, 'request 不能为空'),
  threadId: z
    .string({ required_error: 'threadId 不能为空' })
    .min(1, 'threadId 不能为空'),
});

export const emailModifySchema = z.object({
  feedback: z
    .string({ required_error: 'feedback 不能为空' })
    .min(1, 'feedback 不能为空'),
});

export const threadIdSchema = z
  .string({ required_error: 'threadId 不能为空' })
  .min(1, 'threadId 不能为空');

export type EmailStartDto = z.infer<typeof emailStartSchema>;
export type EmailModifyDto = z.infer<typeof emailModifySchema>;
