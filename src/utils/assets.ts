import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const assetsDir = resolve(__dirname, '..', '..', 'assets');

/** 读取 asset 文件并返回 base64 */
export function loadAssetBase64(filename: string): string {
  return readFileSync(resolve(assetsDir, filename)).toString('base64');
}

/** 读取 asset 文件并返回 utf-8 文本 */
export function loadAssetText(filename: string): string {
  return readFileSync(resolve(assetsDir, filename), 'utf-8');
}
