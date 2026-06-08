import { z } from 'zod/v4';
import sharp from 'sharp';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, fetchPicsumBuffer, generateTextContent, randInt, randPick } from '../utils/index.js';

export function registerGenEmbeddedResource(server: McpServer) {
  server.registerTool(
    'gen_embedded_resource',
    {
      title: 'Generate Embedded Resource',
      description: '动态生成嵌入式资源内容（text 或 blob）',
      inputSchema: z.object({
        resource_type: z.enum(['text', 'blob']).default('text').describe('资源类型'),
        width: z.number().min(1).max(4096).default(400).describe('图片宽度（仅 blob 有效）'),
        height: z.number().min(1).max(4096).default(300).describe('图片高度（仅 blob 有效）'),
        format: z.enum(['jpg', 'png', 'webp']).default('jpg').describe('图片格式（仅 blob 有效）'),
        count: z.number().min(1).max(20).default(1).describe('数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ resource_type, width, height, format, count, annotations, structured }) => {
      const ann = buildAnnotations(annotations);
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

      const content = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          if (resource_type === 'text') {
            const res = generateTextContent();
            const id = crypto.randomUUID().slice(0, 8);
            return {
              type: 'resource' as const,
              resource: {
                uri: `generated://embedded/text_${id}.${res.ext}`,
                mimeType: res.mime,
                text: res.text,
                ...(ann ? { annotations: ann } : {}),
              },
            };
          }
          // blob: 从 picsum 获取真实图片
          const srcBuffer = await fetchPicsumBuffer(width, height, Date.now() + i);
          let outputBuffer: Buffer;
          if (format === 'jpg') {
            outputBuffer = srcBuffer;
          } else {
            outputBuffer = await sharp(srcBuffer).toFormat(format as any).toBuffer();
          }
          const id = crypto.randomUUID().slice(0, 8);
          const ext = format === 'jpg' ? 'jpg' : format;
          return {
            type: 'resource' as const,
            resource: {
              uri: `generated://embedded/image_${id}.${ext}`,
              mimeType: mimeMap[format]!,
              blob: outputBuffer.toString('base64'),
              ...(ann ? { annotations: ann } : {}),
            },
          };
        })
      );

      const result: any = { content };
      if (structured) {
        result.structuredContent = { resource_type, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
