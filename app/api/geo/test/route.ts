import { NextRequest, NextResponse } from "next/server";
import { Reader } from "@maxmind/geoip2-node";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), "lib", "geo", "GeoLite2-City.mmdb");
    const reader = await Reader.open(dbPath);
    
    const testIP = "162.40.143.184";
    const result = reader.city(testIP);
    
    return NextResponse.json({
      testIP,
      country: result.country?.isoCode,
      state: result.subdivisions?.[0]?.isoCode,
      city: result.city?.names?.en,
      message: "MaxMind DB is working correctly"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}