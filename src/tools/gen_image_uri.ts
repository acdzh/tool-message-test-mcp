import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, randInt } from '../utils/index.js';

export function registerGenImageUri(server: McpServer) {
  server.registerTool(
    'gen_image_uri',
    {
      title: 'Generate Image URI',
      description: '返回 image-uri 类型的图片引用（真实可访问的 URL）',
      inputSchema: z.object({
        width: z.number().min(1).max(4096).default(400).describe('图片宽度'),
        height: z.number().min(1).max(4096).default(300).describe('图片高度'),
        count: z.number().min(1).max(20).default(1).describe('数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ width, height, count, annotations, structured }) => {
      const ann = buildAnnotations(annotations);
      const content = Array.from({ length: count }, (_, i) => ({
        type: 'image-uri',
        // picsum 的 URL 会 302 到真实图片，每次带不同随机种子保证不同
        uri: `https://picsum.photos/${width}/${height}?random=${Date.now()}_${i}_${randInt(1000, 9999)}`,
        mimeType: 'image/jpeg',
        ...(ann ? { annotations: ann } : {}),
      }));

      const result: any = { content };
      if (structured) {
        result.structuredContent = { width, height, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
