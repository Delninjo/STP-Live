import { NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/cache";
import { getForecast } from "@/lib/openMeteo";

export async function GET() {
  const key = "openmeteo_forecast_sljeme";
  const cached = getCache<any>(key);
  if (cached) return NextResponse.json(cached);

  const data = await getForecast();
  setCache(key, data, 60 * 60 * 1000);
  return NextResponse.json(data);
}
