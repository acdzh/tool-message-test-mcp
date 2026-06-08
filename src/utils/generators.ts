import { randPick, randInt, randParagraph, randSentence } from './random.js';

/** 文本资源生成结果 */
export interface GeneratedTextContent {
  text: string;
  mime: string;
  ext: string;
}

/** 动态生成文本资源内容（TypeScript / 纯文本 / JSON / YAML） */
export function generateTextContent(): GeneratedTextContent {
  const generators = [
    () => {
      const code = `interface ${randPick(['User', 'Config', 'State', 'Event'])} {\n  id: string;\n  name: string;\n  value: ${randInt(1, 999)};\n  active: boolean;\n}\n\nexport function process(input: string): number {\n  const result = input.length * ${randInt(2, 10)};\n  console.log(\`Processing: \${result}\`);\n  return result;\n}\n`;
      return { text: code, mime: 'text/typescript', ext: 'ts' };
    },
    () => {
      const text = randParagraph(randInt(3, 10));
      return { text, mime: 'text/plain', ext: 'txt' };
    },
    () => {
      const obj = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: randPick(['event', 'message', 'notification', 'request']),
        values: Array.from({ length: randInt(3, 8) }, () => randInt(1, 1000)),
        message: randSentence(),
      };
      return { text: JSON.stringify(obj, null, 2), mime: 'application/json', ext: 'json' };
    },
    () => {
      const yaml = `name: ${randPick(['app', 'service', 'worker'])}-${crypto.randomUUID().slice(0, 8)}\nversion: ${randInt(1, 5)}.${randInt(0, 9)}.${randInt(0, 20)}\nport: ${randInt(3000, 9000)}\ndebug: ${randPick(['true', 'false'])}\nlogLevel: ${randPick(['info', 'warn', 'error', 'debug'])}\n`;
      return { text: yaml, mime: 'text/yaml', ext: 'yaml' };
    },
  ];
  return randPick(generators)();
}
