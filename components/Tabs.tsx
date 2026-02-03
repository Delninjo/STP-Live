function fmtDateHR(yyyyMmDd: string) {
  // "2026-02-07" -> "07.02.2026"
  const m = String(yyyyMmDd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return yyyyMmDd;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function fmtTimeHHMM(t: string) {
  const m = String(t || "").match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return t;
  const hh = ("0" + m[1]).slice(-2);
  const mm = ("0" + m[2]).slice(-2);
  return `${hh}:${mm}`;
}

function Dogovori() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState("");   // YYYY-MM-DD
  const [time, setTime] = useState("");   // HH:mm
  const [name, setName] = useState(PREDEFINED_NAMES[0] ?? "");
  const [customName, setCustomName] = useState("");
  const [note, setNote] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const res = await fetch(DOGOVORI_API_URL, { cache: "no-store" });
      const data = await res.json();
      if (data.error) {
        setErr(data.error);
        return;
      }
      setItems(data.items ?? []);
    } catch (e: any) {
      setErr("Ne mogu dohvatiti dogovore.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useRefreshOnForeground(load);

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setTime("");
    setName(PREDEFINED_NAMES[0] ?? "");
    setCustomName("");
    setNote("");
  };

  const submit = async () => {
    setErr(null);
    const finalName = (name === "" ? customName : name).trim();

    if (!date || !time || !finalName) {
      setErr("Upiši datum, vrijeme i ime.");
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        secret: DOGOVORI_SECRET,
        action: editingId ? "update" : "add",
        id: editingId || undefined,
        date,
        time: fmtTimeHHMM(time), // normalizacija
        name: finalName,
        note: note?.trim() || "",
      };

      const r = await fetch(DOGOVORI_API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok || data.error) {
        setErr("Ne mogu sačuvati dogovor. (" + (data.error || r.status) + ")");
        return;
      }

      resetForm();
      await load();
    } catch (e: any) {
      setErr("Ne mogu sačuvati dogovor. (network)");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (x: any) => {
    setErr(null);
    setEditingId(x.id);
    setDate(String(x.date || ""));
    setTime(fmtTimeHHMM(String(x.time || "")));
    // ako nije u predefined, prebaci na custom
    if (PREDEFINED_NAMES.includes(x.name)) {
      setName(x.name);
      setCustomName("");
    } else {
      setName("");
      setCustomName(x.name || "");
    }
    setNote(x.note || "");
  };

  const remove = async (id: string) => {
    if (!confirm("Obrisati dogovor?")) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(DOGOVORI_API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: DOGOVORI_SECRET, action: "delete", id }),
      });
      const data = await r.json();
      if (!r.ok || data.error) {
        setErr("Ne mogu obrisati. (" + (data.error || r.status) + ")");
        return;
      }
      await load();
    } catch {
      setErr("Ne mogu obrisati. (network)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <Card title="Dogovori">
        {err && <div style={{ color: "#ff6b8a", marginBottom: 10 }}>{err}</div>}

        <label className="small" style={{ display: "block", marginBottom: 6 }}>Datum</label>
        <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <label className="small" style={{ display: "block", marginTop: 10, marginBottom: 6 }}>Vrijeme (24h)</label>
        <input
          className="inp"
          type="time"
          value={time}
          step={60}
          onChange={(e) => setTime(e.target.value)}
        />

        <label className="small" style={{ display: "block", marginTop: 10, marginBottom: 6 }}>Tko dolazi</label>
        <select className="inp" value={name} onChange={(e) => setName(e.target.value)}>
          {PREDEFINED_NAMES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
          <option value="">Drugo…</option>
        </select>

        {name === "" && (
          <input
            className="inp"
            placeholder="Upiši ime"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}

        <label className="small" style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
          Napomena (opcionalno)
        </label>
        <input className="inp" placeholder="npr. Tunel" value={note} onChange={(e) => setNote(e.target.value)} />

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn btnPrimary" onClick={submit} disabled={busy}>
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
          items.map((x) => (
            <div
              key={x.id}
              style={{
                padding: "10px 0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>
                  {fmtDateHR(String(x.date || ""))} • {fmtTimeHHMM(String(x.time || ""))} — {x.name}
                </div>
                {x.note && <div className="small" style={{ marginTop: 4 }}>{x.note}</div>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => startEdit(x)} disabled={busy}>
                  Uredi
                </button>
                <button className="btn" onClick={() => remove(x.id)} disabled={busy}>
                  Obriši
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
