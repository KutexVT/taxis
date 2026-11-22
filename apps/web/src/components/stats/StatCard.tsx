'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const accents: Record<string, string> = {
  brand: 'text-brand',
  green: 'text-accent-green',
  blue: 'text-accent-blue',
  amber: 'text-amber-800',
  red: 'text-accent-red',
  slate: 'text-body',
};

/** Tarjeta de metrica con valor grande y etiqueta. */
export function StatCard({
  label,
  value,
  accent = 'slate',
  hint,
  href,
  description,
}: {
  label: string;
  value: number | string;
  accent?: keyof typeof accents;
  hint?: string;
  href?: string;
  description?: string;
}) {
  const card = (
    <div
      className={`h-full rounded-2xl bg-surface-overlay p-4 sm:p-5 ${href ? 'transition-colors hover:bg-neutral-200' : ''}`}
    >
      <div className="flex items-start justify-between gap-2"><p className="text-sm text-body">{label}</p>{href && <Icon name="arrow" className="!h-4 !w-4" />}</div>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${accent === 'red' ? 'text-red-700' : 'text-ink'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );

  return href ? (
    <Link href={href} title={description} aria-label={`${label}: ${value}. ${description ?? ''}`} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {card}
    </Link>
  ) : card;
}
