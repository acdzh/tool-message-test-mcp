import { z } from 'zod/v4';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import type { McpServer } from '@byted/modelcontextprotocol-server';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, randPick, randInt, randParagraph, randSentence, generateWav } from '../utils/index.js';

/** 在临时目录下生成随机文件，返回文件路径和元信息 */
function generateTempFile(): { path: string; name: string; mime: string; desc: string } {
  const tempBase = resolve(tmpdir(), 'mcp-message-test');
  mkdirSync(tempBase, { recursive: true });

  const id = crypto.randomUUID().slice(0, 8);
  const generators = [
    () => {
      const name = `text_${id}.txt`;
      const content = randParagraph(randInt(3, 10));
      const filePath = resolve(tempBase, name);
      writeFileSync(filePath, content, 'utf-8');
      return { path: filePath, name, mime: 'text/plain', desc: 'Generated plain text file' };
    },
    () => {
      const name = `code_${id}.ts`;
      const content = `interface ${randPick(['User', 'Config', 'State'])} {\n  id: string;\n  value: ${randInt(1, 999)};\n}\n\nexport function process(): void {\n  console.log("${randSentence()}");\n}\n`;
      const filePath = resolve(tempBase, name);
      writeFileSync(filePath, content, 'utf-8');
      return { path: filePath, name, mime: 'text/typescript', desc: 'Generated TypeScript file' };
    },
    () => {
      const name = `data_${id}.json`;
      const content = JSON.stringify({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        values: Array.from({ length: randInt(3, 8) }, () => randInt(1, 1000)),
        message: randSentence(),
      }, null, 2);
      const filePath = resolve(tempBase, name);
      writeFileSync(filePath, content, 'utf-8');
      return { path: filePath, name, mime: 'application/json', desc: 'Generated JSON data file' };
    },
    () => {
      const name = `audio_${id}.wav`;
      const wav = generateWav(randInt(500, 2000), randInt(200, 800));
      const filePath = resolve(tempBase, name);
      writeFileSync(filePath, wav);
      return { path: filePath, name, mime: 'audio/wav', desc: 'Generated WAV audio file' };
    },
    () => {
      const name = `config_${id}.yaml`;
      const content = `name: ${randPick(['app', 'service', 'worker'])}-${id}\nversion: ${randInt(1, 5)}.${randInt(0, 9)}.${randInt(0, 20)}\nport: ${randInt(3000, 9000)}\ndebug: ${randPick(['true', 'false'])}\nlogLevel: ${randPick(['info', 'warn', 'error', 'debug'])}\n`;
      const filePath = resolve(tempBase, name);
      writeFileSync(filePath, content, 'utf-8');
      return { path: filePath, name, mime: 'text/yaml', desc: 'Generated YAML config file' };
    },
  ];

  return randPick(generators)();
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
