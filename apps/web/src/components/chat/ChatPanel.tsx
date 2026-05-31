'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SocketEvent } from '@taxi/shared';
import { roleLabel } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';
import { useSocketConnection, useSocketEvent } from '@/lib/socket';
import type { ChatContact, ChatMessageDTO } from '@/lib/types';

/** Chat 1-a-1 con historial y mensajes en tiempo real. Reutilizable por todos los roles. */
export function ChatPanel() {
  useSocketConnection();
  const authFetch = useAuth((s) => s.authFetch);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selected, setSelected] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [input, setInput] = useState('');
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
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
    authFetch<{ messages: ChatMessageDTO[] }>(`/api/chat/messages?withUserId=${c.id}`)
      .then((r) => setMessages(r.messages))
      .catch(() => setMessages([]));
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  async function send() {
    if (!selected || !input.trim()) return;
    const body = input.trim();
    setInput('');
    try {
      await authFetch('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ recipientId: selected.id, body }),
      });
      // El mensaje llega por socket (mine=true) y se agrega ahi.
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo enviar');
      setInput(body);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[260px_1fr]" style={{ height: '70vh' }}>
      <aside className="card flex flex-col overflow-hidden p-2">
        <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Contactos
        </p>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                selected?.id === c.id
                  ? 'bg-brand/15 text-brand'
                  : 'text-slate-300 hover:bg-surface-overlay'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.fullName}</span>
                <span className="block text-[11px] text-slate-500">{roleLabel[c.role]}</span>
              </span>
              {c.unread > 0 && (
                <span className="ml-2 rounded-full bg-brand px-1.5 text-[10px] font-bold text-surface">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
          {contacts.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">Sin contactos disponibles.</p>
          )}
        </div>
      </aside>

      <section className="card flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="border-b border-surface-border px-4 py-3">
              <p className="text-sm font-semibold text-white">{selected.fullName}</p>
              <p className="text-xs text-slate-500">{roleLabel[selected.role]}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.mine
                        ? 'bg-brand text-surface'
                        : 'bg-surface-overlay text-slate-200'
                    }`}
                  >
                    {m.body}
                    <span className={`mt-0.5 block text-[10px] ${m.mine ? 'text-surface/70' : 'text-slate-500'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 border-t border-surface-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-lg border border-surface-border bg-surface-overlay/60 px-3 py-2 text-sm text-white outline-none focus:border-brand"
              />
              <button
                onClick={send}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface transition hover:bg-brand-soft"
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Selecciona un contacto para chatear.
          </div>
        )}
      </section>
    </div>
  );
}
