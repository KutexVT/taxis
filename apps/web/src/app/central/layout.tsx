import { UserRole } from '@taxi/shared';
import { AuthGuard } from '@/components/AuthGuard';
import { SosAlerts } from '@/components/sos/SosAlerts';

export default function CentralLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role={UserRole.CENTRAL_ADMIN}>
      <SosAlerts />
      {children}
    </AuthGuard>
  );
}
