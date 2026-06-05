#!/usr/bin/env bun
import { McpServer, StdioServerTransport } from '@byted/modelcontextprotocol-server';
import { z } from 'zod/v4';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, 'assets');

/** 读取 asset 文件并返回 base64 */
function loadAssetBase64(filename: string): string {
  return readFileSync(resolve(assetsDir, filename)).toString('base64');
}

/** 读取 asset 文件并返回 utf-8 文本 */
function loadAssetText(filename: string): string {
  return readFileSync(resolve(assetsDir, filename), 'utf-8');
}

const server = new McpServer(
  { name: 'message-test-server', version: '1.0.0' },
  {
    capabilities: {
      tools: { listChanged: false },
    },
  }
);

// ============================================================
// 1. 文本内容（合并纯文本、多段、Markdown、Unicode、特殊字符）
// ============================================================
server.registerTool(
  'test_text',
  {
    title: 'Text Content',
    description: '返回各种文本内容。通过 variant 参数选择：plain/multi/markdown/unicode/long/empty',
    inputSchema: z.object({
      variant: z.enum(['plain', 'multi', 'markdown', 'unicode', 'long', 'empty']).default('plain'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'plain':
        return { content: [{ type: 'text' as const, text: 'Hello, this is a plain text response.\nLine 2 with special chars: <>&"\'\t\\' }] };
      case 'multi':
        return {
          content: [
            { type: 'text' as const, text: 'First paragraph of text.' },
            { type: 'text' as const, text: 'Second paragraph with JSON special chars: {"key": "value\\n"}' },
            { type: 'text' as const, text: 'Third paragraph: Line1\nLine2\tTabbed\r\nWindows newline' },
          ],
        };
      case 'markdown':
        return {
          content: [{
            type: 'text' as const,
            text: `# Heading 1\n\n## Heading 2\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2\n  - Nested item\n\n\`\`\`typescript\nconst x: number = 42;\nconsole.log(x);\n\`\`\`\n\n| Column A | Column B |\n|----------|----------|\n| Cell 1   | Cell 2   |\n\n> Blockquote text\n\n[Link](https://example.com)`,
          }],
        };
      case 'unicode':
        return { content: [{ type: 'text' as const, text: '中文测试 🎉 Ñoño café résumé 𝕳𝖊𝖑𝖑𝖔 ☺️ ← → ↑ ↓ ∞ ≠ ≈ \u0000 \uFFFF' }] };
      case 'long':
        return { content: [{ type: 'text' as const, text: 'A'.repeat(10000) }] };
      case 'empty':
        return { content: [{ type: 'text' as const, text: '' }] };
    }
  }
);

// ============================================================
// 2. 图片内容（base64，使用真实图片）
// ============================================================
server.registerTool(
  'test_image',
  {
    title: 'Image Content (Base64)',
    description: '返回真实图片的 base64 编码。通过 format 选择：png/jpg/gif/webp/svg/multi',
    inputSchema: z.object({
      format: z.enum(['png', 'jpg', 'gif', 'webp', 'svg', 'multi']).default('png'),
    }),
  },
  async ({ format }) => {
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    if (format === 'multi') {
      return {
        content: (['png', 'jpg', 'gif', 'webp'] as const).map((f) => ({
          type: 'image' as const,
          data: loadAssetBase64(`sample.${f}`),
          mimeType: mimeMap[f],
        })),
      };
    }
    return {
      content: [{
        type: 'image' as const,
        data: loadAssetBase64(`sample.${format}`),
        mimeType: mimeMap[format],
      }],
    };
  }
);

// ============================================================
// 3. image-uri 内容
// ============================================================
server.registerTool(
  'test_image_uri',
  {
    title: 'Image URI Content',
    description: '返回 image-uri 类型。通过 variant 选择：basic/full/multi_scheme',
    inputSchema: z.object({
      variant: z.enum(['basic', 'full', 'multi_scheme']).default('basic'),
    }),
  },
  async ({ variant }) => {
    const pngPath = resolve(assetsDir, 'sample.png');
    switch (variant) {
      case 'basic':
        return {
          content: [{
            type: 'image-uri',
            uri: `file://${pngPath}`,
            mimeType: 'image/png',
          } as any],
        };
      case 'full':
        return {
          content: [{
            type: 'image-uri',
            uri: `file://${pngPath}`,
            mimeType: 'image/png',
            annotations: {
              audience: ['user', 'assistant'],
              priority: 0.8,
              lastModified: '2025-01-01T00:00:00Z',
            },
            _meta: { source: 'local-file-system', width: 800, height: 600 },
          } as any],
        };
      case 'multi_scheme':
        return {
          content: [
            { type: 'image-uri', uri: `file://${pngPath}`, mimeType: 'image/png' } as any,
            { type: 'image-uri', uri: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png', mimeType: 'image/png' } as any,
            { type: 'image-uri', uri: 'https://httpbin.org/image/jpeg', mimeType: 'image/jpeg' } as any,
            { type: 'image-uri', uri: 'smb://fileserver/shared/banner.png', mimeType: 'image/png' } as any,
          ],
        };
    }
  }
);

// ============================================================
// 4. 音频内容（使用真实音频文件）
// ============================================================
server.registerTool(
  'test_audio',
  {
    title: 'Audio Content',
    description: '返回真实音频的 base64 编码。通过 format 选择：wav/mp3',
    inputSchema: z.object({
      format: z.enum(['wav', 'mp3']).default('mp3'),
    }),
  },
  async ({ format }) => {
    const fileMap: Record<string, { file: string; mime: string }> = {
      wav: { file: 'sample.wav', mime: 'audio/wav' },
      mp3: { file: 'sample_3s.mp3', mime: 'audio/mpeg' },
    };
    const { file, mime } = fileMap[format];
    return {
      content: [{
        type: 'audio' as const,
        data: loadAssetBase64(file),
        mimeType: mime,
      }],
    };
  }
);

// ============================================================
// 5. 资源链接 (resource_link)
// ============================================================
server.registerTool(
  'test_resource_link',
  {
    title: 'Resource Link',
    description: '返回资源链接内容。variant: basic/full',
    inputSchema: z.object({
      variant: z.enum(['basic', 'full']).default('basic'),
    }),
  },
  async ({ variant }) => {
    if (variant === 'basic') {
      return {
        content: [{
          type: 'resource_link' as const,
          uri: `file://${resolve(assetsDir, 'sample.ts')}`,
          name: 'sample.ts',
          description: 'A TypeScript sample file',
          mimeType: 'text/typescript',
        },{
          type: 'resource_link' as const,
          uri: `file://${resolve(assetsDir, 'sample.ts')}`,
          name: 'sample.ts',
          description: 'A TypeScript sample file',
          mimeType: 'text/typescript',
        }],
      };
    }
    return {
      content: [{
        type: 'resource_link' as const,
        uri: `file://${resolve(assetsDir, 'sample.txt')}`,
        name: 'sample.txt',
        title: 'Sample Text File',
        description: 'A plain text sample file for testing',
        mimeType: 'text/plain',
        size: readFileSync(resolve(assetsDir, 'sample.txt')).length,
        annotations: {
          audience: ['user'] as const,
          priority: 0.7,
          lastModified: '2025-03-15T10:30:00Z',
        },
      },{
        type: 'resource_link' as const,
        uri: `file://${resolve(assetsDir, 'sample.txt')}`,
        name: 'sample.txt',
        title: 'Sample Text File',
        description: 'A plain text sample file for testing',
        mimeType: 'text/plain',
        size: readFileSync(resolve(assetsDir, 'sample.txt')).length,
        annotations: {
          audience: ['user'] as const,
          priority: 0.7,
          lastModified: '2025-03-15T10:30:00Z',
        },
      }],
    };
  }
);

// ============================================================
// 6. 嵌入式资源 (embedded resource)
// ============================================================
server.registerTool(
  'test_embedded_resource',
  {
    title: 'Embedded Resource',
    description: '返回嵌入式资源。variant: text/blob/with_annotations',
    inputSchema: z.object({
      variant: z.enum(['text', 'blob', 'with_annotations']).default('text'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'text':
        return {
          content: [{
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, 'sample.ts')}`,
              mimeType: 'text/typescript',
              text: loadAssetText('sample.ts'),
            },
          },{
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, 'sample.ts')}`,
              mimeType: 'text/typescript',
              text: loadAssetText('sample.ts'),
            },
          }],
        };
      case 'blob':
        return {
          content: [{
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, 'sample.png')}`,
              mimeType: 'image/png',
              blob: loadAssetBase64('sample.png'),
            },
          },{
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, 'sample.png')}`,
              mimeType: 'image/png',
              blob: loadAssetBase64('sample.png'),
            },
          }],
        };
      case 'with_annotations':
        return {
          content: [{
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, 'sample.txt')}`,
              mimeType: 'text/plain',
              text: loadAssetText('sample.txt'),
              annotations: {
                audience: ['user', 'assistant'] as const,
                priority: 0.7,
                lastModified: '2025-05-03T14:30:00Z',
              },
            },
          },{
            type: 'resource' as const,
            resource: {
              uri: `file://${resolve(assetsDir, 'sample.txt')}`,
              mimeType: 'text/plain',
              text: loadAssetText('sample.txt'),
              annotations: {
                audience: ['user', 'assistant'] as const,
                priority: 0.7,
                lastModified: '2025-05-03T14:30:00Z',
              },
            },
          }],
        };
    }
  }
);

