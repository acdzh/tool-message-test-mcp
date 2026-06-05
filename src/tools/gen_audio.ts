import { z } from 'zod/v4';
import type { McpServer } from '@byted/modelcontextprotocol-server';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, generateWav, generateMelodyWav } from '../utils/index.js';

export function registerGenAudio(server: McpServer) {
  server.registerTool(
    'gen_audio',
    {
      title: 'Generate Audio',
      description: '本地生成音频，返回 base64 编码。支持单音正弦波或随机旋律',
      inputSchema: z.object({
        duration_ms: z.number().min(100).max(30000).default(2000).describe('音频时长（毫秒）'),
        mode: z.enum(['tone', 'melody']).default('melody').describe('tone: 单一频率正弦波; melody: 随机旋律'),
        frequency: z.number().min(20).max(20000).default(440).describe('频率 Hz（仅 tone 模式有效）'),
        count: z.number().min(1).max(10).default(1).describe('音频数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ duration_ms, mode, frequency, count, annotations, structured }) => {
      const ann = buildAnnotations(annotations);

      const content = Array.from({ length: count }, (_, i) => {
        let wav: Buffer;
        if (mode === 'melody') {
          wav = generateMelodyWav(duration_ms);
        } else {
          // 每个用不同频率增加变化
          const freq = frequency + i * 50;
          wav = generateWav(duration_ms, freq);
        }
        return {
          type: 'audio' as const,
          data: wav.toString('base64'),
          mimeType: 'audio/wav',
          ...(ann ? { annotations: ann } : {}),
        };
      });

      const result: any = { content };
      if (structured) {
        result.structuredContent = { duration_ms, mode, frequency, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
