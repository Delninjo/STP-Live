import { fetchHtml, load } from "./scrape";

const DHMZ_URL = "https://meteo.hr/naslovnica_aktpod.php?tab=aktpod";

export async function getPuntijarkaNow() {
  const html = await fetchHtml(DHMZ_URL);
  const $ = load(html);

  const rows = $("tr");
  let found: any = null;

  rows.each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 5) return;

    const station = $(tds[0]).text().trim();
    if (!station.includes("Puntijarka")) return;

    const windDir = $(tds[1]).text().trim() || "-";
    const windMs = $(tds[2]).text().trim() || "-";
    const tempC = $(tds[3]).text().trim() || "-";
    const condition = $(tds[4]).text().trim() || "-";

    found = { station, windDir, windMs, tempC, condition };
  });

  if (!found) throw new Error("Puntijarka not found in DHMZ table.");

  return {
    ...found,
    updatedAt: new Date().toISOString()
  };
}
