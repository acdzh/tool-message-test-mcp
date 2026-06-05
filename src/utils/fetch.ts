/** 从 URL 获取并转为 base64 */
export async function fetchBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  const buf = await resp.arrayBuffer();
  return { data: Buffer.from(buf).toString('base64'), mimeType: contentType.split(';')[0]!.trim() };
}
