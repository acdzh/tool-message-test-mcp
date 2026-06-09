import { z } from 'zod/v4';
import { readdirSync } from 'fs';
import sharp from 'sharp';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { buildAnnotations, fetchPicsumBuffer, assetsDir, loadAssetBase64, randInt, randPick } from '../utils/index.js';

/** 获取 assets 目录下所有图片文件名 */
const assetImages = readdirSync(assetsDir).filter(f => /\.(png|jpg|jpeg|gif|webp|avif)$/i.test(f));

/** 用多张图拼成动态 GIF */
async function generateAnimatedGif(width: number, height: number, frameCount: number = 4): Promise<Buffer> {
  // 获取多张不同的真实照片作为帧
  const frames = await Promise.all(
    Array.from({ length: frameCount }, (_, i) =>
      fetchPicsumBuffer(width, height, Date.now() + i * 1000 + Math.random() * 9999)
    )
  );

  // 将每帧转为统一尺寸的 raw RGBA 数据
  const rawFrames: Buffer[] = [];
  for (const frame of frames) {
    const raw = await sharp(frame).resize(width, height).ensureAlpha().raw().toBuffer();
    rawFrames.push(raw);
  }

  // 将所有帧垂直拼接成一个 tall image (width x height*frameCount)
  const combined = Buffer.concat(rawFrames);

  // sharp 通过 raw input + pages 参数识别为多帧动图
  return sharp(combined, {
    raw: {
      width,
      height: height * frameCount,
      channels: 4,
    },
  })
    .gif({
      delay: Array(frameCount).fill(500),
      loop: 0,
    })
    .toBuffer();
}

export function registerGenImage(server: McpServer) {
  server.registerTool(
    'gen_image',
    {
      title: 'Generate Image',
      description: '获取随机真实图片，返回 base64 编码。gif 为多帧动图。有 40% 概率返回本地 assets 图片',
      inputSchema: z.object({
        width: z.number().min(1).max(4096).default(400).describe('图片宽度'),
        height: z.number().min(1).max(4096).default(300).describe('图片高度'),
        format: z.enum(['jpg', 'png', 'webp', 'gif', 'avif']).default('jpg').describe('图片格式'),
        count: z.number().min(1).max(20).default(1).describe('图片数量'),
        gif_frames: z.number().min(2).max(10).default(4).describe('GIF 动图帧数（仅 gif 格式有效）'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ width, height, format, count, gif_frames, annotations, structured }) => {
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        avif: 'image/avif',
      };

      const ann = buildAnnotations(annotations);
      const content = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          // 40% 概率返回本地 assets 图片
          if (assetImages.length > 0 && Math.random() < 0.4) {
            const filename = randPick(assetImages);
            const ext = filename.split('.').pop()!.toLowerCase();
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
            return {
              type: 'image' as const,
              data: loadAssetBase64(filename),
              mimeType: mime,
              ...(ann ? { annotations: ann } : {}),
            };
          }

          let outputBuffer: Buffer;

          if (format === 'gif') {
            // GIF: 获取多张照片拼成动图
            outputBuffer = await generateAnimatedGif(width, height, gif_frames);
          } else {
            // 其他格式: 获取单张照片，按需转换
            const srcBuffer = await fetchPicsumBuffer(width, height, Date.now() + i);
            if (format === 'jpg') {
              outputBuffer = srcBuffer;
            } else {
              outputBuffer = await sharp(srcBuffer).toFormat(format as any).toBuffer();
            }
          }

          return {
            type: 'image' as const,
            data: outputBuffer.toString('base64'),
            mimeType: mimeMap[format],
            ...(ann ? { annotations: ann } : {}),
          };
        })
      );

      const result: any = { content };
      if (structured) {
        result.structuredContent = { width, height, format, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
