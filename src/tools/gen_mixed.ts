import { z } from 'zod/v4';
import { resolve } from 'path';
import type { McpServer } from '@byted/modelcontextprotocol-server';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { assetsDir, fetchBase64, loadAssetText, buildAnnotations, randInt, randPick, randParagraph, generateWav } from '../utils/index.js';

export function registerGenMixed(server: McpServer) {
  server.registerTool(
    'gen_mixed',
    {
      title: 'Generate Mixed Content',
      description: '在一次响应中返回多种内容类型的混合',
      inputSchema: z.object({
        types: z.array(z.enum(['text', 'image', 'image_uri', 'audio', 'resource_link', 'resource']))
          .default(['text', 'image', 'resource_link'])
          .describe('要包含的内容类型'),
        count_per_type: z.number().min(1).max(5).default(1).describe('每种类型的数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ types, count_per_type, annotations, structured }) => {
      const ann = buildAnnotations(annotations);
      const content: any[] = [];

      for (const type of types) {
        for (let i = 0; i < count_per_type; i++) {
          switch (type) {
            case 'text':
              content.push({ type: 'text', text: randParagraph(3), ...(ann ? { annotations: ann } : {}) });
              break;
            case 'image': {
              const w = randInt(200, 600);
              const h = randInt(200, 400);
              const { data, mimeType } = await fetchBase64(`https://picsum.photos/${w}/${h}?random=${Date.now()}_${i}`);
              content.push({ type: 'image', data, mimeType, ...(ann ? { annotations: ann } : {}) });
              break;
            }
            case 'image_uri':
              content.push({
                type: 'image-uri', uri: `https://picsum.photos/${randInt(200, 600)}/${randInt(200, 400)}?random=${Date.now()}_${i}`,
                mimeType: 'image/jpeg', ...(ann ? { annotations: ann } : {}),
              });
              break;
            case 'audio': {
              const wav = generateWav(randInt(500, 2000), randInt(200, 800));
              content.push({ type: 'audio', data: wav.toString('base64'), mimeType: 'audio/wav', ...(ann ? { annotations: ann } : {}) });
              break;
            }
            case 'resource_link': {
              const file = randPick(['sample.ts', 'sample.txt', 'sample.png']);
              content.push({
                type: 'resource_link', uri: `file://${resolve(assetsDir, file)}`,
                name: file, mimeType: 'application/octet-stream', ...(ann ? { annotations: ann } : {}),
              });
              break;
            }
            case 'resource':
              content.push({
                type: 'resource',
                resource: { uri: `file://${resolve(assetsDir, 'sample.txt')}`, mimeType: 'text/plain', text: loadAssetText('sample.txt') },
                ...(ann ? { annotations: ann } : {}),
              });
              break;
          }
        }
      }

      const result: any = { content };
      if (structured) {
        result.structuredContent = { types, count_per_type, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
