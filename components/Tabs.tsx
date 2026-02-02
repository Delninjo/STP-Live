"use client";

import { useState } from "react";

type Tab = "Kamera" | "Vrijeme" | "Žičara";

export default function Tabs() {
  const [tab, setTab] = useState<Tab>("Kamera");

  return (
    <>
      <div className="tabs">
        {(["Kamera", "Vrijeme", "Žičara"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab ${tab === t ? "tabActive" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Kamera" && <Camera />}
      {tab === "Vrijeme" && <Weather />}
      {tab === "Žičara" && <Cablecar />}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
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
          Otvaramo službenu stranicu kamere.
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
      <div className="small" style={{ fontSize: 13 }}>{k}</div>
      <div style={{ fontWeight: 800 }}>{v}</div>
    </div>
  );
}

function Weather() {
  const [now, setNow] = useState<any>(null);
  const [fc, setFc] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [n, f] = await Promise.all([
        fetch("/api/weather/now", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/weather/forecast", { cache: "no-store" }).then((r) => r.json())
      ]);
      setNow(n);
      setFc(f);
    } catch {
      setErr("Ne mogu dohvatiti podatke.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <button className="btn" onClick={load} disabled={loading}>
        {loading ? "Učitavam..." : "Učitaj / osvježi"}
      </button>
      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      {!now && !fc && !err && (
        <div className="small" style={{ marginTop: 10 }}>
          Klikni “Učitaj / osvježi” za prognozu i trenutne podatke.
        </div>
      )}

      {now && (
        <Card title="Sada na Puntijarki (DHMZ)">
          <Row k="Temperatura" v={`${now.tempC} °C`} />
          <Row k="Vjetar" v={`${now.windDir} ${now.windMs} m/s`} />
          <Row k="Stanje" v={`${now.condition}`} />
          <div className="small" style={{ marginTop: 10 }}>Ažurirano: {now.updatedAt}</div>
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
                    background: "rgba(0,0,0,0.20)"
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
                  <div style={{ fontWeight: 900 }}>{d.minC}° / {d.maxC}°</div>
                </div>
                <div className="small" style={{ marginTop: 4 }}>vjetar max {d.windMaxMs} m/s</div>
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

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [h, n] = await Promise.all([
        fetch("/api/cablecar/hours", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/cablecar/notices", { cache: "no-store" }).then((r) => r.json())
      ]);
      setHours(h);
      setNotices(n.items ?? []);
    } catch {
      setErr("Ne mogu dohvatiti podatke o žičari.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <button className="btn" onClick={load} disabled={loading}>
        {loading ? "Učitavam..." : "Učitaj / osvježi"}
      </button>
      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      {!hours && notices.length === 0 && !err && (
        <div className="small" style={{ marginTop: 10 }}>
          Klikni “Učitaj / osvježi” za radno vrijeme i obavijesti.
        </div>
      )}

      {hours && (
        <Card title="Radno vrijeme (danas)">
          {hours.rows.map((r: any) => (
            <div key={r.station} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 900 }}>{r.station}</div>
              <div className="small" style={{ marginTop: 4 }}>Prvi: {r.first} • Zadnji: {r.last}</div>
            </div>
          ))}
          <div className="small" style={{ marginTop: 10 }}>Izvor: zicarasljeme.hr</div>
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
