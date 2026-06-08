import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { randSentence, randInt } from '../utils/index.js';

/** 生成一小段假 base64 数据用于测试 */
function fakeBase64(size: number = 64): string {
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) buf[i] = randInt(0, 255);
  return buf.toString('base64');
}

export function registerGenInvalid(server: McpServer) {
  server.registerTool(
    'gen_invalid',
    {
      title: 'Generate Invalid Response',
      description: '生成各种不符合规范的响应，用于测试客户端的健壮性',
      inputSchema: z.object({
        kind: z.enum([
          // 错误响应
          'is_error',
          'is_error_detailed',
          'is_error_wrong_type',
          // 抛出异常
          'throws',
          // 非法类型
          'unknown_type',
          'empty_type',
          'missing_type',
          'wrong_field_type',
          // 非法结构
          'empty_content',
          'null_content',
          'not_array',
          'no_content_field',
          'null_item',
          'returns_undefined',
          // 非法字段
          'image_no_data',
          'image_no_mime',
          'bad_base64',
          'audio_no_mime',
          'image_uri_no_uri',
          'resource_link_no_uri',
          'resource_no_resource',
          // 非法 annotations
          'annotations_wrong_type',
          'annotations_bad_priority',
          'annotations_bad_audience',
          'extra_fields',
          // 混合有效和无效
          'mixed_valid_invalid',
        ]).describe('异常类型'),
      }),
    },
    async ({ kind }) => {
      switch (kind) {
        // --- 错误响应 ---
        case 'is_error':
          return { content: [{ type: 'text' as const, text: `Error: ${randSentence()}` }], isError: true };
        case 'is_error_detailed':
          return {
            content: [
              { type: 'text' as const, text: 'Error: API rate limit exceeded.' },
              { type: 'text' as const, text: `Retry after: ${randInt(10, 120)} seconds.` },
              { type: 'text' as const, text: `Request ID: req-${crypto.randomUUID().slice(0, 8)}` },
            ],
            isError: true,
          };
        case 'is_error_wrong_type':
          return { content: [{ type: 'text', text: 'Error flag is wrong type.' }], isError: 'yes' } as any;

        // --- 抛出异常 ---
        case 'throws':
          throw new Error(`Unexpected server error: ${randSentence()}`);

        // --- 非法类型 ---
        case 'unknown_type':
          return { content: [{ type: 'video', data: 'some-data', mimeType: 'video/mp4' } as any] };
        case 'empty_type':
          return { content: [{ type: '', text: randSentence() } as any] };
        case 'missing_type':
          return { content: [{ text: randSentence() } as any] };
        case 'wrong_field_type':
          return { content: [{ type: 'text', text: randInt(1, 99999) } as any] };

        // --- 非法结构 ---
        case 'empty_content':
          return { content: [] };
        case 'null_content':
          return { content: null } as any;
        case 'not_array':
          return { content: { type: 'text', text: randSentence() } } as any;
        case 'no_content_field':
          return { result: randSentence() } as any;
        case 'null_item':
          return { content: [{ type: 'text' as const, text: 'Valid.' }, null, { type: 'text' as const, text: 'Also valid.' }] as any };
        case 'returns_undefined':
          return undefined as any;

        // --- 非法字段 ---
        case 'image_no_data':
          return { content: [{ type: 'image', mimeType: 'image/png' } as any] };
        case 'image_no_mime':
          return { content: [{ type: 'image', data: fakeBase64(128) } as any] };
        case 'bad_base64':
          return { content: [{ type: 'image' as const, data: '!!!not-valid-base64@@@###', mimeType: 'image/png' }] };
        case 'audio_no_mime':
          return { content: [{ type: 'audio', data: fakeBase64(256) } as any] };
        case 'image_uri_no_uri':
          return { content: [{ type: 'image-uri', mimeType: 'image/png' } as any] };
        case 'resource_link_no_uri':
          return { content: [{ type: 'resource_link', description: 'A link with no URI or name' } as any] };
        case 'resource_no_resource':
          return { content: [{ type: 'resource' } as any] };

        // --- 非法 annotations ---
        case 'annotations_wrong_type':
          return { content: [{ type: 'text', text: randSentence(), annotations: 'should-be-an-object' } as any] };
        case 'annotations_bad_priority':
          return { content: [{ type: 'text' as const, text: randSentence(), annotations: { audience: ['user'] as const, priority: 99.9 } }] };
        case 'annotations_bad_audience':
          return { content: [{ type: 'text', text: randSentence(), annotations: { audience: ['user', 'robot', 'admin'], priority: 0.5 } } as any] };
        case 'extra_fields':
          return { content: [{ type: 'text', text: randSentence(), unknownField1: 'value1', unknownField2: 42, nested: { deep: true } } as any] };

        // --- 混合有效和无效 ---
        case 'mixed_valid_invalid':
          return {
            content: [
              { type: 'text' as const, text: 'Valid text item.' },
              { type: 'unknown_type', data: 'mystery' } as any,
              { type: 'image' as const, data: '!!!not-base64', mimeType: 'image/png' },
              { type: 'text' as const, text: 'Another valid text.' },
              null as any,
              { type: 'resource_link' as const, uri: `generated://invalid/test_${crypto.randomUUID().slice(0, 8)}.txt`, name: 'test.txt' },
            ],
          };
      }
    }
  );
}
