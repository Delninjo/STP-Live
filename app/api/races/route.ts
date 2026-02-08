import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const revalidate = 60 * 30; // 30 min cache

type Race = {
  title: string;
  date?: string;     // "YYYY-MM-DD" or raw
  location?: string; // mjesto
  country?: string;  // "HR" if known
  url?: string;
  source: "mtb.hr" | "hbs.hr" | "uci.org";
  discipline?: string; // npr "DH"
};

function absUrl(base: string, href?: string | null) {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  return new URL(href, base).toString();
}

function clean(s: string) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    // bitno za neke WP stranice
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      "Accept-Language": "hr-HR,hr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetch_failed ${url} ${res.status}`);
  return await res.text();
}

/** mtb.hr — uzmi sve sa /dogodki/ (pretpostavka: već su HR događaji ili imaju HR u tekstu) */
async function fromMtbHr(): Promise<Race[]> {
  const URL = "https://www.mtb.hr/dogodki/";
  const html = await fetchHtml(URL);
  const $ = cheerio.load(html);

  const out: Race[] = [];

  // Pokušaj 1: “article” kartice (WP)
  $("article").each((_, el) => {
    const a = $(el).find("a").first();
    const title = clean(a.text()) || clean($(el).find("h1,h2,h3").first().text());
    const url = absUrl(URL, a.attr("href"));

    const text = clean($(el).text());
    // heuristika: datum u formatu dd.mm.yyyy ili yyyy-mm-dd
    const m1 = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    const m2 = text.match(/(\d{4}-\d{2}-\d{2})/);
    const date = m2?.[1] || m1?.[1];

    if (title) {
      out.push({
        title,
        date,
        url: url || undefined,
        source: "mtb.hr",
        discipline: guessDiscipline(title + " " + text),
      });
    }
  });

  // fallback: svi linkovi koji izgledaju kao događaj
  if (out.length === 0) {
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const t = clean($(el).text());
      if (!href || !t) return;
      if (t.length < 6) return;
      if (!/mtb\.hr/.test(href)) return;

      out.push({
        title: t,
        url: absUrl(URL, href),
        source: "mtb.hr",
        discipline: guessDiscipline(t),
      });
    });
  }

  // filtriraj samo HR ako se vidi u tekstu; inače pusti sve (kako si tražio: “s mtb.hr … sve utrke koje se održavaju u hrvatskoj”)
  // Ovdje je “best effort” bez službenog JSON-a.
  const hr = out.filter((r) => {
    const hay = (r.title + " " + (r.location || "")).toLowerCase();
    return (
      hay.includes("hrvatsk") ||
      hay.includes("croatia") ||
      hay.includes("hr)") ||
      hay.includes(" hr") ||
      // česti gradovi / lokacije (dodaj po potrebi)
      hay.includes("sljeme") ||
      hay.includes("dubrov") ||
      hay.includes("split") ||
      hay.includes("zadar") ||
      hay.includes("rijeka") ||
      hay.includes("istra")
    );
  });

  return (hr.length > 0 ? hr : out).map((x) => ({ ...x, country: "HR" }));
}

/** hbs.hr — kalendar MTB (pretpostavka: HR događaji) */
async function fromHbsHr(): Promise<Race[]> {
  const URL = "https://www.hbs.hr/kalendar/mtb/";
  const html = await fetchHtml(URL);
  const $ = cheerio.load(html);

  const out: Race[] = [];

  // često je tablica
  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 2) return;

    const rowText = clean($(tr).text());
    const date = rowText.match(/(\d{1,2}\.\d{1,2}\.\d{4})/)?.[1] || undefined;

    // title/link
    const a = $(tr).find("a").first();
    const title = clean(a.text()) || clean($(tds.get(1)).text());
    const url = absUrl(URL, a.attr("href"));

    // location (probaj iz ostatka reda)
    const location = clean($(tds.get(tds.length - 1)).text()) || undefined;

    if (!title) return;

    out.push({
      title,
      date,
      location,
      url: url || undefined,
      source: "hbs.hr",
      country: "HR",
      discipline: guessDiscipline(title + " " + rowText),
    });
  });

  // fallback ako nije tablica: uzmi sve “a” unutar sadržaja
  if (out.length === 0) {
    $("main a, article a, .entry-content a").each((_, el) => {
      const title = clean($(el).text());
      const href = $(el).attr("href");
      if (!title || !href) return;
      if (title.length < 6) return;
      out.push({
        title,
        url: absUrl(URL, href),
        source: "hbs.hr",
        country: "HR",
        discipline: guessDiscipline(title),
      });
    });
  }

  return out;
}

