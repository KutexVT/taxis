'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { adminNav } from '@/lib/nav';

export default function AdminChatPage() {
  return (
    <DashboardShell title="Comunicaciones" nav={adminNav}>
      <ChatPanel />
    </DashboardShell>
  );
}
