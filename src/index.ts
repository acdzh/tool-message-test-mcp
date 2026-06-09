#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerGenText } from './tools/gen_text.js';
import { registerGenImage } from './tools/gen_image.js';
import { registerGenImageUri } from './tools/gen_image_uri.js';
import { registerGenAudio } from './tools/gen_audio.js';
import { registerGenResourceLink } from './tools/gen_resource_link.js';
import { registerGenEmbeddedResource } from './tools/gen_embedded_resource.js';
import { registerGenMixed } from './tools/gen_mixed.js';
import { registerGenInvalid } from './tools/gen_invalid.js';

const server = new McpServer(
  { name: 'message-test-server', version: '2.0.0' },
  { capabilities: { tools: { listChanged: false } } }
);

// 绕过 Server 层对 tools/call 返回值的 CallToolResultSchema 校验
// 官方 SDK 的 ContentBlockSchema 不包含 image-uri 等扩展类型，会导致运行时校验失败
// 仅跳过输出校验，保留输入校验
const serverInstance = server.server as any;
const protocolProto = Object.getPrototypeOf(Object.getPrototypeOf(serverInstance));
const originalSetRequestHandler = serverInstance.setRequestHandler;
serverInstance.setRequestHandler = function (schema: any, handler: any) {
  const shape = schema?._zod?.def?.shape ?? schema?.shape;
  const methodSchema = shape?.method;
  const methodValue = methodSchema?._zod?.def?.value ?? methodSchema?._def?.value ?? methodSchema?.value;
  if (methodValue === 'tools/call') {
    // 对 tools/call 直接注册到 Protocol 层，跳过 Server 的输出校验包装
    return protocolProto.setRequestHandler.call(this, schema, handler);
  }
  // 其他方法保持原有逻辑
  return originalSetRequestHandler.call(this, schema, handler);
};

// 注册所有 tools
registerGenText(server);
registerGenImage(server);
registerGenImageUri(server);
registerGenAudio(server);
registerGenResourceLink(server);
registerGenEmbeddedResource(server);
registerGenMixed(server);
registerGenInvalid(server);

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
