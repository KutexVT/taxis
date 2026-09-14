import { Router, type Request } from 'express';
import { z } from 'zod';
import { SocketEvent, UserRole, chatMessageSchema, room } from '@taxi/shared';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseOrThrow } from '../lib/validate.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';
import { getIo } from '../realtime/io.js';
import { requireAuth } from '../auth/middleware.js';
import type { JwtPayload } from '../auth/tokens.js';

export const chatRouter = Router();
chatRouter.use(requireAuth);

const messageSelect = { id: true, senderId: true, recipientId: true, body: true, attachmentUrl: true, attachmentName: true, attachmentType: true, createdAt: true } as const;
const mediaSchema = z.object({
  recipientId: z.string().uuid(),
  name: z.string().min(1).max(180),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'application/pdf']),
  body: z.string().max(2000).default(''),
  data: z.string().min(1).max(14_000_000),
});

// Bounded private attachments live with the message so deployment restarts cannot lose them.
chatRouter.post('/media', asyncHandler(async (req, res) => {
  const data = parseOrThrow(mediaSchema, req.body);
  const attachmentData = Buffer.from(data.data, 'base64');
  if (!attachmentData.length) throw badRequest('Archivo vacío');
  if (attachmentData.length > 10 * 1024 * 1024) return res.status(413).json({ error: 'El archivo supera el límite permitido de 10 MB' });
  const recipient = await prisma.user.findUnique({ where: { id: data.recipientId }, select: { role: true, centralId: true } });
  if (!recipient || !canChat(req.auth!, recipient)) throw forbidden();
  const message = await prisma.chatMessage.create({ data: { senderId: req.auth!.sub, recipientId: data.recipientId, centralId: req.auth!.centralId, body: data.body ?? '', attachmentData, attachmentName: data.name, attachmentType: data.type }, select: messageSelect });
  const io = getIo();
  io.to(room.user(data.recipientId)).emit(SocketEvent.CHAT_MESSAGE, { ...message, mine: false });
  io.to(room.user(req.auth!.sub)).emit(SocketEvent.CHAT_MESSAGE, { ...message, mine: true });
  res.status(201).json({ message: { ...message, mine: true } });
}));

chatRouter.get('/media/:id', asyncHandler(async (req, res) => {
  const message = await prisma.chatMessage.findFirst({ where: { id: req.params.id, OR: [{ senderId: req.auth!.sub }, { recipientId: req.auth!.sub }] }, select: { attachmentData: true, attachmentType: true } });
  if (!message?.attachmentData) throw notFound('Archivo no encontrado');
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data: message.attachmentData.toString('base64'), type: message.attachmentType });
}));

/**
 * Reglas de comunicacion:
 * - DRIVER / CENTRAL_ADMIN: con DRIVER o CENTRAL_ADMIN de SU misma central.
 * - SUPER_ADMIN: con otros SUPER_ADMIN (admin <-> admin).
 */
function canChat(me: JwtPayload, other: { role: UserRole; centralId: string | null }): boolean {
  if (me.role === UserRole.SUPER_ADMIN) return other.role === UserRole.SUPER_ADMIN;
  const sameCentral = me.centralId != null && me.centralId === other.centralId;
  const chatRole = other.role === UserRole.DRIVER || other.role === UserRole.CENTRAL_ADMIN;
  return sameCentral && chatRole;
}

/** Lista de contactos con los que el usuario puede chatear (+ no leidos). */
chatRouter.get(
  '/contacts',
  asyncHandler(async (req, res) => {
    const me = req.auth!;
    const where =
      me.role === UserRole.SUPER_ADMIN
        ? { role: UserRole.SUPER_ADMIN, id: { not: me.sub } }
        : {
            centralId: me.centralId,
            id: { not: me.sub },
            role: { in: [UserRole.DRIVER, UserRole.CENTRAL_ADMIN] },
          };

    const [users, unread] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, fullName: true, role: true, centralId: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.chatMessage.groupBy({
        by: ['senderId'],
        where: { recipientId: me.sub, readAt: null },
        _count: { _all: true },
      }),
    ]);

    const unreadMap = new Map(unread.map((u) => [u.senderId, u._count._all]));
    res.json({
      contacts: users.map((u) => ({ ...u, unread: unreadMap.get(u.id) ?? 0 })),
    });
  }),
);

/** Historial con un usuario; marca como leidos los mensajes recibidos. */
chatRouter.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const me = req.auth!;
    const withUserId = String(req.query.withUserId ?? '');
    if (!withUserId) throw badRequest('Falta withUserId');

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: me.sub, recipientId: withUserId },
          { senderId: withUserId, recipientId: me.sub },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
      take: 200,
    });

    await prisma.chatMessage.updateMany({
      where: { senderId: withUserId, recipientId: me.sub, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentType: m.attachmentType,
        createdAt: m.createdAt.toISOString(),
        mine: m.senderId === me.sub,
      })),
    });
  }),
);

/** Envia un mensaje a un destinatario permitido. */
chatRouter.post(
  '/messages',
  asyncHandler(async (req, res) => {
    const me = req.auth!;
    const data = parseOrThrow(chatMessageSchema, req.body);

    const recipient = await prisma.user.findUnique({
      where: { id: data.recipientId },
      select: { id: true, role: true, centralId: true },
    });
    if (!recipient) throw notFound('Destinatario no encontrado');
    if (!canChat(me, recipient)) throw forbidden('No puedes escribir a este usuario');

    const message = await prisma.chatMessage.create({
      data: {
        senderId: me.sub,
        recipientId: recipient.id,
        centralId: me.centralId,
        body: data.body,
        attachmentUrl: data.attachmentUrl,
      },
    });

    const dto = {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      body: message.body,
      attachmentUrl: message.attachmentUrl,
      createdAt: message.createdAt.toISOString(),
    };
    const io = getIo();
    // Al destinatario (mine=false) y a las otras pestanas del emisor (mine=true).
    io.to(room.user(recipient.id)).emit(SocketEvent.CHAT_MESSAGE, { ...dto, mine: false });
    io.to(room.user(me.sub)).emit(SocketEvent.CHAT_MESSAGE, { ...dto, mine: true });

    res.status(201).json({ message: { ...dto, mine: true } });
  }),
);
