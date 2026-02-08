import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================== URL-ovi ================== */

const URL_HBS = "https://www.hbs.hr/kalendar/mtb/";
const URL_MTBHR = "https://www.mtb.hr/dogodki/";
const URL_UCI =
  "https://www.uci.org/calendar/mtb/1voMyukVGR4iZMhMlDfRv0?discipline=MTB&raceType=DHI";

/* ================== HELPERS ================== */

function stripTags(s: string) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/[^>]+>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html: string) {
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const out: { url: string; title: string }[] = [];
  let m;

  while ((m = re.exec(html))) {
    const url = m[1];
    const title = stripTags(m[2]);
    if (title.length > 5) out.push({ url, title });
  }

  return out;
}

function contains(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

/* ================== FILTERI ================== */

// MTB HR
const MTB_WORDS = ["mtb", "bicikl", "utrk", "enduro", "downhill", "dh", "xco", "xcm"];

// HR lokacije
const HR_WORDS = [
  "hrvatska",
  "croatia",
  "zagreb",
  "split",
  "rijeka",
  "osijek",
  "zadar",
  "pula",
  "dubrovnik",
  "varaždin",
  "istra",
  "sljeme",
];

// UCI DH
const DH_WORDS = ["dhi", "downhill"];

/* ================== SCRAPERI ================== */

async function scrapeSimpleList(url: string) {
  const r = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!r.ok) return [];

  const html = await r.text();
  return extractLinks(html);
}

/* ================== MAIN ================== */

export async function GET() {
  try {
    const [hbs, mtbhr, uci] = await Promise.all([
      scrapeSimpleList(URL_HBS),
      scrapeSimpleList(URL_MTBHR),
      scrapeSimpleList(URL_UCI),
    ]);

    /* ===== HBS + MTB.HR → samo HR MTB ===== */

    const localRaces = [...hbs, ...mtbhr]
      .filter((x) => contains(x.title, MTB_WORDS))
      .filter((x) => contains(x.title, HR_WORDS))
      .map((x) => ({
        title: x.title,
        url: x.url,
        source: "HR",
      }));

    /* ===== UCI → samo DH ===== */

    const uciDh = uci
      .filter((x) => contains(x.title, DH_WORDS))
      .map((x) => ({
        title: x.title,
        url: x.url,
        source: "UCI DH",
      }));

    /* ===== MERGE + DEDUP ===== */

    const map = new Map<string, any>();

    [...localRaces, ...uciDh].forEach((x) => {
      if (!map.has(x.url)) map.set(x.url, x);
    });

    const items = Array.from(map.values()).slice(0, 30);

    return NextResponse.json({
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      error: "races_failed",
      details: String(e?.message ?? e),
    });
  }
}

