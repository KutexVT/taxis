'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { GpsShare } from '@/components/driver/GpsShare';
import { DriverServices } from '@/components/driver/DriverServices';
import { driverNav } from '@/lib/nav';

export default function DriverHome() {
  return (
    <DashboardShell title="Central de Taxi" nav={driverNav}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Tu jornada</h1>
        <div>
          <h2 className="mb-4 text-xl font-semibold text-ink">
            Tus viajes
          </h2>
          <DriverServices />
        </div>
        <GpsShare />
      </div>
    </DashboardShell>
  );
}
