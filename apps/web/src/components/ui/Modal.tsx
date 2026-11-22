'use client';

import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';

/** Native dialog provides focus trapping, Escape and focus restoration. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return (
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-body shadow-card backdrop:bg-black/50">
      {open && <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-2xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="button-secondary !px-3" aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        {children}
      </div>}
    </dialog>
  );
}