// ============================================================
// 7. 混合内容（所有标准类型组合）
// ============================================================
server.registerTool(
  'test_mixed_content',
  {
    title: 'Mixed Content',
    description: '在一次响应中返回所有标准内容类型的混合',
    inputSchema: z.object({}),
  },
  async () => {
    const pngPath = resolve(assetsDir, 'sample.png');
    return {
      content: [
        { type: 'text' as const, text: 'Here is a summary with all content types mixed together.' },
        { type: 'image' as const, data: loadAssetBase64('sample.jpg'), mimeType: 'image/jpeg' },
        { type: 'audio' as const, data: loadAssetBase64('sample_3s.mp3'), mimeType: 'audio/mpeg' },
        { type: 'resource_link' as const, uri: `file://${resolve(assetsDir, 'sample.ts')}`, name: 'sample.ts', mimeType: 'text/typescript' },
        { type: 'resource' as const, resource: { uri: `file://${resolve(assetsDir, 'sample.txt')}`, mimeType: 'text/plain', text: loadAssetText('sample.txt') } },
        { type: 'image-uri', uri: `file://${pngPath}`, mimeType: 'image/png' } as any,
      ],
    };
  }
);

// ============================================================
// 8. Annotations 测试
// ============================================================
server.registerTool(
  'test_annotations',
  {
    title: 'Annotations',
    description: '测试不同的 annotations 设置。variant: user_only/assistant_only/both/mixed',
    inputSchema: z.object({
      variant: z.enum(['user_only', 'assistant_only', 'both', 'mixed']).default('mixed'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'user_only':
        return { content: [{ type: 'text' as const, text: 'This content is for user eyes only.', annotations: { audience: ['user'] as const, priority: 1.0 } }] };
      case 'assistant_only':
        return { content: [{ type: 'text' as const, text: 'This content is internal context for the assistant.', annotations: { audience: ['assistant'] as const, priority: 0.3 } }] };
      case 'both':
        return { content: [{ type: 'text' as const, text: 'Visible to both user and assistant.', annotations: { audience: ['user', 'assistant'] as const, priority: 0.5, lastModified: '2025-06-01T12:00:00Z' } }] };
      case 'mixed':
        return {
          content: [
            { type: 'text' as const, text: 'High priority user message.', annotations: { audience: ['user'] as const, priority: 1.0 } },
            { type: 'text' as const, text: 'Low priority assistant context.', annotations: { audience: ['assistant'] as const, priority: 0.1 } },
            { type: 'text' as const, text: 'Medium priority for everyone.', annotations: { audience: ['user', 'assistant'] as const, priority: 0.5 } },
            { type: 'text' as const, text: 'No annotations at all.' },
          ],
        };
    }
  }
);

// ============================================================
// 9. 结构化内容 (Structured Content)
// ============================================================
server.registerTool(
  'test_structured_content',
  {
    title: 'Structured Content',
    description: '返回结构化内容（structuredContent + outputSchema）。variant: simple/complex',
    inputSchema: z.object({
      variant: z.enum(['simple', 'complex']).default('simple'),
    }),
    outputSchema: z.object({
      temperature: z.number().optional(),
      conditions: z.string().optional(),
      humidity: z.number().optional(),
      user: z.object({ name: z.string(), age: z.number() }).optional(),
    }),
  },
  async ({ variant }) => {
    if (variant === 'simple') {
      const output = { temperature: 22.5, conditions: 'Partly cloudy', humidity: 65 };
      return { content: [{ type: 'text' as const, text: JSON.stringify(output) }], structuredContent: output };
    }
    const output = {
      user: { name: 'Alice', age: 30 },
      temperature: 18.0,
      conditions: 'Rainy',
      humidity: 85,
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }], structuredContent: output };
  }
);

