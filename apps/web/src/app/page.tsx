import Link from 'next/link';

/**
 * Pagina de inicio (Fase 0). Confirma que el andamiaje funciona.
 * La pantalla de login real se construye en la Fase 1 en /login.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="card w-full max-w-xl p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-black text-surface shadow-glow">
          T
        </div>
        <h1 className="text-2xl font-bold text-white">
          Plataforma de Centrales de Taxi
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Despacho, comunicacion en tiempo real, GPS de flotas y administracion global.
          Andamiaje operativo — Fase 0 lista.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 text-left">
          {[
            { label: 'Frontend', value: 'Next.js + Tailwind' },
            { label: 'Backend', value: 'Express + Socket.io' },
            { label: 'Base de datos', value: 'PostgreSQL + Prisma' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-surface-border bg-surface-overlay/60 p-3"
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-200">{item.value}</p>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-surface transition hover:bg-brand-soft"
        >
          Ir a iniciar sesion
        </Link>
      </div>
    </main>
  );
}
