'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { centralNav } from '@/lib/nav';

export default function CentralChatPage() {
  return (
    <DashboardShell title="Comunicaciones" nav={centralNav}>
      <ChatPanel />
    </DashboardShell>
  );
}
