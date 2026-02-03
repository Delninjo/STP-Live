// app/api/cablecar/hours/route.ts
import { NextResponse } from "next/server";

const URL = "https://www.zicarasljeme.hr/radno-vrijeme/";

// mali helper: iz HTML-a izvuci tekst bez tagova (basic)
function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function pickFirstMatch(re: RegExp, s: string) {
  const m = s.match(re);
  return m ? m[1] : "";
}

export async function GET() {
  try {
    const res = await fetch(URL, {
      // bitno: nekad WP blokira edge cache, ovo je ok
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; STP-Live/1.0; +https://stp-live.vercel.app/)",
      },
    });

    const html = await res.text();

    // 1) nađi dio oko naslova "Radno vrijeme žičare" (HR/razne varijante)
    // tražimo prvi <h1|h2|h3> koji sadrži "Radno vrijeme" i "žičare"
    const headingIndex = html.search(/<h[1-3][^>]*>[^<]*Radno vrijeme[^<]*žičare/i);
    if (headingIndex < 0) {
      return NextResponse.json(
        { error: "heading_not_found", hint: "Ne nalazim naslov 'Radno vrijeme žičare'." },
        { status: 200 }
      );
    }

    // 2) uzmi chunk nakon naslova (da ne uhvatimo tablice niže na stranici)
    const chunk = html.slice(headingIndex, headingIndex + 120000);

    // 3) uzmi PRVU tablicu nakon tog naslova
    const tableHtml = pickFirstMatch(/<table[^>]*>([\s\S]*?)<\/table>/i, chunk);
    if (!tableHtml) {
      return NextResponse.json(
        { error: "table_not_found", hint: "Ne nalazim tablicu radnog vremena žičare." },
        { status: 200 }
      );
    }

    // 4) izvuci <tr>...</tr>
    const trs = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (trs.length < 2) {
      return NextResponse.json(
        { error: "table_empty", hint: "Tablica je prazna ili neočekivan format." },
        { status: 200 }
      );
    }

    // preskoči header row(e)
    const rows = [];
    for (const tr of trs.slice(1)) {
      const tds = tr.match(/<(td|th)[^>]*>[\s\S]*?<\/(td|th)>/gi) || [];
      const cells = tds.map((c) => stripTags(c));

      // očekujemo nešto kao:
      // [Lokacija, 08:00 h, 16:30 h, 17:30 h]
      if (cells.length < 4) continue;

      const station = cells[0];
      const first = (cells[1] || "").replace(/\s*h\b/i, "").trim();
      const lastWeekday = (cells[2] || "").replace(/\s*h\b/i, "").trim();
      const lastWeekend = (cells[3] || "").replace(/\s*h\b/i, "").trim();

      // filter out header-like rows
      if (!station || /Lokacija polaska/i.test(station)) continue;

      rows.push({
        station,
        first,
        lastWeekday,
        lastWeekend,
      });
    }

    return NextResponse.json({ rows, source: "zicarasljeme.hr" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "fetch_failed", details: String(e?.message || e) },
      { status: 200 }
    );
  }
}
