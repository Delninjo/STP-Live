export async function POST(request: Request) {
  const session = await getSession();
  const user = session.user;

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    // postoji li visit u zadnjih 5 min
    const recent = await sql`
      select 1
      from user_visits
      where user_id = ${user.id}::text
        and created_at > now() - interval '5 minutes'
      limit 1
    `;

    // ako postoji → preskoči upis
    if (recent.length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // inače → upiši novi visit
    const ua = request.headers.get("user-agent") || null;
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      null;

    await sql`
      insert into user_visits (user_id, user_agent, ip)
      values (${user.id}::text, ${ua}, ${ip})
    `;

    return NextResponse.json({ ok: true, inserted: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
