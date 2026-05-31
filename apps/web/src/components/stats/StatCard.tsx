'use client';

import { motion } from 'framer-motion';

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
}: {
  label: string;
  value: number | string;
  accent?: keyof typeof accents;
  hint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accents[accent]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  );
}
