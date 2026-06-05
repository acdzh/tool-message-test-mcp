import { z } from 'zod/v4';

export const annotationsSchema = z.object({
  audience: z.array(z.enum(['user', 'assistant'])).optional().describe('内容受众'),
  priority: z.number().min(0).max(1).optional().describe('优先级 0-1'),
}).optional().describe('MCP annotations，不传则不附加');

export const structuredSchema = z.boolean().default(false).describe('是否额外返回 structuredContent');
