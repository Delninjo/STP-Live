import { NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/cache";
import { getPuntijarkaNow } from "@/lib/dhmz";

export async function GET() {
  const key = "dhmz_now_puntijarka";
  const cached = getCache<any>(key);
  if (cached) return NextResponse.json(cached);

  const data = await getPuntijarkaNow();
  setCache(key, data, 5 * 60 * 1000);
  return NextResponse.json(data);
}
