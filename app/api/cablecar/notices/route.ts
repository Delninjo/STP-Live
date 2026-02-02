import { NextResponse } from "next/server";
import { fetchHtml, load } from "@/lib/scrape";
import { getCache, setCache } from "@/lib/cache";

const URL = "https://www.zicarasljeme.hr/obavijesti/";

export async function GET() {
  const key = "cablecar_notices";
  const cached = getCache<any>(key);
  if (cached) return NextResponse.json(cached);

  const html = await fetchHtml(URL);
  const $ = load(html);

  const items: any[] = [];

  $("article a, a").each((_, a) => {
    const href = ($(a).attr("href") || "").trim();
    const title = $(a).text().replace(/\s+/g, " ").trim();
    if (!href.startsWith("https://www.zicarasljeme.hr/")) return;
    if (title.length < 8) return;

    const bad = ["Početna","Radno vrijeme","Karte","Kontakt","O nama","Galerija","Moje Sljeme","Planirani zastoji","Blog"];
    if (bad.includes(title)) return;
    if (href === URL) return;

    items.push({ title, url: href });
  });

  const dedup = new Map<string, any>();
  for (const it of items) {
    if (!dedup.has(it.url)) dedup.set(it.url, it);
  }

  const out = {
    items: Array.from(dedup.values()).slice(0, 12),
    sourceUrl: URL,
    updatedAt: new Date().toISOString()
  };

  setCache(key, out, 10 * 60 * 1000);
  return NextResponse.json(out);
}
