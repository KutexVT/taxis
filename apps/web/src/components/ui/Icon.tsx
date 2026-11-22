const paths = {
  home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3z',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
  car: 'm5 7 2-4h10l2 4 M3 10l2-3h14l2 3v8H3z M5 18v3 M19 18v3 M6 12h2 M16 12h2',
  chat: 'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4 M8 11h8',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  building: 'M4 21V3h12v18 M16 11h4v10 M2 21h20 M8 7h4 M8 11h4 M8 15h4 M8 21v-3h4v3',
  history: 'M3 11a9 9 0 1 1 2 7 M3 3v8h8 M12 7v5l3 2',
  alert: 'm12 3 10 18H2z M12 9v5 M12 17v1',
  more: 'M4 5h16 M4 12h16 M4 19h16',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  back: 'M20 12H4 m6-6-6 6 6 6',
  close: 'm6 6 12 12 M6 18 18 6',
  location: 'm3 10 18-7-7 18-3-8z',
  logout: 'M10 3H3v18h7 M8 12h13 m-5-5 5 5-5 5',
  phone: 'M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4c0 2-2 3-4 2A20 20 0 0 1 3 7c-1-2 0-4 2-4',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
  moon: 'M20.5 14a8.5 8.5 0 0 1-10.5-10.5A8.5 8.5 0 1 0 20.5 14Z',
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`h-6 w-6 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
