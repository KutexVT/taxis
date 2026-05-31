import { UserRole } from '@taxi/shared';
import { AuthGuard } from '@/components/AuthGuard';
import { SosAlerts } from '@/components/sos/SosAlerts';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role={UserRole.SUPER_ADMIN}>
      <SosAlerts />
      {children}
    </AuthGuard>
  );
}
