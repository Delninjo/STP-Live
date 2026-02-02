"use client";

import { useEffect, useState } from "react";

type Tab = "Vrijeme" | "Kamera" | "Žičara";

export default function Tabs() {
  // ✅ default tab = Vrijeme
  const [tab, setTab] = useState<Tab>("Vrijeme");

  return (
    <>
      {/* ✅ redoslijed tabova: Vrijeme → Kamera → Žičara */}
      <div className="tabs">
        {(["Vrijeme", "Kamera", "Žičara"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${"tab"} ${tab === t ? "tabActive" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ✅ redoslijed sadržaja isti kao tabovi */}
      {tab === "Vrijeme" && <Weather />}
      {tab === "Kamera" && <Camera />}
      {tab === "Žičara" && <Cablecar />}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="cardTitle">{title}</div>
      {children}
    </div>
  );
}

function Camera() {
  return (
    <section>
      <Card title="Sljeme – Vidikovac">
        <div className="small" style={{ marginBottom: 10 }}>
          Otvaramo službenu stranicu kamere (stabilnije od ugrađenog embeda).
        </div>

        <a
          className="btn btnPrimary"
          href="https://www.livecamcroatia.com/hr/kamera/sljeme-vidikovac"
          target="_blank"
          rel="noreferrer"
        >
          Otvori službeni prijenos
        </a>
      </Card>

      <div className="small">Izvor: LiveCamCroatia</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row">
      <div className="small" style={{ fontSize: 13 }}>
        {k}
      </div>
      <div style={{ fontWeight: 800 }}>{v}</div>
    </div>
  );
}

/**
 * Helper: pozovi callback kad se app/tab vrati u foreground:
 * - visibilitychange (kad se vratiš na tab)
 * - focus (kad browser dobije fokus)
 */
function useRefreshOnForeground(cb: () => void) {
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") cb();
    };
    const onFocus = () => cb();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [cb]);
}

function Weather() {
  const [now, setNow] = useState<any>(null);
  const [fc, setFc] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [n, f] = await Promise.all([
        fetch("/api/weather/now", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/weather/forecast", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setNow(n);
      setFc(f);
    } catch {
      setErr("Ne mogu dohvatiti podatke.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ učitaj odmah + periodično osvježavanje
  useEffect(() => {
    load();
    const interval = setInterval(load, 10 * 60 * 1000); // svakih 10 min
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ refresh čim app dođe u foreground
  useRefreshOnForeground(() => {
    // opcionalno: izbjegni refresh ako već učitava
    if (!loading) load();
  });

  return (
    <section>
      {/* Gumb može ostati za ručni refresh (nije nužan) */}
      <button className="btn" onClick={load}>
        {loading ? "Učitavam..." : "Osvježi ručno"}
      </button>

      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      {now && (
        <Card title="Sada na Puntijarki (DHMZ)">
          <Row k="Temperatura" v={`${now.tempC} °C`} />
          <Row k="Vjetar" v={`${now.windDir} ${now.windMs} m/s`} />
          <Row k="Stanje" v={`${now.condition}`} />
          <div className="small" style={{ marginTop: 10 }}>
            Ažurirano: {now.updatedAt}
          </div>
        </Card>
      )}

      {fc && (
        <>
          <Card title="Danas (satno)">
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
              {fc.hourly.slice(0, 24).map((h: any) => (
                <div
                  key={h.time}
                  style={{
                    minWidth: 96,
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: 12,
                    background: "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{h.time.slice(11, 16)}</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{h.tempC}°</div>
                  <div className="small">vjetar {h.windMs} m/s</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Sljedećih 7 dana">
            {fc.daily.map((d: any) => (
              <div key={d.date} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900 }}>{d.date}</div>
                  <div style={{ fontWeight: 900 }}>
                    {d.minC}° / {d.maxC}°
                  </div>
                </div>
                <div className="small" style={{ marginTop: 4 }}>
                  vjetar max {d.windMaxMs} m/s
                </div>
              </div>
            ))}
          </Card>

          <div className="small">Mjerenja: DHMZ • Prognoza: Open-Meteo</div>
        </>
      )}
    </section>
  );
}

function Cablecar() {
  const [hours, setHours] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [h, n] = await Promise.all([
        fetch("/api/cablecar/hours", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/cablecar/notices", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setHours(h);
      setNotices(n.items ?? []);
    } catch {
      setErr("Ne mogu dohvatiti podatke o žičari.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ učitaj odmah + periodično osvježavanje
  useEffect(() => {
    load();
    const interval = setInterval(load, 15 * 60 * 1000); // svakih 15 min
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ refresh čim app dođe u foreground
  useRefreshOnForeground(() => {
    if (!loading) load();
  });

  return (
    <section>
      <button className="btn" onClick={load}>
        {loading ? "Učitavam..." : "Osvježi ručno"}
      </button>

      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      {hours && (
        <Card title="Radno vrijeme (danas)">
          {hours.rows.map((r: any) => (
            <div key={r.station} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 900 }}>{r.station}</div>
              <div className="small" style={{ marginTop: 4 }}>
                Prvi: {r.first} • Zadnji: {r.last}
              </div>
            </div>
          ))}
          <div className="small" style={{ marginTop: 10 }}>
            Izvor: zicarasljeme.hr
          </div>
        </Card>
      )}

      {notices.length > 0 && (
        <Card title="Zadnje obavijesti">
          {notices.slice(0, 6).map((x) => (
            <div key={x.url} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <a href={x.url} target="_blank" rel="noreferrer" style={{ fontWeight: 900, color: "var(--text)" }}>
                {x.title}
              </a>
              {x.date && <div className="small" style={{ marginTop: 4 }}>{x.date}</div>}
            </div>
          ))}
        </Card>
      )}

      <a
        className="btn"
        href="https://www.zicarasljeme.hr/planirani-zastoji-zbog-odrzavanja-zicare/"
        target="_blank"
        rel="noreferrer"
      >
        Planirani zastoji (službeno)
      </a>
    </section>
  );
}