// ============================================================
// 10. 错误响应
// ============================================================
server.registerTool(
  'test_error',
  {
    title: 'Error Result',
    description: '返回 isError: true 的错误结果。variant: simple/detailed',
    inputSchema: z.object({
      variant: z.enum(['simple', 'detailed']).default('simple'),
    }),
  },
  async ({ variant }) => {
    if (variant === 'simple') {
      return { content: [{ type: 'text' as const, text: 'Invalid departure date: must be in the future.' }], isError: true };
    }
    return {
      content: [
        { type: 'text' as const, text: 'Error: API rate limit exceeded.' },
        { type: 'text' as const, text: 'Retry after: 60 seconds.' },
        { type: 'text' as const, text: 'Request ID: req-abc-123' },
      ],
      isError: true,
    };
  }
);

// ============================================================
// 11. 大量 content items
// ============================================================
server.registerTool(
  'test_large_content',
  {
    title: 'Large Content Array',
    description: '返回包含大量 content items 的数组',
    inputSchema: z.object({
      count: z.number().default(50),
    }),
  },
  async ({ count }) => ({
    content: Array.from({ length: count }, (_, i) => ({
      type: 'text' as const,
      text: `Content item #${i + 1} of ${count}`,
    })),
  })
);

// ============================================================
// 11.5. 超长 message 生成
// ============================================================
server.registerTool(
  'test_long_message',
  {
    title: 'Long Message Generator',
    description: '生成超长 message。可指定 content children 数量和每个 text 的长度',
    inputSchema: z.object({
      children_count: z.number().describe('content 数组中的 children 数量'),
      text_length: z.number().describe('每个 content item 中 text 的字符长度'),
    }),
  },
  async ({ children_count, text_length }) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    const generateText = (index: number, length: number): string => {
      const prefix = `[Item ${index + 1}/${children_count}] `;
      const remaining = Math.max(0, length - prefix.length);
      let text = prefix;
      for (let i = 0; i < remaining; i++) {
        text += chars[i % chars.length];
      }
      return text;
    };
    return {
      content: Array.from({ length: children_count }, (_, i) => ({
        type: 'text' as const,
        text: generateText(i, text_length),
      })),
    };
  }
);

