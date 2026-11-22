import type { NavItem } from '@/components/DashboardShell';

export const adminNav: NavItem[] = [
  { href: '/admin', label: 'Inicio', icon: 'home', mobile: true },
  { href: '/admin/mapa', label: 'Mapa', icon: 'map', mobile: true },
  { href: '/admin/centrales', label: 'Centrales', icon: 'building' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'users', mobile: true },
  { href: '/admin/incidencias', label: 'Alertas SOS', icon: 'alert' },
  { href: '/admin/chat', label: 'Chat', icon: 'chat', mobile: true },
  { href: '/admin/auditoria', label: 'Historial', icon: 'history' },
];
export const centralNav: NavItem[] = [
  { href: '/central', label: 'Inicio', icon: 'home', mobile: true },
  { href: '/central/despacho', label: 'Despacho', icon: 'car', mobile: true },
  { href: '/central/mapa', label: 'Mapa', icon: 'map', mobile: true },
  { href: '/central/taxistas', label: 'Taxistas', icon: 'users' },
  { href: '/central/incidencias', label: 'Alertas SOS', icon: 'alert' },
  { href: '/central/chat', label: 'Chat', icon: 'chat', mobile: true },
  { href: '/central/historial', label: 'Historial', icon: 'history' },
];
export const driverNav: NavItem[] = [
  { href: '/driver', label: 'Inicio', icon: 'home', mobile: true },
  { href: '/driver/mapa', label: 'Mapa', icon: 'map', mobile: true },
  { href: '/driver/chat', label: 'Chat', icon: 'chat', mobile: true },
];
