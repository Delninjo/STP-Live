import * as cheerio from "cheerio";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "STP-Live/0.1",
      "Accept-Language": "hr-HR,hr;q=0.9,en;q=0.7"
    }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url} ${res.status}`);
  return await res.text();
}

export function load(html: string) {
  return cheerio.load(html);
}