// ============================================================
// 11.6. 动态生成图像
// ============================================================

/** 解析 hex 颜色为 RGB 数组 */
function parseHexColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** 生成 PNG 文件的 Buffer */
function generatePng(width: number, height: number, pixels: Uint8Array): Buffer {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT chunk: raw image data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawData[rowOffset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      const dstIdx = rowOffset + 1 + x * 3;
      rawData[dstIdx] = pixels[srcIdx]!;
      rawData[dstIdx + 1] = pixels[srcIdx + 1]!;
      rawData[dstIdx + 2] = pixels[srcIdx + 2]!;
    }
  }
  const compressed = deflateSync(rawData);

  // 构建 chunks
  const chunks: Buffer[] = [signature];

  const writeChunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    chunks.push(len, typeB, data, crc);
  };

  writeChunk('IHDR', ihdr);
  writeChunk('IDAT', compressed);
  writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat(chunks);
}

/** CRC32 计算 (PNG 标准) */
function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** 生成像素数据 */
function generatePixels(width: number, height: number, pattern: string, color: string): Uint8Array {
  const [r, g, b] = parseHexColor(color);
  const pixels = new Uint8Array(width * height * 3);

  switch (pattern) {
    case 'solid':
      for (let i = 0; i < width * height; i++) {
        pixels[i * 3] = r;
        pixels[i * 3 + 1] = g;
        pixels[i * 3 + 2] = b;
      }
      break;
    case 'gradient':
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const t = x / (width - 1 || 1);
          const idx = (y * width + x) * 3;
          pixels[idx] = Math.round(r * (1 - t));
          pixels[idx + 1] = Math.round(g * (1 - t) + 255 * t);
          pixels[idx + 2] = Math.round(b * (1 - t));
        }
      }
      break;
    case 'checkerboard': {
      const cellSize = Math.max(1, Math.floor(Math.min(width, height) / 8));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const isWhite = ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2) === 0;
          const idx = (y * width + x) * 3;
          if (isWhite) {
            pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b;
          } else {
            pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255;
          }
        }
      }
      break;
    }
    case 'noise':
      for (let i = 0; i < width * height * 3; i++) {
        pixels[i] = Math.floor(Math.random() * 256);
      }
      break;
    default:
      for (let i = 0; i < width * height; i++) {
        pixels[i * 3] = r;
        pixels[i * 3 + 1] = g;
        pixels[i * 3 + 2] = b;
      }
  }
  return pixels;
}

