'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const accents: Record<string, string> = {
  brand: 'text-brand',
  green: 'text-accent-green',
  blue: 'text-accent-blue',
  amber: 'text-amber-300',
  red: 'text-accent-red',
  slate: 'text-slate-300',
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card h-full p-4 ${href ? 'transition hover:-translate-y-0.5 hover:border-brand/60' : ''}`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accents[accent]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  );

  return href ? (
    <Link href={href} title={description} aria-label={`${label}: ${value}. ${description ?? ''}`} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {card}
    </Link>
  ) : card;
}
