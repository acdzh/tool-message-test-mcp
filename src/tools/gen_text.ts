import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { annotationsSchema, structuredSchema } from '../schemas.js';
import { randInt, randPick, randSentence, randParagraph, buildAnnotations } from '../utils/index.js';

export function registerGenText(server: McpServer) {
  server.registerTool(
    'gen_text',
    {
      title: 'Generate Text',
      description: '动态生成随机文本内容',
      inputSchema: z.object({
        format: z.enum(['plain', 'markdown', 'code', 'json']).default('plain').describe('文本格式'),
        length: z.number().min(1).max(100000).default(200).describe('大致字符长度'),
        count: z.number().min(1).max(100).default(1).describe('返回的 content item 数量'),
        annotations: annotationsSchema,
        structured: structuredSchema,
      }),
    },
    async ({ format, length, count, annotations, structured }) => {
      const generateText = (targetLen: number): string => {
        switch (format) {
          case 'plain': {
            let text = '';
            while (text.length < targetLen) text += randParagraph() + '\n\n';
            return text.slice(0, targetLen);
          }
          case 'markdown': {
            const sections = ['# ' + randSentence(), '', '## Overview', '', randParagraph(3), '',
              '- ' + randSentence(), '- ' + randSentence(), '- ' + randSentence(), '',
              '## Details', '', randParagraph(4), '',
              '```typescript', `const value = ${randInt(1, 1000)};`, 'console.log(value);', '```', '',
              '> ' + randSentence(), '', '| Column A | Column B |', '|----------|----------|',
              `| ${randInt(1, 99)} | ${randSentence().slice(0, 20)} |`,
              `| ${randInt(1, 99)} | ${randSentence().slice(0, 20)} |`];
            let text = sections.join('\n');
            while (text.length < targetLen) text += '\n\n' + randParagraph();
            return text.slice(0, targetLen);
          }
          case 'code': {
            const langs = ['typescript', 'python', 'go', 'rust'];
            const lang = randPick(langs);
            const snippets: Record<string, () => string> = {
              typescript: () => `interface ${randPick(['User', 'Config', 'State', 'Event'])} {\n  id: string;\n  name: string;\n  value: ${randInt(1, 999)};\n  active: boolean;\n}\n\nfunction process(input: string): number {\n  const result = input.length * ${randInt(2, 10)};\n  console.log(\`Processing: \${result}\`);\n  return result;\n}`,
              python: () => `class ${randPick(['DataProcessor', 'EventHandler', 'ConfigManager', 'StateManager'])}:\n    def __init__(self, value: int = ${randInt(1, 100)}):\n        self.value = value\n        self._cache: dict = {}\n\n    def process(self, data: list) -> dict:\n        result = {k: v * self.value for k, v in enumerate(data)}\n        return result`,
              go: () => `package main\n\nimport "fmt"\n\ntype ${randPick(['Server', 'Client', 'Handler', 'Worker'])} struct {\n\tID   int\n\tName string\n}\n\nfunc (s *Server) Run() error {\n\tfmt.Printf("Running %s (id=%d)\\n", s.Name, s.ID)\n\treturn nil\n}`,
              rust: () => `use std::collections::HashMap;\n\nstruct ${randPick(['Cache', 'Registry', 'Pool', 'Queue'])}<T> {\n    data: HashMap<String, T>,\n    capacity: usize,\n}\n\nimpl<T> Cache<T> {\n    fn new(cap: usize) -> Self {\n        Self { data: HashMap::new(), capacity: cap }\n    }\n}`,
            };
            let text = snippets[lang]!();
            while (text.length < targetLen) text += '\n\n' + snippets[lang]!();
            return text.slice(0, targetLen);
          }
          case 'json': {
            const obj: Record<string, any> = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              type: randPick(['event', 'message', 'notification', 'request']),
              payload: {
                values: Array.from({ length: randInt(3, 8) }, () => randInt(1, 1000)),
                message: randSentence(),
                metadata: { version: `${randInt(1, 5)}.${randInt(0, 9)}.${randInt(0, 20)}`, source: randPick(['api', 'webhook', 'cron', 'manual']) },
              },
            };
            let text = JSON.stringify(obj, null, 2);
            while (text.length < targetLen) {
              obj.payload.values.push(randInt(1, 9999));
              obj.payload.extra = randParagraph(2);
              text = JSON.stringify(obj, null, 2);
            }
            return text.slice(0, targetLen);
          }
        }
      };

      const ann = buildAnnotations(annotations);
      const content = Array.from({ length: count }, () => ({
        type: 'text' as const,
        text: generateText(length),
        ...(ann ? { annotations: ann } : {}),
      }));

      const result: any = { content };
      if (structured) {
        result.structuredContent = { format, length, count, generatedAt: new Date().toISOString() };
      }
      return result;
    }
  );
}
