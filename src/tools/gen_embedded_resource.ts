import { z } from 'zod/v4';
import { resolve } from 'path';
import type { McpServer } from '@byted/modelcontextprotocol-server';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { assetsDir, loadAssetBase64, loadAssetText, buildAnnotations, randPick } from '../utils/index.js';

export function registerGenEmbeddedResource(server: McpServer) {
  server.registerTool(
    'gen_embedded_resource',
    {
      title: 'Generate Embedded Resource',
      description: '生成嵌入式资源内容（text 或 blob）',
      inputSchema: z.object({
        resource_type: z.enum(['text', 'blob']).default('text').describe('资源类型'),
        count: z.number().min(1).max(20).default(1).describe('数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ resource_type, count, annotations, structured }) => {
      const ann = buildAnnotations(annotations);

      const content = Array.from({ length: count }, () => {
        if (resource_type === 'text') {
          const files = ['sample.ts', 'sample.txt'];
          const file = randPick(files);
          const mime = file.endsWith('.ts') ? 'text/typescript' : 'text/plain';
          return {
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, file)}`,
              mimeType: mime,
              text: loadAssetText(file),
              ...(ann ? { annotations: ann } : {}),
            },
          };
        }
        // blob
        const files = ['sample.png', 'sample.jpg', 'sample.webp'];
        const file = randPick(files);
        const mimeMap: Record<string, string> = { 'sample.png': 'image/png', 'sample.jpg': 'image/jpeg', 'sample.webp': 'image/webp' };
        return {
          type: 'resource' as const,
          resource: {
            uri: `file://${resolve(assetsDir, file)}`,
            mimeType: mimeMap[file]!,
            blob: loadAssetBase64(file),
            ...(ann ? { annotations: ann } : {}),
          },
        };
      });

      const result: any = { content };
      if (structured) {
        result.structuredContent = { resource_type, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
