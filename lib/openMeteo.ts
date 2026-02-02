const LAT = 45.89929; // Sljeme peak
const LON = 15.94753;

export async function getForecast() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LON));
  url.searchParams.set("timezone", "Europe/Zagreb");
  url.searchParams.set("hourly", "temperature_2m,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,wind_speed_10m_max");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Open-Meteo failed: ${res.status}`);

  const data = await res.json();

  const hourly = (data.hourly.time as string[]).map((t: string, i: number) => ({
    time: t,
    tempC: Math.round(data.hourly.temperature_2m[i]),
    windMs: Math.round((data.hourly.wind_speed_10m[i] ?? 0) / 3.6)
  }));

  const daily = (data.daily.time as string[]).map((d: string, i: number) => ({
    date: d,
    minC: Math.round(data.daily.temperature_2m_min[i]),
    maxC: Math.round(data.daily.temperature_2m_max[i]),
    windMaxMs: Math.round((data.daily.wind_speed_10m_max[i] ?? 0) / 3.6)
  }));

  return { hourly, daily, source: "open-meteo", tz: data.timezone };
}
