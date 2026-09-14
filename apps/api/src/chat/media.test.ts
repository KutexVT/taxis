// Run: npx tsx apps/api/src/chat/media.test.ts (uses an in-memory database stub)
import assert from 'node:assert/strict';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:1/test';
process.env.JWT_ACCESS_SECRET = 'media-test-access';
process.env.JWT_REFRESH_SECRET = 'media-test-refresh';
const { createApp } = await import('../http/app.js');
const { createIo } = await import('../realtime/io.js');
const { prisma } = await import('../prisma.js');
const { signAccessToken } = await import('../auth/tokens.js');
const sender = '11111111-1111-4111-8111-111111111111';
const recipient = '22222222-2222-4222-8222-222222222222';
let saved: any;
let sameCentral = true;
prisma.user.findUnique = (async () => ({ role: 'DRIVER', centralId: sameCentral ? 'central' : 'other' })) as any;
prisma.chatMessage.create = (async ({ data }: any) => {
  saved = { ...data, id: 'message', createdAt: new Date() };
  const { attachmentData, ...dto } = saved;
  return dto;
}) as any;
prisma.chatMessage.findFirst = (async ({ where }: any) => where.OR.some((entry: any) => entry.senderId === saved?.senderId || entry.recipientId === saved?.recipientId) ? saved : null) as any;
const server = createApp().listen(0, '127.0.0.1');
const io = createIo(server);
await new Promise<void>((resolve) => server.on('listening', resolve));
const address = server.address() as { port: number };
const url = `http://127.0.0.1:${address.port}/api/chat`;
const headers = (sub = sender) => ({ Authorization: `Bearer ${signAccessToken({ sub, role: 'DRIVER', centralId: 'central' })}`, 'Content-Type': 'application/json' });
try {
  assert.equal((await fetch(`${url}/media/message`)).status, 401);
  const media = (data: Buffer, type = 'audio/webm') => JSON.stringify({ recipientId: recipient, type, name: 'voz.webm', data: data.toString('base64') });
  const response = await fetch(`${url}/media`, { method: 'POST', headers: headers(), body: media(Buffer.from('audio-fixture')) });
  assert.equal(response.status, 201);
  const sent = await response.json() as { message: { attachmentData?: unknown } };
  assert.equal(sent.message.attachmentData, undefined);
  const download = await fetch(`${url}/media/message`, { headers: headers(recipient) });
  assert.equal(download.status, 200);
  const received = await download.json() as { data: string };
  assert.equal(Buffer.from(received.data, 'base64').toString(), 'audio-fixture');
  assert.equal((await fetch(`${url}/media/message`, { headers: headers('outsider') })).status, 404);
  sameCentral = false;
  assert.equal((await fetch(`${url}/media`, { method: 'POST', headers: headers(), body: media(Buffer.from('x')) })).status, 403);
  assert.equal((await fetch(`${url}/media`, { method: 'POST', headers: headers(), body: media(Buffer.from('<script>'), 'text/html') })).status, 400);
  assert.equal((await fetch(`${url}/media`, { method: 'POST', headers: headers(), body: media(Buffer.alloc(10 * 1024 * 1024 + 1)) })).status, 413);
  console.log('Media: upload, private download, permissions, type and size limits OK');
} finally { io.close(); server.close(); await prisma.$disconnect(); }
