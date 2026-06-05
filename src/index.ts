#!/usr/bin/env node
import { McpServer, StdioServerTransport } from '@byted/modelcontextprotocol-server';
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
