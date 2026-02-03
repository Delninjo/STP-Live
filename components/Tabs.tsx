"use client";

import React, { useEffect, useMemo, useState } from "react";

// ====== PODESI OVO ======
const DOGOVORI_SECRET = "STP123";
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

/* ------------------ UI HELPERS ------------------ */

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
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
      <div className="small" style={{ opacity: 0.85 }}>
        {k}
      </div>
      <div style={{ fontWeight: 900 }}>{v}</div>
    </div>
  );
}

/** Refresh kad se tab/app vrati u foreground */
function useRefreshOnForeground(fn: () => void) {
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") fn();
    };
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", fn);
    return () => {
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", fn);
    };
  }, [fn]);
}

function formatUpdatedAtHR(input: any): string {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = new Intl.DateTimeFormat("hr-HR", { hour: "2-digit", minute: "2-digit" }).format(d);

  if (sameDay) return `danas u ${time}`;

  const date = new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  return `${date} u ${time}`;
}

// helper: accept ISO time/date strings or "HH:MM" and return "HH:MM"
function normalizeHHMM(v: any): string {
  if (!v) return "";
  const s = String(v).trim();

  // ISO like 1899-12-30T09:30:00.000Z -> extract HH:MM
  const mIso = s.match(/T(\d{2}:\d{2}):\d{2}/);
  if (mIso) return mIso[1];

  // HH:MM or HH:MM:SS
  const mHM = s.match(/^(\d{1,2}):(\d{2})/);
  if (mHM) return String(mHM[1]).padStart(2, "0") + ":" + mHM[2];

  // AM/PM e.g. 02:47 AM
  const mAmPm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (mAmPm) {
    let hh = parseInt(mAmPm[1], 10);
    const mm = mAmPm[2];
    const ap = mAmPm[3].toUpperCase();
    if (ap === "PM" && hh < 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return String(hh).padStart(2, "0") + ":" + mm;
  }

  return s;
}

/* ------------------ CAMERA ------------------ */

function Camera() {
  const url = "https://www.livecamcroatia.com/en/camera/sljeme-viewpoint";
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBlocked(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section>
      <Card title="Sljeme – Vidikovac (LiveCamCroatia)">
        {!blocked ? (
          <>
            <div className="small" style={{ marginBottom: 10 }}>
              Ako je embed blokiran (X-Frame-Options/CSP), prikazat će se gumb za službeni prijenos.
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
                onLoad={() => setBlocked(false)}
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
              Embed je blokiran sigurnosnim postavkama izvora. Otvori službeno:
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

/* ------------------ WEATHER ------------------ */

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
      setErr("Ne mogu dohvatiti podatke o vremenu.");
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
        <Card title="Na vrhu Sljemena (DHMZ)">
          <Row k="Temperatura" v={`${now.tempC} °C`} />
          <Row k="Vjetar" v={`${now.windDir} ${now.windMs} m/s`} />
          <Row k="Stanje" v={`${now.condition}`} />
          <div className="small" style={{ marginTop: 10 }}>
            Ažurirano: {formatUpdatedAtHR(now.updatedAt)}
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
                  <div style={{ fontWeight: 900 }}>{String(h.time).slice(11, 16)}</div>
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

/* ------------------ YOUTUBE ------------------ */

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
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshOnForeground(load);

  return (
    <section>
      <Card title="Zadnji videi (STP MTB)">
        {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}
        {items.length === 0 && !err && <div className="small">Učitavam…</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
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
              {v.thumbnail && <img src={v.thumbnail} alt={v.title} style={{ width: "100%", display: "block" }} />}
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{v.title}</div>
                {v.published && <div className="small" style={{ marginTop: 6 }}>{String(v.published).slice(0, 10)}</div>}
              </div>
            </a>
          ))}
        </div>

        {updatedAt && <div className="small" style={{ marginTop: 10 }}>Ažurirano: {formatUpdatedAtHR(updatedAt)}</div>}
      </Card>

      <a className="btn" href="https://www.youtube.com/@stpmtb" target="_blank" rel="noreferrer">
        Otvori kanal
      </a>
    </section>
  );
}

/* ------------------ CABLECAR ------------------ */

type CablecarRow = {
  station: string;
  first?: string; // all days
  lastWeekday?: string; // radni dan
  lastWeekend?: string; // vikend/blagdan
};

function Cablecar() {
  const [rows, setRows] = useState<CablecarRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const data = await fetch("/api/cablecar/hours", { cache: "no-store" }).then((r) => r.json());
      if (data.error) {
        setErr(`Ne mogu dohvatiti podatke o žičari. (${data.error})`);
        return;
      }
      setRows(data.rows ?? []);
      setUpdatedAt(data.updatedAt ?? null);
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

  const todayLabel = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0 ned, 6 sub
    // (bez praznika) – vikend = sub/ned
    return day === 0 || day === 6 ? "VIKEND / BLAGDAN" : "RADNI DAN";
  }, []);

  return (
    <section>
      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      <Card title={`Radno vrijeme (danas) • ${todayLabel}`}>
        {rows.length === 0 ? (
          <div className="small">Nema podataka.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rows.map((r) => (
              <div
                key={r.station}
                style={{
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>{r.station}</div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: 10,
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <div className="small">Prvi polazak</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{r.first ?? "—"}</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: 10,
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <div className="small">Zadnji (radni dan)</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{r.lastWeekday ?? "—"}</div>
                  </div>

                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: 10,
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <div className="small">Zadnji (vikend/blagdan)</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{r.lastWeekend ?? "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="small" style={{ marginTop: 12 }}>
          Izvor: zicarasljeme.hr{updatedAt ? ` • Ažurirano: ${formatUpdatedAtHR(updatedAt)}` : ""}
        </div>
      </Card>

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

/* ------------------ DOGOVORI (ADD/EDIT/DELETE) ------------------ */

function Dogovori() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState(PREDEFINED_NAMES[0] ?? "");
  const [customName, setCustomName] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    setErr(null);
    try {
      const res = await fetch("/api/dogovori", { cache: "no-store" });
      const data = await res.json();
      if (data.error) {
        setErr(`Ne mogu dohvatiti dogovore. (${data.error})`);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setErr("Ne mogu dohvatiti dogovore.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setTime("");
    setName(PREDEFINED_NAMES[0] ?? "");
    setCustomName("");
    setNote("");
  };

  const startEdit = (x: any) => {
    setErr(null);
    setEditingId(String(x.id));
    setDate(String(x.date || "").slice(0, 10));
    setTime(normalizeHHMM(x.time));
    const nm = String(x.name || "");
    if (PREDEFINED_NAMES.includes(nm)) {
      setName(nm);
      setCustomName("");
    } else {
      setName("");
      setCustomName(nm);
    }
    setNote(String(x.note || ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    setErr(null);

    const finalName = name === "" ? customName.trim() : name;
    if (!date || !time || !finalName) {
      setErr("Upiši datum, vrijeme i ime.");
      return;
    }

    setBusy(true);
    try {
      const action = editingId ? "update" : "add";

      const payload: any = {
        secret: DOGOVORI_SECRET,
        action,
        date,
        time: normalizeHHMM(time),
        name: finalName,
        note,
      };
      if (editingId) payload.id = editingId;

      const res = await fetch("/api/dogovori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) {
        setErr(`Ne mogu sačuvati dogovor. (${data.error || "unknown"})`);
        return;
      }

      resetForm();
      await load();
    } catch {
      setErr("Ne mogu sačuvati dogovor. (network)");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Obrisati ovaj dogovor?")) return;

    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dogovori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: DOGOVORI_SECRET, action: "delete", id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(`Ne mogu obrisati. (${data.error || "unknown"})`);
        return;
      }

      if (editingId === id) resetForm();
      await load();
    } catch {
      setErr("Ne mogu obrisati. (network)");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useRefreshOnForeground(load);

  return (
    <section>
      <Card title={editingId ? "Uredi dogovor" : "Dogovori"}>
        {err && <div style={{ color: "#ff6b8a", marginBottom: 10 }}>{err}</div>}

        <div className="small" style={{ marginBottom: 6 }}>
          Datum
        </div>
        <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
          Vrijeme (24h)
        </div>
        <input className="inp" type="time" step={60} value={time} onChange={(e) => setTime(e.target.value)} />

        <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
          Tko dolazi
        </div>
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

        <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
          Napomena (opcionalno)
        </div>
        <input className="inp" placeholder="npr. Tunel" value={note} onChange={(e) => setNote(e.target.value)} />

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" onClick={save} disabled={busy}>
            {editingId ? "Spremi izmjene" : "Upiši dogovor"}
          </button>

          <button className="btn" onClick={load} disabled={busy}>
            Osvježi
          </button>

          {editingId && (
            <button className="btn" onClick={resetForm} disabled={busy}>
              Odustani
            </button>
          )}
        </div>
      </Card>

      <Card title="Popis">
        {items.length === 0 ? (
          <div className="small">Nema dogovora.</div>
        ) : (
          items.map((x) => {
            const id = String(x.id);
            const d = String(x.date || "").slice(0, 10);
            const t = normalizeHHMM(x.time);
            const nm = String(x.name || "");
            const nt = String(x.note || "");

            return (
              <div
                key={id}
                style={{
                  padding: "12px 0",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  opacity: busy ? 0.75 : 1,
                }}
              >
                <div>
                  <b>
                    {d} {t}
                  </b>{" "}
                  — {nm}
                  {nt && (
                    <div className="small" style={{ marginTop: 4 }}>
                      {nt}
                    </div>
                  )}
                </div>

                {/* EDIT / DELETE */}
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => startEdit(x)} disabled={busy}>
                    Uredi
                  </button>
                  <button className="btn" onClick={() => del(id)} disabled={busy}>
                    Obriši
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </section>
  );
}
