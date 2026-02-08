// app/api/cablecar/hours/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const URL = "https://www.zicarasljeme.hr/radno-vrijeme/";

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBetween(s: string, a: string, b: string) {
  const i = s.indexOf(a);
  if (i === -1) return "";
  const j = s.indexOf(b, i + a.length);
  if (j === -1) return s.slice(i);
  return s.slice(i, j);
}

function extractTimes(s: string) {
  return s.match(/\b\d{2}:\d{2}\b/g) ?? [];
}

function isWeekend(d: Date) {
  const day = d.getDay(); // 0=Sun ... 6=Sat
  return day === 0 || day === 6;
}

export async function GET() {
  try {
    const res = await fetch(URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; STP-Live/1.0)",
        Accept: "text/html,*/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "fetch_failed", status: res.status }, { status: 200 });
    }

    const html = await res.text();

    // samo dio s tablicom žičare (iznad garaže)
    const relevant = pickBetween(html, "Radno vrijeme žičare Sljeme", "Radno vrijeme garaže");
    const text = stripTags(relevant);

    // uzmi Gornja postaja red (najčešće 3 vremena: 08:00, 17:00, 18:00)
    const station = "Gornja postaja";
    const idx = text.indexOf(station);
    if (idx === -1) {
      return NextResponse.json({ error: "parse_failed", hint: "Ne nalazim 'Gornja postaja'." }, { status: 200 });
    }

    const slice = text.slice(idx, idx + 220);
    const times = extractTimes(slice);

    const first = times[0] ?? "08:00";
    const lastWorkday = times[1] ?? "";
    const lastWeekend = times[2] ?? "";

    if (!lastWorkday && !lastWeekend) {
      return NextResponse.json(
        { error: "parse_failed", hint: "Ne mogu izvući zadnje polaske (radni/vikend)." },
        { status: 200 }
      );
    }

    const today = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const closeToday = isWeekend(today) ? (lastWeekend || lastWorkday) : (lastWorkday || lastWeekend);
    const closeTomorrow = isWeekend(tomorrow) ? (lastWeekend || lastWorkday) : (lastWorkday || lastWeekend);

    return NextResponse.json(
      {
        today: {
          open: first,
          close: closeToday,
          mode: isWeekend(today) ? "vikend" : "radni",
        },
        tomorrow: {
          open: first,
          close: closeTomorrow,
          mode: isWeekend(tomorrow) ? "vikend" : "radni",
        },
        sourceUrl: URL,
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: "unexpected", details: String(e?.message ?? e) }, { status: 200 });
  }
}
