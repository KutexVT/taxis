'use client';

import { useEffect, useRef, useState } from 'react';
import { LeafletProvider, createLeafletContext, type LeafletContextInterface } from '@react-leaflet/core';
import L from 'leaflet';

/** React-Leaflet 4 initializes in a ref callback that React Strict Mode can replay. */
export function MapCanvas({ center, children }: { center: [number, number]; children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const initialCenter = useRef(center);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);
  useEffect(() => {
    const map = L.map(container.current!).setView(initialCenter.current, 13);
    map.createPane('taxi-markers').style.zIndex = '660';
    setContext(createLeafletContext(map));
    return () => { map.remove(); };
  }, []);
  return <div ref={container} style={{ height: '100%', width: '100%' }}>
    {context && <LeafletProvider value={context}>{children}</LeafletProvider>}
  </div>;
}
