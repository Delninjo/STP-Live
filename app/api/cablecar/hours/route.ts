import { NextResponse } from "next/server";
import { fetchHtml, load } from "@/lib/scrape";
import { getCache, setCache } from "@/lib/cache";

const URL = "https://www.zicarasljeme.hr/radno-vrijeme/";

export async function GET() {
  const key = "cablecar_hours";
  const cached = getCache<any>(key);
  if (cached) return NextResponse.json(cached);

  const html = await fetchHtml(URL);
  const $ = load(html);

  const rows: any[] = [];
  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;

    const station = $(tds[0]).text().trim();
    const first = $(tds[1]).text().trim();
    const last = $(tds[2]).text().trim();

    if (!station || station.toLowerCase().includes("postaja") || !first || !last) return;
    rows.push({ station, first, last });
  });

  const out = { rows, sourceUrl: URL, updatedAt: new Date().toISOString() };
  setCache(key, out, 10 * 60 * 1000);
  return NextResponse.json(out);
}