server.registerTool(
  'test_generate_image',
  {
    title: 'Generate Image',
    description: '动态生成指定参数的图像。支持本地生成（pattern 模式）和从 API 获取真实图片（source 模式）',
    inputSchema: z.object({
      width: z.number().min(1).max(4096).default(200).describe('图像宽度（像素）'),
      height: z.number().min(1).max(4096).default(200).describe('图像高度（像素）'),
      source: z.enum(['local', 'picsum', 'placeholder']).default('local').describe(
        'local: 本地生成图案; picsum: 从 picsum.photos 获取随机真实照片; placeholder: 生成带文字的占位图'
      ),
      format: z.enum(['png', 'svg']).default('png').describe('图像格式（仅 local 模式有效）'),
      pattern: z.enum(['solid', 'gradient', 'checkerboard', 'noise']).default('solid').describe('图案模式（仅 local 模式有效）'),
      color: z.string().default('#FF6B6B').describe('主色调（hex 格式，仅 local/placeholder 模式有效）'),
      text: z.string().default('').describe('占位图上的文字（仅 placeholder 模式有效，为空则显示尺寸）'),
      count: z.number().min(1).max(20).default(1).describe('生成图像数量'),
    }),
  },
  async ({ width, height, source, format, pattern, color, text, count }) => {
    /** 从 URL 获取图片并转为 base64 */
    const fetchImageBase64 = async (url: string): Promise<{ data: string; mimeType: string }> => {
      const resp = await fetch(url, { redirect: 'follow' });
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status} ${resp.statusText}`);
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      const arrayBuf = await resp.arrayBuffer();
      return {
        data: Buffer.from(arrayBuf).toString('base64'),
        mimeType: contentType.split(';')[0]!.trim(),
      };
    };

    const generateOne = async (index: number) => {
      switch (source) {
        case 'picsum': {
          // picsum.photos 每次请求返回不同的随机真实照片
          const url = `https://picsum.photos/${width}/${height}?random=${Date.now()}_${index}`;
          const { data, mimeType } = await fetchImageBase64(url);
          return { type: 'image' as const, data, mimeType };
        }
        case 'placeholder': {
          // 生成带文字的 SVG 占位图
          const displayText = text || `${width}×${height}`;
          const bgColor = color.replace('#', '');
          // 计算对比色作为文字颜色
          const [r, g, b] = parseHexColor(color);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          const textColor = brightness > 128 ? '#000000' : '#FFFFFF';
          const fontSize = Math.max(12, Math.min(width, height) / 8);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#${bgColor}"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${textColor}">${displayText}</text>
</svg>`;
          return {
            type: 'image' as const,
            data: Buffer.from(svg).toString('base64'),
            mimeType: 'image/svg+xml',
          };
        }
        case 'local':
        default: {
          if (format === 'svg') {
            const [r, g, b] = parseHexColor(color);
            let svgContent = '';
            switch (pattern) {
              case 'solid':
                svgContent = `<rect width="${width}" height="${height}" fill="${color}"/>`;
                break;
              case 'gradient':
                svgContent = `<defs><linearGradient id="g"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="rgb(${255 - r},${255 - g},${255 - b})"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/>`;
                break;
              case 'checkerboard': {
                const cellSize = Math.max(1, Math.floor(Math.min(width, height) / 8));
                svgContent = `<defs><pattern id="c" width="${cellSize * 2}" height="${cellSize * 2}" patternUnits="userSpaceOnUse"><rect width="${cellSize}" height="${cellSize}" fill="${color}"/><rect x="${cellSize}" y="${cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/><rect x="${cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/><rect y="${cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#c)"/>`;
                break;
              }
              case 'noise':
                svgContent = `<rect width="${width}" height="${height}" fill="${color}"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14" fill="white">noise (PNG only)</text>`;
                break;
            }
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svgContent}</svg>`;
            return {
              type: 'image' as const,
              data: Buffer.from(svg).toString('base64'),
              mimeType: 'image/svg+xml',
            };
          }
          // PNG format
          const pixels = generatePixels(width, height, pattern, color);
          const png = generatePng(width, height, pixels);
          return {
            type: 'image' as const,
            data: png.toString('base64'),
            mimeType: 'image/png',
          };
        }
      }
    };

    const content = await Promise.all(
      Array.from({ length: count }, (_, i) => generateOne(i))
    );
    return { content };
  }
);

// ============================================================
// 不符合规范的 case（测试客户端健壮性）
// ============================================================

// ============================================================
// 12. 无效的 content type 和字段缺失
// ============================================================
server.registerTool(
  'test_invalid_types',
  {
    title: 'Invalid - Type Issues',
    description: '测试非法的内容类型。variant: unknown_type/empty_type/missing_type/wrong_field_type',
    inputSchema: z.object({
      variant: z.enum(['unknown_type', 'empty_type', 'missing_type', 'wrong_field_type']).default('unknown_type'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'unknown_type':
        return { content: [{ type: 'video', data: 'some-data', mimeType: 'video/mp4' } as any] };
      case 'empty_type':
        return { content: [{ type: '', text: 'My type is empty string.' } as any] };
      case 'missing_type':
        return { content: [{ text: 'I have no type field' } as any] };
      case 'wrong_field_type':
        return { content: [{ type: 'text', text: 12345 } as any] };
    }
  }
);

// ============================================================
// 13. 无效的 content 结构
// ============================================================
server.registerTool(
  'test_invalid_structure',
  {
    title: 'Invalid - Content Structure',
    description: '测试非法的 content 结构。variant: empty/null/not_array/no_content_field/null_item',
    inputSchema: z.object({
      variant: z.enum(['empty', 'null', 'not_array', 'no_content_field', 'null_item']).default('empty'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'empty':
        return { content: [] };
      case 'null':
        return { content: null } as any;
      case 'not_array':
        return { content: { type: 'text', text: 'I should be in an array' } } as any;
      case 'no_content_field':
        return { result: 'This has no content field at all' } as any;
      case 'null_item':
        return { content: [{ type: 'text' as const, text: 'Valid.' }, null, { type: 'text' as const, text: 'Also valid.' }] as any };
    }
  }
);

// ============================================================
// 14. 无效的字段内容
// ============================================================
server.registerTool(
  'test_invalid_fields',
  {
    title: 'Invalid - Field Issues',
    description: '测试字段缺失或错误。variant: image_no_data/image_no_mime/bad_base64/audio_no_mime/image_uri_no_uri/resource_link_no_uri/resource_no_resource',
    inputSchema: z.object({
      variant: z.enum(['image_no_data', 'image_no_mime', 'bad_base64', 'audio_no_mime', 'image_uri_no_uri', 'resource_link_no_uri', 'resource_no_resource']).default('image_no_data'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'image_no_data':
        return { content: [{ type: 'image', mimeType: 'image/png' } as any] };
      case 'image_no_mime':
        return { content: [{ type: 'image', data: loadAssetBase64('sample.png') } as any] };
      case 'bad_base64':
        return { content: [{ type: 'image' as const, data: '!!!not-valid-base64@@@###', mimeType: 'image/png' }] };
      case 'audio_no_mime':
        return { content: [{ type: 'audio', data: loadAssetBase64('sample_3s.mp3') } as any] };
      case 'image_uri_no_uri':
        return { content: [{ type: 'image-uri', mimeType: 'image/png' } as any] };
      case 'resource_link_no_uri':
        return { content: [{ type: 'resource_link', description: 'A link with no URI or name' } as any] };
      case 'resource_no_resource':
        return { content: [{ type: 'resource' } as any] };
    }
  }
);

// ============================================================
// 15. 无效的 annotations 和额外字段
// ============================================================
server.registerTool(
  'test_invalid_annotations',
  {
    title: 'Invalid - Annotations & Extras',
    description: '测试非法 annotations 和额外字段。variant: wrong_type/bad_priority/bad_audience/extra_fields',
    inputSchema: z.object({
      variant: z.enum(['wrong_type', 'bad_priority', 'bad_audience', 'extra_fields']).default('wrong_type'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'wrong_type':
        return { content: [{ type: 'text', text: 'Annotations is a string.', annotations: 'should-be-an-object' } as any] };
      case 'bad_priority':
        return { content: [{ type: 'text' as const, text: 'Priority is 99.9.', annotations: { audience: ['user'] as const, priority: 99.9 } }] };
      case 'bad_audience':
        return { content: [{ type: 'text', text: 'Audience has invalid values.', annotations: { audience: ['user', 'robot', 'admin'], priority: 0.5 } } as any] };
      case 'extra_fields':
        return { content: [{ type: 'text', text: 'I have extra fields.', unknownField1: 'value1', unknownField2: 42, nested: { deep: true } } as any] };
    }
  }
);

// ============================================================
// 16. 无效的 structuredContent 和 isError
// ============================================================
server.registerTool(
  'test_invalid_result_fields',
  {
    title: 'Invalid - Result Fields',
    description: '测试非法的结果字段。variant: schema_mismatch/is_error_wrong_type/returns_undefined',
    inputSchema: z.object({
      variant: z.enum(['schema_mismatch', 'is_error_wrong_type', 'returns_undefined']).default('schema_mismatch'),
    }),
  },
  async ({ variant }) => {
    switch (variant) {
      case 'schema_mismatch':
        return { content: [{ type: 'text' as const, text: '{"wrong": "schema"}' }], structuredContent: { wrong: 'schema', completely: 'different' } } as any;
      case 'is_error_wrong_type':
        return { content: [{ type: 'text', text: 'Error flag is wrong type.' }], isError: 'yes' } as any;
      case 'returns_undefined':
        return undefined as any;
    }
  }
);

// ============================================================
// 17. 工具抛出异常
// ============================================================
server.registerTool(
  'test_throws',
  {
    title: 'Throws Error',
    description: '工具执行时直接抛出异常',
    inputSchema: z.object({}),
  },
  async () => {
    throw new Error('Unexpected server error: something went wrong!');
  }
);

// ============================================================
// 18. 混合有效和无效 content items
// ============================================================
server.registerTool(
  'test_mixed_valid_invalid',
  {
    title: 'Mixed Valid and Invalid Items',
    description: '在同一个 content 数组中混合有效和无效的 items',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [
      { type: 'text' as const, text: 'Valid text item.' },
      { type: 'unknown_type', data: 'mystery' } as any,
      { type: 'image' as const, data: '!!!not-base64', mimeType: 'image/png' },
      { type: 'text' as const, text: 'Another valid text.' },
      null as any,
      { type: 'resource_link' as const, uri: `file://${resolve(assetsDir, 'sample.txt')}`, name: 'sample.txt' },
    ],
  })
);

// ============================================================
// 启动服务器
// ============================================================
const transport = new StdioServerTransport();
await server.connect(transport);
