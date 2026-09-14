'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import type { ChatMessageDTO } from '@/lib/types';

export function ChatMedia({ message }: { message: ChatMessageDTO }) {
  const authFetch = useAuth((s) => s.authFetch);
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    authFetch<{ data: string; type: string }>(`/api/chat/media/${message.id}`).then((r) => {
      if (!active) return;
      const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: r.type }));
      setUrl(objectUrl);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [authFetch, message.id]);
  if (!url) return <p className="text-xs">{error ? 'No se pudo cargar el archivo' : 'Cargando archivo…'}</p>;
  return <div className="mb-2 space-y-2">
    {message.attachmentType?.startsWith('image/') && <img src={url} alt={message.attachmentName ?? 'Imagen'} className="max-h-72 rounded-xl object-contain" />}
    {message.attachmentType?.startsWith('video/') && <video src={url} controls preload="metadata" className="max-h-72 max-w-full rounded-xl" />}
    {message.attachmentType?.startsWith('audio/') && <audio src={url} controls preload="metadata" className="max-w-full" />}
    <a href={url} download={message.attachmentName ?? 'archivo'} className="block break-all text-xs underline">{message.attachmentName} · Descargar</a>
  </div>;
}
