'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SocketEvent } from '@taxi/shared';
import { roleLabel } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import type { ChatContact, ChatMessageDTO } from '@/lib/types';
import { ChatComposer } from './ChatComposer';
import { ChatMedia } from './ChatMedia';
import { Icon } from '@/components/ui/Icon';

/** Chat 1-a-1 con historial y mensajes en tiempo real. Reutilizable por todos los roles. */
export function ChatPanel() {
  useSocketConnection();
  const authFetch = useAuth((s) => s.authFetch);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selected, setSelected] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const selectedRef = useRef<ChatContact | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(() => {
    authFetch<{ contacts: ChatContact[] }>('/api/chat/contacts')
      .then((r) => setContacts(r.contacts))
      .catch(() => {});
  }, [authFetch]);

  useEffect(() => loadContacts(), [loadContacts]);

  function openConversation(c: ChatContact) {
    setSelected(c);
    selectedRef.current = c;
    setMessages([]);
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
    authFetch<{ messages: ChatMessageDTO[] }>(`/api/chat/messages?withUserId=${c.id}`)
      .then((r) => { if (selectedRef.current?.id === c.id) setMessages(r.messages); })
      .catch(() => { if (selectedRef.current?.id === c.id) setMessages([]); });
  }

  useEffect(() => {
    const container = endRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // Mensajes entrantes/salientes en tiempo real.
  useSocketEvent<ChatMessageDTO>(
    SocketEvent.CHAT_MESSAGE,
    (m) => {
      const sel = selectedRef.current;
      const counterpart = m.mine ? m.recipientId : m.senderId;
      if (sel && counterpart === sel.id) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      } else if (!m.mine) {
        setContacts((prev) =>
          prev.map((x) => (x.id === m.senderId ? { ...x, unread: x.unread + 1 } : x)),
        );
      }
    },
    [],
  );

  async function send(body: string, file?: File) {
    if (!selected) return;
    const recipientId = selected.id;
    const result = await authFetch<{ message: ChatMessageDTO }>(file ? '/api/chat/media' : '/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(file
        ? { recipientId, body, name: file.name, type: file.type, data: await fileToBase64(file) }
        : { recipientId, body }),
    });
    if (selectedRef.current?.id === recipientId) setMessages((prev) => prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]);
  }

  return (
    <div className="chat-layout grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={`card min-h-0 flex-col overflow-hidden p-3 ${selected ? 'hidden md:flex' : 'flex'}`}>
        <h1 className="px-2 py-3 text-2xl font-bold">Conversaciones</h1>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                selected?.id === c.id
                  ? 'bg-surface-overlay text-ink'
                  : 'text-body hover:bg-surface-overlay'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.fullName}</span>
                <span className="block text-xs text-muted">{roleLabel[c.role]}</span>
              </span>
              {c.unread > 0 && (
                <span className="ml-2 rounded-full bg-brand px-1.5 text-xs font-bold text-surface">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
          {contacts.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">Sin contactos disponibles.</p>
          )}
        </div>
      </aside>

      <section aria-label="Conversación" className={`card min-h-0 min-w-0 flex-col overflow-hidden ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b border-surface-border px-3 py-2">
              <button type="button" className="button-secondary !px-3 md:hidden" aria-label="Volver a contactos" onClick={() => { setSelected(null); selectedRef.current = null; }}><Icon name="back" /></button>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{selected.fullName}</p>
              <p className="text-xs text-muted">{roleLabel[selected.role]}</p></div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" role="log" aria-label="Mensajes">
              {messages.length === 0 && <p className="py-5 text-center text-sm text-muted">Escribe un mensaje o envía un audio para comenzar.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`chat-message flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      m.mine
                        ? 'bg-brand text-surface'
                        : 'bg-surface-overlay text-body'
                    }`}
                  >
                    {m.attachmentName && <ChatMedia message={m} />}
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                    <span className={`mt-0.5 block text-xs ${m.mine ? 'text-surface/70' : 'text-muted'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <ChatComposer key={selected.id} onSend={send} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            Selecciona un contacto para chatear.
          </div>
        )}
      </section>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