/** UCI — samo DHI + HR (sa tvog linka). Stranica zna biti dinamična: pokušaj __NEXT_DATA__ */
async function fromUciDhHr(): Promise<Race[]> {
  const URL =
    "https://www.uci.org/calendar/mtb/1voMyukVGR4iZMhMlDfRv0?discipline=MTB&raceType=DHI&raceClass=CDM";

  const html = await fetchHtml(URL);

  const out: Race[] = [];

  // pokušaj izvući __NEXT_DATA__
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
  if (m?.[1]) {
    try {
      const json = JSON.parse(m[1]);

      // ultra-defenzivno: pretraži bilo koji array objekata koji izgleda kao “events”
      const candidates: any[] = [];
      const seen = new Set<any>();

      function walk(node: any) {
        if (!node || typeof node !== "object" || seen.has(node)) return;
        seen.add(node);

        if (Array.isArray(node)) {
          if (node.length && typeof node[0] === "object") candidates.push(node);
          node.forEach(walk);
          return;
        }

        Object.values(node).forEach(walk);
      }
      walk(json);

      // probaj naći array sa poljima title/name + startDate
      const eventsArr =
        candidates.find((arr) =>
          arr.some((x) => x && (x.name || x.title) && (x.startDate || x.start_date || x.date))
        ) || [];

      for (const e of eventsArr) {
        const name = clean(e.name || e.title);
        const country = clean(e.countryCode || e.country || e.country_code);
        const raceType = clean(e.raceType || e.race_type || "");
        const discipline = clean(e.discipline || "");

        // filter: DH (DHI) i HR
        const isDh =
          /DHI/i.test(raceType) ||
          /Downhill/i.test(name) ||
          /DH/i.test(name) ||
          /DHI/i.test(name);
        const isHr = country === "HR" || /Croatia/i.test(clean(e.countryName || ""));

        if (!isDh || !isHr) continue;

        const start = clean(e.startDate || e.start_date || e.date || "");
        const date = start ? start.slice(0, 10) : undefined;

        out.push({
          title: name || "UCI DH event",
          date,
          location: clean(e.location || e.city || e.venue || ""),
          url: URL,
          source: "uci.org",
          country: "HR",
          discipline: "DH",
        });
      }
    } catch {
      // ignore
    }
  }

  return out;
}

function guessDiscipline(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes("downhill") || /\bdh\b/.test(t) || t.includes("dhi")) return "DH";
  if (t.includes("enduro")) return "ENDURO";
  if (t.includes("xc") || t.includes("xco") || t.includes("cross country")) return "XC";
  return undefined;
}

function normalizeDate(d?: string) {
  if (!d) return "";
  const s = d.trim();
  // dd.mm.yyyy -> yyyy-mm-dd
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yy = m[3];
    return `${yy}-${mm}-${dd}`;
  }
  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return s;
}

function sortKey(r: Race) {
  const d = normalizeDate(r.date) || "9999-99-99";
  return `${d} ${r.title}`;
}

export async function GET() {
  try {
    const [mtb, hbs, uci] = await Promise.allSettled([fromMtbHr(), fromHbsHr(), fromUciDhHr()]);

    const items: Race[] = [];
    if (mtb.status === "fulfilled") items.push(...mtb.value);
    if (hbs.status === "fulfilled") items.push(...hbs.value);
    if (uci.status === "fulfilled") items.push(...uci.value);

    // filteri po tvojoj želji:
    // - UCI: već je “DH + HR only”
    // - mtb.hr i hbs.hr: samo HR (best-effort)
    const filtered = items
      .filter((x) => (x.source === "uci.org" ? x.discipline === "DH" && x.country === "HR" : x.country === "HR"))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

    return NextResponse.json({ ok: true, items: filtered, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "parse_failed", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
