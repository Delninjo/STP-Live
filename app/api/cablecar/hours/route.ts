import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = "https://www.zicarasljeme.hr/radno-vrijeme/";

// grubo čišćenje HTML-a u plain text
function stripTags(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, " • ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFirstMatch(hay: string, re: RegExp) {
  const m = hay.match(re);
  return m ? m[1] : null;
}

export async function GET() {
  try {
    const res = await fetch(URL, {
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      },
    });

    const html = await res.text();

    // 1) nađi dio oko naslova “Radno vrijeme žičare Sljeme”
    const idx = html.toLowerCase().indexOf("radno vrijeme žičare sljeme");
    if (idx === -1) {
      return NextResponse.json({ error: "parse_failed", hint: "Ne nalazim naslov 'Radno vrijeme žičare Sljeme'." }, { status: 200 });
    }

    const slice = html.slice(idx, idx + 20000);

    // 2) uzmi prvu <table> nakon tog naslova
    const tableHtml = pickFirstMatch(slice, /<table[\s\S]*?<\/table>/i);
    if (!tableHtml) {
      return NextResponse.json({ error: "parse_failed", hint: "Ne nalazim tablicu radnog vremena žičare." }, { status: 200 });
    }

    // 3) izvuci redove
    const tr = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    // očekujemo header + 4 reda postaja
    const rows: any[] = [];

    for (const rowHtml of tr) {
      const tds = rowHtml.match(/<(td|th)[\s\S]*?<\/(td|th)>/gi) || [];
      const cells = tds.map((c) => stripTags(c));

      // preskoči header/redove koji nemaju dovoljno kolona
      // cilj nam je format:
      // [Lokacija polaska, 08:00 h, 16:30 h, 17:30 h] ili slično
      if (cells.length < 4) continue;

      const station = cells[0];
      const first = cells[1]?.replace(/\s*h$/i, "").trim();
      const lastWeekday = cells[2]?.replace(/\s*h$/i, "").trim();
      const lastWeekend = cells[3]?.replace(/\s*h$/i, "").trim();

      // preskoči ako je prvi cell i dalje “Lokacija polaska”
      if (/lokacija polaska/i.test(station)) continue;

      rows.push({
        station,
        first,
        lastWeekday,
        lastWeekend,
      });
    }

    return NextResponse.json({
      rows,
      updatedAt: new Date().toISOString(),
      source: URL,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", details: String(e?.message || e) }, { status: 200 });
  }
}
