'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { driverNav } from '@/lib/nav';

export default function DriverChatPage() {
  return (
    <DashboardShell title="Comunicaciones" nav={driverNav}>
      <ChatPanel />
    </DashboardShell>
  );
}
