import { NextRequest, NextResponse } from 'next/server';

interface PhotonFeature {
  geometry?: { coordinates?: unknown[] };
  properties?: Record<string, unknown>;
}

const labelFields = ['name', 'street', 'district', 'city', 'county', 'state', 'country'];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json({ places: [] });
  }

  const params = new URLSearchParams({ q: query, limit: '5', lat: '10.0919563', lon: '-84.7306073' });

  try {
    const response = await fetch(`https://photon.komoot.io/api?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Photon ${response.status}`);

    const data = (await response.json()) as { features?: PhotonFeature[] };
    const places = (data.features ?? []).flatMap((feature, index) => {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== 'number' || typeof lng !== 'number') return [];

      const parts = labelFields
        .map((field) => feature.properties?.[field])
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .filter((value, partIndex, values) => values.indexOf(value) === partIndex);

      return [{ id: `${feature.properties?.osm_type ?? ''}-${feature.properties?.osm_id ?? index}`, label: parts.join(', '), lat, lng }];
    });

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: 'No se pudo buscar el lugar' }, { status: 502 });
  }
}
