export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(5,6,10,0.72)",
        backdropFilter: "blur(10px)"
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="STP Live" style={{ height: 40, width: "auto" }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.3 }}>STP Live</div>
            <div className="small">Sljeme • kamera • vrijeme • žičara</div>
          </div>
        </div>

        <span className="pill">PWA</span>
      </div>
    </header>
  );
}
