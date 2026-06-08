/** 从 URL 获取并转为 base64 */
export async function fetchBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  const buf = await resp.arrayBuffer();
  return { data: Buffer.from(buf).toString('base64'), mimeType: contentType.split(';')[0]!.trim() };
}

/** 从 picsum 获取一张真实照片 buffer */
export async function fetchPicsumBuffer(width: number, height: number, seed?: number): Promise<Buffer> {
  const s = seed ?? Date.now() + Math.random() * 9999;
  const url = `https://picsum.photos/${width}/${height}.jpg?random=${s}`;
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
  return Buffer.from(await resp.arrayBuffer());
}
