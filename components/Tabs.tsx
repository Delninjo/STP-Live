"use client";

import React, { useEffect, useMemo, useState } from "react";

// ====== PODESI OVO ======
const DOGOVORI_SECRET = "STP123";
// Predefinirana imena (možeš mijenjati kad god)
const PREDEFINED_NAMES = ["Denis", "Ciba", "Szabo", "Magić", "Kerrdog"];

type Tab = "Vrijeme" | "Kamera" | "Dogovori" | "YouTube" | "Žičara" | "Utrke";

export default function Tabs() {
  const [tab, setTab] = useState<Tab>("Vrijeme");

  return (
    <>
      <div className="tabs">
        {(["Vrijeme", "Kamera", "Dogovori", "YouTube", "Žičara", "Utrke"] as Tab[]).map((t) => (
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
      {tab === "Žičara" && <CablecarToday />}
      {tab === "Utrke" && <Races />}
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

// ===================== CAMERA =====================
function Camera() {
  const url = "https://www.livecamcroatia.com/en/camera/sljeme-viewpoint";
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      // ako nije učitalo u 4s, UX: prikaži fallback
      setBlocked(true);
    }, 4000);
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

// ===================== WEATHER =====================
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
    const interval = setInterval(load, 10 * 60 * 1000); // 10 min
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshOnForeground(load);

  const updatedLocal = useMemo(() => {
    if (!now?.updatedAt) return null;
    const d = new Date(now.updatedAt);
    if (isNaN(d.getTime())) return String(now.updatedAt);
    return d.toLocaleString("hr-HR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [now?.updatedAt]);

  const icon = useMemo(() => weatherIcon(now?.condition), [now?.condition]);

  return (
    <section>
      {err && <p style={{ color: "#ff5a7a" }}>{err}</p>}

      {now && (
        <Card title="Na vrhu Sljemena (DHMZ)">
          <Row k="Temperatura" v={`${now.tempC} °C`} />
          <Row k="Vjetar" v={`${now.windDir} ${now.windMs} m/s`} />
          <Row k="Stanje" v={`${icon} ${String(now.condition ?? "")}`} />
          {updatedLocal && (
            <div className="small" style={{ marginTop: 10 }}>
              Ažurirano: {updatedLocal}
            </div>
          )}
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

// ===================== YOUTUBE =====================
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
                {v.published && (
                  <div className="small" style={{ marginTop: 6 }}>
                    {String(v.published).slice(0, 10)}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>

        {updatedAt && (
          <div className="small" style={{ marginTop: 10 }}>
            Ažurirano: {updatedAt}
          </div>
        )}
      </Card>

      <a className="btn" href="https://www.youtube.com/@stpmtb" target="_blank" rel="noreferrer">
        Otvori kanal
      </a>
    </section>
  );
}
function AuthPanel({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMe = async () => {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    const j = await r.json();
    setUser(j.user ?? null);
  };

  useEffect(() => {
    loadMe();
  }, []);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload: any = { email, password };
      if (mode === "signup") payload.displayName = displayName;

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!j.ok) {
        setErr(j.error || "error");
        return;
      }

      await loadMe();
      onAuth();
    } catch {
      setErr("network");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setErr(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await loadMe();
      onAuth();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Prijava">
      {user ? (
        <>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            Ulogiran: {user.displayName} ({user.email})
          </div>
          <button className="btn" onClick={logout} disabled={busy}>
            Odjava
          </button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button
              className={`btn ${mode === "login" ? "btnPrimary" : ""}`}
              onClick={() => setMode("login")}
              disabled={busy}
            >
              Login
            </button>
            <button
              className={`btn ${mode === "signup" ? "btnPrimary" : ""}`}
              onClick={() => setMode("signup")}
              disabled={busy}
            >
              Registracija
            </button>
          </div>

          {err && <div style={{ color: "#ff6b8a", marginBottom: 10 }}>Greška: {err}</div>}

          <div className="small" style={{ marginBottom: 6 }}>
            Email
          </div>
          <input className="inp" value={email} onChange={(e) => setEmail(e.target.value)} />

          {mode === "signup" && (
            <>
              <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
                Ime (display)
              </div>
              <input className="inp" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </>
          )}

          <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
            Lozinka
          </div>
          <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <div style={{ marginTop: 12 }}>
            <button className="btn btnPrimary" onClick={submit} disabled={busy}>
              {mode === "signup" ? "Registriraj se" : "Ulogiraj se"}
            </button>
          </div>

          <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
            (Self-signup je uključen: svatko može napraviti račun.)
          </div>
        </>
      )}
    </Card>
  );
}
// ===================== DOGOVORI (ADD/EDIT/DELETE) =====================

const [me, setMe] = useState<any>(null);

const loadMe = async () => {
  const r = await fetch("/api/auth/me", { cache: "no-store" });
  const j = await r.json();
  setMe(j.user ?? null);
};
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
  loadMe();
}, []);

  useRefreshOnForeground(load);

  return (
    <section>
      <AuthPanel onAuth={() => { loadMe(); load(); }} />
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
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <div>
                  <b>
                    {d} {t}
                  </b>{" "}
                  — {nm}
                </div>

                {nt && (
                  <div className="small" style={{ marginTop: 4 }}>
                    {nt}
                  </div>
                )}

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

// ===================== ŽIČARA (SAMO DANAS, STATIČNO) =====================
function CablecarToday() {
  // raspored prema tablici koju si poslao (bez parkinga)
  const SCHEDULE = [
    {
      station: "Donja postaja",
      first: "08:00",
      lastWeekday: "16:30",
      lastWeekend: "17:30",
    },
    {
      station: "Međupostaja Brestovac (prema vrhu)",
      first: "08:00",
      lastWeekday: "16:30",
      lastWeekend: "17:30",
    },
    {
      station: "Međupostaja Brestovac (prema dolje)",
      first: "08:00",
      lastWeekday: "17:00",
      lastWeekend: "18:00",
    },
    {
      station: "Gornja postaja",
      first: "08:00",
      lastWeekday: "17:00",
      lastWeekend: "18:00",
    },
  ] as const;

  const isWeekend = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0 ned, 6 sub
    return day === 0 || day === 6;
  }, []);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("hr-HR", { year: "numeric", month: "2-digit", day: "2-digit" });
  }, []);

  const tomorrowLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("hr-HR", { year: "numeric", month: "2-digit", day: "2-digit" });
  }, []);

  const tomorrowIsWeekend = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    return day === 0 || day === 6;
  }, []);

  // “danas radimo do …” — uzmi najkasniji zadnji polazak (gornja postaja je realno najbitnija, ali uzet ćemo max)
  const todayLast = useMemo(() => {
    const lasts = SCHEDULE.map((s) => (isWeekend ? s.lastWeekend : s.lastWeekday));
    return lasts.sort().slice(-1)[0] || "";
  }, [SCHEDULE, isWeekend]);

  const tomorrowFirst = useMemo(() => {
    // po tablici uvijek 08:00
    return "08:00";
  }, []);

  const tomorrowLast = useMemo(() => {
    const lasts = SCHEDULE.map((s) => (tomorrowIsWeekend ? s.lastWeekend : s.lastWeekday));
    return lasts.sort().slice(-1)[0] || "";
  }, [SCHEDULE, tomorrowIsWeekend]);

  return (
    <section>
      <Card title="Radno vrijeme (danas)">
        <div className="small" style={{ marginBottom: 10 }}>
          {todayLabel} • {isWeekend ? "vikend / blagdan" : "radni dan"}
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: 12,
            background: "rgba(0,0,0,0.20)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Sažetak</div>
          <div className="small" style={{ lineHeight: 1.5 }}>
            Danas radimo do <b>{todayLast}</b>.
            <br />
            Sutra ({tomorrowLabel}) otvaramo u <b>{tomorrowFirst}</b> i radimo do <b>{tomorrowLast}</b>.
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {SCHEDULE.map((s) => {
            const last = isWeekend ? s.lastWeekend : s.lastWeekday;
            return (
              <div
                key={s.station}
                style={{
                  padding: "12px 0",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{s.station}</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                  <div className="small">
                    Prvi polazak: <b>{s.first}</b>
                  </div>
                  <div className="small">
                    Zadnji polazak: <b>{last}</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="small" style={{ marginTop: 10 }}>
          Izvor: ZET (radno vrijeme žičare)
        </div>
      </Card>
    </section>
  );
}
// ===================== UTRKE =====================
function Races() {
  const [items, setItems] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showPast, setShowPast] = React.useState(false);

  const toISODate = (v: any): string | null => {
    if (!v) return null;
    const s = String(v).trim();

    // already YYYY-MM-DD
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

    // dd.mm.yyyy or dd/mm/yyyy
    const m2 = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m2) {
      const dd = String(m2[1]).padStart(2, "0");
      const mm = String(m2[2]).padStart(2, "0");
      const yy = m2[3];
      return `${yy}-${mm}-${dd}`;
    }

    // fallback: try Date parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

    return null;
  };

  const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM
  const monthLabelHR = (ym: string) => {
    const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
    const months = [
      "Siječanj",
      "Veljača",
      "Ožujak",
      "Travanj",
      "Svibanj",
      "Lipanj",
      "Srpanj",
      "Kolovoz",
      "Rujan",
      "Listopad",
      "Studeni",
      "Prosinac",
    ];
    return `${months[(m || 1) - 1]} ${y}`;
  };

  const isPast = (iso: string) => {
    // past if before today (local)
    const today = new Date();
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(iso + "T00:00:00");
    return d.getTime() < t.getTime();
  };

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/races", { cache: "no-store" });
      const data = await res.json();

      if (data?.error) {
        setErr(String(data.error));
        return;
      }

      const raw = (data.items ?? data.races ?? []) as any[];

      // normalize + filter (UCI only DHI in HR is already handled server-side ideally)
      const normalized = raw
        .map((r) => {
          const iso = toISODate(r.date);
          return {
            ...r,
            _iso: iso, // for sorting / filtering
            title: String(r.title ?? "").trim(),
            location: String(r.location ?? "").trim(),
            url: String(r.url ?? "").trim(),
            source: String(r.source ?? "").trim(),
            discipline: r.discipline ? String(r.discipline).trim() : "",
          };
        })
        .filter((r) => r.title && r.url); // basic sanity

      // sort by date then title
      normalized.sort((a, b) => {
        const da = a._iso ?? "9999-12-31";
        const db = b._iso ?? "9999-12-31";
        if (da !== db) return da.localeCompare(db);
        return a.title.localeCompare(b.title);
      });

      setItems(normalized);
    } catch {
      setErr("Ne mogu dohvatiti utrke.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  // derived lists
  const todayIso = new Date().toISOString().slice(0, 10);

  const visible = items.filter((r) => {
    if (!r._iso) return true; // keep if unknown date
    if (showPast) return true;
    return !isPast(r._iso);
  });

  const nextRace = visible.find((r) => r._iso && r._iso >= todayIso) ?? visible[0] ?? null;

  // group by month
  const groups = visible.reduce((acc: Record<string, any[]>, r) => {
    const k = r._iso ? monthKey(r._iso) : "unknown";
    acc[k] = acc[k] || [];
    acc[k].push(r);
    return acc;
  }, {});

  const orderedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return a.localeCompare(b);
  });

  const SourcePill = ({ s }: { s: string }) => {
    const label = s?.toLowerCase().includes("uci")
      ? "UCI (DHI HR)"
      : s?.toLowerCase().includes("hbs")
      ? "HBS"
      : s?.toLowerCase().includes("mtb")
      ? "mtb.hr"
      : s || "izvor";

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(0,0,0,0.18)",
          fontSize: 12,
          opacity: 0.9,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <section>
      <Card title="Utrke (MTB)">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Učitavam…" : "Osvježi"}
          </button>

          <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              style={{ transform: "scale(1.05)" }}
            />
            Prikaži prošle utrke
          </label>

          <div className="small" style={{ opacity: 0.75 }}>
            Izvori: mtb.hr + hbs.hr (HR) + UCI (samo DHI u HR)
          </div>
        </div>

        {err && <div style={{ color: "#ff6b8a", marginBottom: 10 }}>{err}</div>}

        {!err && !loading && visible.length === 0 && <div className="small">Nema pronađenih utrka.</div>}

        {/* NEXT RACE HIGHLIGHT */}
        {nextRace && (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 18,
              padding: 12,
              background: "rgba(0,0,0,0.22)",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Sljedeća utrka</div>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {nextRace._iso ?? String(nextRace.date ?? "").slice(0, 10)}
              </span>
            </div>

            <a
              href={nextRace.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 6, color: "var(--text)", textDecoration: "none" }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>{nextRace.title}</div>
              <div className="small" style={{ marginTop: 4, opacity: 0.9 }}>
                {nextRace.location}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <SourcePill s={nextRace.source} />
                {nextRace.discipline && <SourcePill s={nextRace.discipline} />}
              </div>
            </a>
          </div>
        )}

        {/* GROUPED LIST */}
        {orderedKeys.map((k) => (
          <div key={k} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8, opacity: 0.95 }}>
              {k === "unknown" ? "Bez datuma" : monthLabelHR(k)}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {groups[k].map((r: any, i: number) => {
                const dateLabel = r._iso ?? String(r.date ?? "").trim();
                const past = r._iso ? isPast(r._iso) : false;

                return (
                  <a
                    key={r.url + i}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background: "rgba(0,0,0,0.20)",
                      color: "var(--text)",
                      textDecoration: "none",
                      opacity: !showPast && past ? 0.55 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>{r.title}</div>
                      {dateLabel && (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            opacity: 0.9,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {dateLabel}
                        </div>
                      )}
                    </div>

                    {r.location && (
                      <div className="small" style={{ marginTop: 4, opacity: 0.9 }}>
                        {r.location}
                      </div>
                    )}

                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <SourcePill s={r.source} />
                      {r.discipline && <SourcePill s={r.discipline} />}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
// ===================== HELPERS =====================

// helper: accept ISO time/date strings or "HH:MM" and return "HH:MM"
function normalizeHHMM(v: any): string {
  if (!v) return "";
  const s = String(v).trim();

  // ISO like 1899-12-30T09:30:00.000Z -> extract
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

// pokušaj pogoditi ikonu iz WMO koda ili teksta
function weatherIcon(condition: any): string {
  if (condition == null) return "🌤️";
  const s = String(condition).toLowerCase().trim();

  // WMO weather code (Open-Meteo standard): 0..99
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n === 0) return "☀️";
    if (n === 1 || n === 2) return "🌤️";
    if (n === 3) return "☁️";
    if (n === 45 || n === 48) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(n)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(n)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(n)) return "❄️";
    if ([95, 96, 99].includes(n)) return "⛈️";
    return "🌤️";
  }

  // fallback po tekstu
  if (s.includes("thunder") || s.includes("grml") || s.includes("oluj")) return "⛈️";
  if (s.includes("snow") || s.includes("snij")) return "❄️";
  if (s.includes("rain") || s.includes("kiš") || s.includes("pljus")) return "🌧️";
  if (s.includes("fog") || s.includes("magl")) return "🌫️";
  if (s.includes("cloud") || s.includes("obl")) return "☁️";
  if (s.includes("sun") || s.includes("ved")) return "☀️";
  return "🌤️";
}

