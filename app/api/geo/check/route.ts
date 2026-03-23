import { NextRequest, NextResponse } from 'next/server';
import { Reader } from '@maxmind/geoip2-node';
import path from 'path';
import { STRICT_STATES, STRICT_COUNTRIES, BLOCKED_COUNTRIES, LENIENT_STATES } from '@/lib/types';

let reader: any = null;

async function getReader() {
  if (!reader) {
    const dbPath = path.join(process.cwd(), 'lib', 'geo', 'GeoLite2-City.mmdb');
    reader = await Reader.open(dbPath);
  }
  return reader;
}

export async function POST(request: NextRequest) {
  try {
    const { ip } = await request.json();

    if (!ip) {
      return NextResponse.json({ blocked: false, requiresVeriff: false, requiresConfirm: false, dev: true });
    }

    const db = await getReader();
    const result = db.city(ip);

    const country = result.country?.isoCode || '';
    const state = result.subdivisions?.[0]?.isoCode || '';

    if ((BLOCKED_COUNTRIES as readonly string[]).includes(country)) {
      return NextResponse.json({ blocked: true, country, state });
    }

    if ((STRICT_COUNTRIES as readonly string[]).includes(country)) {
      return NextResponse.json({ blocked: false, requiresVeriff: true, requiresConfirm: false, country, state });
    }

    if (country === 'US') {
      if ((STRICT_STATES as readonly string[]).includes(state)) {
        return NextResponse.json({ blocked: false, requiresVeriff: true, requiresConfirm: false, country, state });
      }
      if ((LENIENT_STATES as readonly string[]).includes(state)) {
        return NextResponse.json({ blocked: false, requiresVeriff: false, requiresConfirm: true, country, state });
      }
    }

    return NextResponse.json({ blocked: false, requiresVeriff: false, requiresConfirm: true, country, state });

  } catch (err) {
    console.error('Geo check error:', err);
    return NextResponse.json({ blocked: false, requiresVeriff: false, requiresConfirm: false, error: true });
  }
}
