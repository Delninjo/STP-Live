"use client";

import React, { useEffect, useMemo, useState } from "react";

type Me = { id: string; email: string; displayName: string };

type LeaderRow = {
  userId: string;
  displayName: string;
  pointsTotal: number;
  activitiesTotal: number;
  lastActivityAt: any;
};

type VisitUserRow = {
  userId: string;
  displayName: string;
  lastVisitAt: any;
  visitsTotal: number;
};

const CATEGORY_OPTIONS = [
  { key: "ride_climb", label: "Vožnja uspon (3 boda)", points: 3 },
  { key: "work", label: "Radna akcija (2 boda)", points: 2 },
  { key: "training", label: "Trening (2 boda)", points: 2 },
  { key: "race", label: "Utrka (2 boda)", points: 2 },
  { key: "ride_emtb", label: "Vožnja e-MTB (1 bod)", points: 1 },
  { key: "ride_cablecar", label: "Vožnja žičara (0 bodova)", points: 0 },
] as const;

function fmtDT(v: any) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("hr-HR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeFromPoints(points: number) {
  if (points >= 100) return { name: "Legenda", icon: "🏆" };
  if (points >= 50) return { name: "Pro", icon: "🔥" };
  if (points >= 20) return { name: "Aktivan", icon: "⚡" };
  if (points >= 5) return { name: "Početnik+", icon: "🚴" };
  return { name: "Početnik", icon: "🌱" };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="cardTitle">{title}</div>
      {children}
    </div>
  );
}

