'use client';

import { useEffect, useRef, useState } from 'react';

const MAX = 10 * 1024 * 1024;
const accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,application/pdf';

function Icon({ name }: { name: 'clip' | 'camera' | 'mic' | 'send' }) {
  const paths = { clip: 'M21 11l-9 9a6 6 0 01-8-8L14 2a4 4 0 016 6L10 18a2 2 0 01-3-3l9-9', camera: 'M3 6h4l2-3h6l2 3h4v15H3z M16 13a4 4 0 11-8 0 4 4 0 018 0', mic: 'M9 5a3 3 0 016 0v7a3 3 0 01-6 0z M5 10v2a7 7 0 0014 0v-2 M12 19v3 M8 22h8', send: 'M22 2L9 15 M22 2l-7 20-6-7-7-6z' };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={paths[name]} /></svg>;
}

export function ChatComposer({ onSend }: { onSend: (body: string, file?: File) => Promise<void> }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder>();
  const stream = useRef<MediaStream>();
  const mounted = useRef(true);
  const attachment = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recorder.current) recorder.current.onstop = null; stream.current?.getTracks().forEach((track) => track.stop()); }; }, []);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setSeconds((n) => n + 1), 1000); return () => clearInterval(timer); }, [recording]);

  function choose(next?: File) {
    setError('');
    if (!next) return;
    if (!accept.split(',').includes(next.type) || next.size > MAX || !next.size) { setError('Elige una imagen video audio o PDF de hasta 10 MB'); return; }
    setFile(next);
  }
  async function record() {
    setError(''); setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Tu navegador necesita HTTPS y soporte de grabación');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      recorder.current = rec;
      const chunks: Blob[] = [];
      let size = 0;
      rec.ondataavailable = (event) => { chunks.push(event.data); size += event.data.size; if (size >= MAX && rec.state === 'recording') rec.stop(); };
      rec.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setRecording(false);
        const type = rec.mimeType.split(';')[0];
        choose(new File(chunks, `Audio-${Date.now()}.${type === 'audio/mp4' ? 'm4a' : type.split('/')[1]}`, { type }));
      };
      rec.start(1000); setSeconds(0); setRecording(true);
    } catch (cause) { stream.current?.getTracks().forEach((track) => track.stop()); setError(cause instanceof Error ? cause.message : 'No se pudo abrir el micrófono'); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function send() {
    if (busy || (!text.trim() && !file)) return;
    setBusy(true); setError('');
    try { await onSend(text.trim(), file); if (mounted.current) { setText(''); setFile(undefined); } }
    catch { if (mounted.current) setError('No se pudo enviar · Puedes intentarlo otra vez'); }
    finally { if (mounted.current) setBusy(false); }
  }
  const small = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-brand disabled:opacity-40';
  return <div className="shrink-0 border-t border-surface-border p-2 sm:p-3">
    {error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}
    {file && <div className="mb-3 rounded-xl bg-surface-overlay p-3 text-body">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button disabled={busy} onClick={() => setFile(undefined)} aria-label="Quitar adjunto">✕</button></div>
      {file.type.startsWith('audio/') && <audio controls src={preview} className="max-w-full" />}
      {file.type.startsWith('image/') && <img src={preview} alt="Vista previa" className="max-h-36 rounded-lg" />}
      {file.type.startsWith('video/') && <video controls src={preview} className="max-h-36 max-w-full rounded-lg" />}
    </div>}
    <input ref={attachment} type="file" accept={accept} className="hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
    <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
    {recording ? <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-overlay px-3 py-2 text-sm text-ink">
      <span className="animate-pulse text-red-700">●</span><span role="status" className="flex-1">Grabando {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      <button onClick={() => { if (recorder.current) recorder.current.onstop = null; recorder.current?.stop(); stream.current?.getTracks().forEach((track) => track.stop()); setRecording(false); }}>Cancelar</button>
      <button onClick={() => recorder.current?.stop()} className="rounded-full bg-brand px-3 py-2 text-surface">Detener</button>
    </div> : <div className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 items-end rounded-[28px] border border-surface-border bg-surface-overlay px-2 py-1 focus-within:ring-2 focus-within:ring-ink">
        <textarea aria-label="Mensaje" placeholder="Mensaje" value={text} maxLength={2000} rows={1} disabled={busy} onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} className="max-h-32 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-ink outline-none" />
        <button type="button" title="Adjuntar archivo" aria-label="Adjuntar archivo" disabled={busy} onClick={() => attachment.current?.click()} className={small}><Icon name="clip" /></button>
        <button type="button" title="Cámara" aria-label="Cámara" disabled={busy} onClick={() => camera.current?.click()} className={small}><Icon name="camera" /></button>
      </div>
      <button type="button" disabled={busy} onClick={() => { if (text.trim() || file) void send(); else void record(); }} aria-label={text.trim() || file ? 'Enviar mensaje' : 'Grabar audio'} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-surface hover:bg-brand-soft disabled:opacity-40">{busy ? '…' : <Icon name={text.trim() || file ? 'send' : 'mic'} />}</button>
    </div>}
  </div>;
}
