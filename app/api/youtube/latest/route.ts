import { NextResponse } from "next/server";

const CHANNEL_ID = "UClm1wSlhKqn053TfjYqNxXQ";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

export async function GET() {
  const res = await fetch(FEED_URL, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `YouTube feed error: ${res.status}` }, { status: 502 });
  }

  const xml = await res.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];

  const items = entries
    .slice(0, 10)
    .map((e) => {
      const title = extractTag(e, "title") ?? "Video";
      const published = extractTag(e, "published") ?? null;

      const linkMatch = e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/i);
      const url = linkMatch ? linkMatch[1] : null;

      const thumbMatch = e.match(/<media:thumbnail[^>]*url="([^"]+)"[^>]*\/?>/i);
      const thumbnail = thumbMatch ? thumbMatch[1] : null;

      return { title, url, thumbnail, published };
    })
    .filter((x) => x.url);

  return NextResponse.json({
    items,
    updatedAt: new Date().toISOString(),
    source: FEED_URL,
  });
}
