import type { NavItem } from '@/components/DashboardShell';

export const adminNav: NavItem[] = [
  { href: '/admin', label: 'Inicio' },
  { href: '/admin/mapa', label: 'Mapa' },
  { href: '/admin/centrales', label: 'Centrales' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/incidencias', label: 'SOS' },
  { href: '/admin/chat', label: 'Chat' },
  { href: '/admin/auditoria', label: 'Auditoria' },
];

export const centralNav: NavItem[] = [
  { href: '/central', label: 'Inicio' },
  { href: '/central/mapa', label: 'Mapa' },
  { href: '/central/despacho', label: 'Despacho' },
  { href: '/central/taxistas', label: 'Taxistas' },
  { href: '/central/incidencias', label: 'SOS' },
  { href: '/central/chat', label: 'Chat' },
  { href: '/central/historial', label: 'Historial' },
];

export const driverNav: NavItem[] = [
  { href: '/driver', label: 'Inicio' },
  { href: '/driver/chat', label: 'Chat' },
];
