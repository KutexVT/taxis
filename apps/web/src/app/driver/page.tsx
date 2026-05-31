'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { GpsShare } from '@/components/driver/GpsShare';
import { DriverServices } from '@/components/driver/DriverServices';
import { driverNav } from '@/lib/nav';

export default function DriverHome() {
  return (
    <DashboardShell title="App del Taxista" nav={driverNav}>
      <div className="mx-auto max-w-md space-y-4">
        <GpsShare />
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Mis servicios
          </h2>
          <DriverServices />
        </div>
      </div>
    </DashboardShell>
  );
}
