/** 随机整数 [min, max] */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 随机选择数组中的一个元素 */
export function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 生成随机英文句子 */
export function randSentence(): string {
  const subjects = ['The cat', 'A developer', 'The system', 'An algorithm', 'The server', 'A user', 'The database', 'A function'];
  const verbs = ['processes', 'handles', 'generates', 'transforms', 'validates', 'returns', 'analyzes', 'computes'];
  const objects = ['the request', 'all data points', 'incoming messages', 'binary streams', 'user inputs', 'cached results', 'the configuration', 'error states'];
  const adverbs = ['quickly', 'efficiently', 'randomly', 'recursively', 'asynchronously', 'gracefully', 'silently', 'dynamically'];
  return `${randPick(subjects)} ${randPick(adverbs)} ${randPick(verbs)} ${randPick(objects)}.`;
}

/** 生成随机段落 */
export function randParagraph(sentenceCount: number = 5): string {
  return Array.from({ length: sentenceCount }, () => randSentence()).join(' ');
}
