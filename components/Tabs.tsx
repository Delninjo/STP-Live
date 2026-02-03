"use client";

import React, { useEffect, useState } from "react";

const DOGOVORI_API_URL =
  "https://script.google.com/macros/s/AKfycbyiv5YJurkbkzIARVuSIJnKU7jnyzRYq--fd2m6YkhkpVOXL1Oak5qRkjPwpfTHnofM/exec";

const DOGOVORI_SECRET = "STP123";

// imena vas 5 (možeš ih promijeniti kad god želiš)
const PREDEFINED_NAMES = ["Denis", "Ciba", "Szabo", "Magić", "Kerrdog"];

type Tab = "Vrijeme" | "Kamera" | "Dogovori" | "YouTube" | "Žičara";

export default function Tabs() {
  const [tab, setTab] = useState<Tab>("Vrijeme");

  return (
    <>
      <div className="tabs">
        {(["Vrijeme", "Kamera", "Dogovori", "YouTube", "Žičara"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${"tab"} ${tab === t ? "tabActive" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Vrijeme" && <Weather />}
      {tab === "Kamera" && <Camera />}
      {tab === "Dogovori" && <Dogovori />}
      {tab === "YouTube" && <YouTubeLatest />}
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

/** Refresh kad se app/tab vrati u foreground */
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

function Camera() {
  const url = "https://www.livecamcroatia.com/en/camera/sljeme-viewpoint";
  const [blocked, setBlocked] = useState(false);

  // Ako iframe ne učita (često zbog X-Frame-Options/CSP), prebacimo na fallback
  useEffect(() => {
    const t = setTimeout(() => {
      // nakon 4s pretpostavimo da je blokirano (praktičan UX)
      setBlocked(true);
    }, 4000);

    return () => clearTimeout(t);
  }, []);

  return (
    <section>
      <Card title="Sljeme – Vidikovac (Live)">
        {!blocked ? (
          <>
            <div className="small" style={{ marginBottom: 10 }}>
              Ako je embed blokiran, prikazat će se gumb za službeni prijenos.
            </div>

            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              <iframe
                src={url}
                title="Sljeme camera"
                style={{ width: "100%", height: "100%", border: 0 }}
                allow="autoplay; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer"
                onLoad={() => {
                  // ako se učita prije timeouta, ostaje embed
                  setBlocked(false);
                }}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <a className="btn" href={url} target="_blank" rel="noreferrer">
                Otvori u novom tabu
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="small" style={{ marginBottom: 10 }}>
              Embed je vjerojatno blokiran (sigurnosne postavke izvora). Koristi službeni prikaz:
            </div>

            <a className="btn btnPrimary" href={url} target="_blank" rel="noreferrer">
              Otvori službeni prijenos
            </a>
          </>
        )}
      </Card>

      <div className="small">Izvor: LiveCamCroatia</div>
    </section>
  );
}

function Weather() {
  const [now, setNow] = useState<any>(null);
  const [fc, setFc] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const [n, f] = await Promise.all([
        fetch("/api/weather/now", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/weather/forecast", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setNow(n);
      setFc(f);
    } catch {
      setErr("Ne mogu dohvatiti podatke.");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshOnForeground(load);

  return (
    <section>
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
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
                    {h.tempC}°
                  </div>
                  <div className="small">vjetar {h.windMs} m/s</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Sljedećih 7 dana">
            {fc.daily.map((d: any) => (
              <div
                key={d.date}
                style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
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

function YouTubeLatest() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const data = await fetch("/api/youtube/latest", { cache: "no-store" }).then((r) => r.json());
      if (data.error) {
        setErr(data.error);
        return;
      }
      setItems(data.items ?? []);
      setUpdatedAt(data.updatedAt ?? null);
    } catch {
      setErr("Ne mogu dohvatiti YouTube videe.");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30 * 60 * 1000); // 30 min
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshOnForeground(load);

  return (
    <section>
      <Card title="Zadnji videi (STP MTB)">
        {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}
        {items.length === 0 && !err && <div className="small">Učitavam…</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {items.slice(0, 6).map((v) => (
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                overflow: "hidden",
                background: "rgba(0,0,0,0.20)",
                color: "var(--text)",
                textDecoration: "none",
              }}
            >
              {v.thumbnail && (
                <img src={v.thumbnail} alt={v.title} style={{ width: "100%", display: "block" }} />
              )}
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{v.title}</div>
                {v.published && (
                  <div className="small" style={{ marginTop: 6 }}>
                    {String(v.published).slice(0, 10)}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>

        {updatedAt && <div className="small" style={{ marginTop: 10 }}>Ažurirano: {updatedAt}</div>}
      </Card>

      <a className="btn" href="https://www.youtube.com/@stpmtb" target="_blank" rel="noreferrer">
        Otvori kanal
      </a>
    </section>
  );
}

function Cablecar() {
  const [hours, setHours] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const [h, n] = await Promise.all([
        fetch("/api/cablecar/hours", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/cablecar/notices", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setHours(h);
      setNotices(n.items ?? []);
    } catch {
      setErr("Ne mogu dohvatiti podatke o žičari.");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshOnForeground(load);

  return (
    <section>
      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      {hours && (
        <Card title="Radno vrijeme (danas)">
          {hours.rows.map((r: any) => (
            <div
              key={r.station}
              style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
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
            <div
              key={x.url}
              style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <a
                href={x.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontWeight: 900, color: "var(--text)" }}
              >
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

function Dogovori() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState(PREDEFINED_NAMES[0] ?? "");
  const [customName, setCustomName] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    setErr(null);
    try {
      const res = await fetch(DOGOVORI_API_URL, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setErr("Ne mogu dohvatiti dogovore.");
    }
  };

  const add = async () => {
    setErr(null);
    const finalName = name === "" ? customName.trim() : name;

    if (!date || !time || !finalName) {
      setErr("Upiši datum, vrijeme i ime.");
      return;
    }

    try {
      const res = await fetch(DOGOVORI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: DOGOVORI_SECRET,
          date,
          time,
          name: finalName,
          note: note.trim(),
        }),
      }).then((r) => r.json());

      if (res?.error) {
        setErr(res.error);
        return;
      }

      setNote("");
      setCustomName("");
      // refresh list
      await load();
    } catch {
      setErr("Ne mogu spremiti dogovor.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useRefreshOnForeground(load);

  return (
    <section>
      <Card title="Dogovori">
        {err && <div style={{ color: "#ff6b8a", marginBottom: 8 }}>{err}</div>}

        <div className="small">Datum</div>
        <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="small" style={{ marginTop: 8 }}>Vrijeme</div>
        <input className="inp" type="time" value={time} onChange={(e) => setTime(e.target.value)} />

        <div className="small" style={{ marginTop: 8 }}>Tko dolazi</div>
        <select className="inp" value={name} onChange={(e) => setName(e.target.value)}>
          {PREDEFINED_NAMES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="">Drugo...</option>
        </select>

        {name === "" && (
          <input
            className="inp"
            placeholder="Upiši ime"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
        )}

        <div className="small" style={{ marginTop: 8 }}>Napomena (opcionalno)</div>
        <input
          className="inp"
          placeholder="npr. Puntijarka / parking / trail"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" onClick={add}>
            Upiši dogovor
          </button>
          <button className="btn" onClick={load}>
            Osvježi
          </button>
        </div>
      </Card>

      <Card title="Popis">
        {items.length === 0 ? (
          <div className="small">Nema dogovora.</div>
        ) : (
          items.map((x) => (
            <div key={x.id} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 900 }}>
                {x.date} {x.time} — {x.name}
              </div>
              {x.note && <div className="small" style={{ marginTop: 4 }}>{x.note}</div>}
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
