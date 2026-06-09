import { z } from 'zod/v4';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, fetchPicsumBuffer, randInt } from '../utils/index.js';

export function registerGenImageUri(server: McpServer) {
  server.registerTool(
    'gen_image_uri',
    {
      title: 'Generate Image URI',
      description: '返回 image-uri 类型的图片引用。支持 https 和 file 协议',
      inputSchema: z.object({
        width: z.number().min(1).max(4096).default(400).describe('图片宽度'),
        height: z.number().min(1).max(4096).default(300).describe('图片高度'),
        scheme: z.enum(['https', 'file']).default('https').describe('URI 协议。file 会下载图片到本地临时目录'),
        count: z.number().min(1).max(20).default(1).describe('数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ width, height, scheme, count, annotations, structured }) => {
      const ann = buildAnnotations(annotations);

      const content = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          let uri: string;

          if (scheme === 'file') {
            // 下载图片到临时目录，返回 file:// URI
            const dir = resolve(tmpdir(), 'mcp-message-test-images');
            mkdirSync(dir, { recursive: true });
            const filename = `image_${Date.now()}_${i}_${randInt(1000, 9999)}.jpg`;
            const filepath = resolve(dir, filename);
            const buffer = await fetchPicsumBuffer(width, height, Date.now() + i);
            writeFileSync(filepath, buffer);
            uri = `file://${filepath}`;
          } else {
            // picsum 的 URL 会 302 到真实图片，每次带不同随机种子保证不同
            uri = `https://picsum.photos/${width}/${height}?random=${Date.now()}_${i}_${randInt(1000, 9999)}`;
          }

          return {
            type: 'image-uri',
            uri,
            mimeType: 'image/jpeg',
            ...(ann ? { annotations: ann } : {}),
          };
        })
      );

      const result: any = { content };
      if (structured) {
        result.structuredContent = { width, height, scheme, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
