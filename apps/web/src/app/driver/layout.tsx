import { UserRole } from '@taxi/shared';
import { AuthGuard } from '@/components/AuthGuard';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { SosButton } from '@/components/driver/SosButton';
import { DriverGpsProvider } from '@/components/driver/GpsShare';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role={UserRole.DRIVER}>
      <DriverGpsProvider>
        <ServiceWorkerRegister />
        {children}
        <SosButton />
      </DriverGpsProvider>
    </AuthGuard>
  );
}