export default function ProfileTab({ onMe }: { onMe?: (me: Me | null) => void }) {
  const [me, setMe] = useState<Me | null>(null);

  // add activity form
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0].key);
  const [occurredOn, setOccurredOn] = useState<string>(""); // optional
  const [note, setNote] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // mine stats
  const [mine, setMine] = useState<any>(null);
  const [myRecent, setMyRecent] = useState<any[]>([]);

  // leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);

  // visits
  const [visitUsers, setVisitUsers] = useState<VisitUserRow[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  const myBadge = useMemo(() => badgeFromPoints(Number(mine?.pointsTotal ?? 0)), [mine?.pointsTotal]);

  const loadMe = async () => {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    const j = await r.json();
    const u = (j.user ?? null) as Me | null;
    setMe(u);
    onMe?.(u);
    return u;
  };

  const pingVisit = async () => {
    try {
      await fetch("/api/visits", { method: "POST" });
    } catch {
      // ignore
    }
  };

  const loadMine = async () => {
    const r = await fetch("/api/activities?mine=1", { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "mine_failed");
    setMine(j.mine);
    setMyRecent(j.recent ?? []);
  };

  const loadLeaderboard = async () => {
    const r = await fetch("/api/activities", { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "leaderboard_failed");
    setLeaderboard(j.leaderboard ?? []);
  };

  const loadVisits = async () => {
    const r = await fetch("/api/visits", { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "visits_failed");
    setVisitUsers(j.perUser ?? []);
    setRecentVisits(j.recent ?? []);
  };

  const refreshAll = async () => {
    setErr(null);
    try {
      const u = await loadMe();
      if (u) {
        await pingVisit();
        await Promise.all([loadMine(), loadLeaderboard(), loadVisits()]);
      } else {
        // not logged in -> show only leaderboard + visits (optional)
        await Promise.all([loadLeaderboard(), loadVisits()]);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitActivity = async () => {
    if (!me) {
      setErr("Nisi ulogiran.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: any = {
        category,
        note: note.trim(),
      };
      if (occurredOn) payload.occurredOn = occurredOn;

      const r = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) {
        setErr(j.details ? `${j.error}: ${j.details}` : String(j.error || "db_error"));
        return;
      }

      setNote("");
      setOccurredOn("");
      await Promise.all([loadMine(), loadLeaderboard()]);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      {err && <div style={{ color: "#ff6b8a", marginBottom: 10 }}>{err}</div>}

      <Card title="Korisnik">
        {me ? (
          <>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
              Bok, {me.displayName} 👋
            </div>

            {mine && (
              <div style={{ display: "grid", gap: 6 }}>
                <div className="small">
                  Badge: <b>{myBadge.icon} {myBadge.name}</b>
                </div>
                <div className="small">
                  Bodovi ukupno: <b>{mine.pointsTotal}</b>
                </div>
                <div className="small">
                  Aktivnosti ukupno: <b>{mine.activitiesTotal}</b>
                </div>
                <div className="small">
                  Zadnja aktivnost: <b>{fmtDT(mine.lastActivityAt)}</b>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); await refreshAll(); }}>
                Odjava
              </button>
            </div>
          </>
        ) : (
          <div className="small">
            Nisi ulogiran. Idi na “Prijava” karticu u ovom tabu i napravi login/registraciju (ako već imaš).
          </div>
        )}
      </Card>

      <Card title="Prijava / Registracija">
        <AuthPanel onDone={refreshAll} />
      </Card>

      {me && (
        <Card title="Dodaj aktivnost">
          <div className="small" style={{ marginBottom: 6 }}>
            Kategorija
          </div>
          <select className="inp" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
            Datum (opcionalno)
          </div>
          <input className="inp" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />

          <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>
            Napomena (opcionalno)
          </div>
          <input className="inp" placeholder="npr. Sljeme, 2h" value={note} onChange={(e) => setNote(e.target.value)} />

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btnPrimary" onClick={submitActivity} disabled={busy}>
              {busy ? "Upisujem…" : "Upis"}
            </button>
            <button className="btn" onClick={refreshAll} disabled={busy}>
              Osvježi
            </button>
          </div>
        </Card>
      )}

      {me && (
        <Card title="Moje zadnje aktivnosti">
          {myRecent.length === 0 ? (
            <div className="small">Nema aktivnosti.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {myRecent.map((a: any) => (
                <div
                  key={String(a.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: 12,
                    background: "rgba(0,0,0,0.18)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{String(a.category)}</div>
                    <div style={{ fontWeight: 900 }}>{Number(a.points)} bod</div>
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>
                    Datum: <b>{String(a.occurred_on).slice(0, 10)}</b> • upis: <b>{fmtDT(a.created_at)}</b>
                  </div>
                  {a.note && (
                    <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
                      {String(a.note)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="Ranking (leaderboard)">
        {leaderboard.length === 0 ? (
          <div className="small">Nema podataka.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {leaderboard.map((r, idx) => {
              const b = badgeFromPoints(r.pointsTotal);
              return (
                <div
                  key={r.userId}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: 12,
                    background: "rgba(0,0,0,0.18)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      #{idx + 1} {r.displayName} <span className="small" style={{ opacity: 0.9 }}>({b.icon} {b.name})</span>
                    </div>
                    <div className="small" style={{ opacity: 0.85 }}>
                      aktivnosti: <b>{r.activitiesTotal}</b> • zadnje: <b>{fmtDT(r.lastActivityAt)}</b>
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{r.pointsTotal}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Zadnji dolasci (svaki posjet)">
        {visitUsers.length === 0 ? (
          <div className="small">Nema podataka.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {visitUsers.map((v) => (
              <div
                key={v.userId}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 16,
                  padding: 12,
                  background: "rgba(0,0,0,0.18)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{v.displayName}</div>
                  <div className="small" style={{ opacity: 0.85 }}>
                    zadnji dolazak: <b>{fmtDT(v.lastVisitAt)}</b> • ukupno dolazaka: <b>{v.visitsTotal}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recentVisits.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>Zadnjih 50 dolazaka (log)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {recentVisits.map((x: any) => (
                <div key={String(x.id)} className="small" style={{ opacity: 0.9 }}>
                  <b>{x.display_name ?? "Unknown"}</b> — {fmtDT(x.created_at)}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function AuthPanel({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

      await onDone();
    } catch {
      setErr("network");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <button className={`btn ${mode === "login" ? "btnPrimary" : ""}`} onClick={() => setMode("login")} disabled={busy}>
          Login
        </button>
        <button className={`btn ${mode === "signup" ? "btnPrimary" : ""}`} onClick={() => setMode("signup")} disabled={busy}>
          Registracija
        </button>
      </div>

      {err && <div style={{ color: "#ff6b8a", marginBottom: 10 }}>Greška: {err}</div>}

      <div className="small" style={{ marginBottom: 6 }}>Email</div>
      <input className="inp" value={email} onChange={(e) => setEmail(e.target.value)} />

      {mode === "signup" && (
        <>
          <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>Ime (display)</div>
          <input className="inp" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </>
      )}

      <div className="small" style={{ marginTop: 10, marginBottom: 6 }}>Lozinka</div>
      <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <div style={{ marginTop: 12 }}>
        <button className="btn btnPrimary" onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Registriraj se" : "Ulogiraj se"}
        </button>
      </div>
    </>
  );
}
