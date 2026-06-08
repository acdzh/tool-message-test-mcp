import { z } from 'zod/v4';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, generateTextContent, generateWav, randInt, randPick } from '../utils/index.js';

/** 在临时目录下生成随机文件，返回文件路径和元信息 */
function generateTempFile(): { path: string; name: string; mime: string; desc: string } {
  const tempBase = resolve(tmpdir(), 'mcp-message-test');
  mkdirSync(tempBase, { recursive: true });

  const id = crypto.randomUUID().slice(0, 8);

  // 大部分情况使用通用文本生成器
  if (randInt(1, 5) <= 4) {
    const res = generateTextContent();
    const name = `${res.ext}_${id}.${res.ext}`;
    const filePath = resolve(tempBase, name);
    writeFileSync(filePath, res.text, 'utf-8');
    return { path: filePath, name, mime: res.mime, desc: `Generated ${res.ext} file` };
  }

  // 偶尔生成 WAV 音频
  const name = `audio_${id}.wav`;
  const wav = generateWav(randInt(500, 2000), randInt(200, 800));
  const filePath = resolve(tempBase, name);
  writeFileSync(filePath, wav);
  return { path: filePath, name, mime: 'audio/wav', desc: 'Generated WAV audio file' };
}

export function registerGenResourceLink(server: McpServer) {
  server.registerTool(
    'gen_resource_link',
    {
      title: 'Generate Resource Link',
      description: '动态生成文件到临时目录，返回 resource_link',
      inputSchema: z.object({
        count: z.number().min(1).max(20).default(1).describe('数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ count, annotations, structured }) => {
      const ann = buildAnnotations(annotations);

      const content = Array.from({ length: count }, () => {
        const file = generateTempFile();
        return {
          type: 'resource_link' as const,
          uri: `file://${file.path}`,
          name: file.name,
          description: file.desc,
          mimeType: file.mime,
          ...(ann ? { annotations: ann } : {}),
        };
      });

      const result: any = { content };
      if (structured) {
        result.structuredContent = { count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
