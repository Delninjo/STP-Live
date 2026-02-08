import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const user = session.user;

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    const userAgent = request.headers.get("user-agent") ?? null;

    await sql`
      insert into user_visits (user_id, user_agent)
      values (${user.id}::uuid, ${userAgent})
    `;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();
  const me = session.user;

  if (!me) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    const recentMine = await sql`
      select created_at, user_agent
      from user_visits
      where user_id = ${me.id}::uuid
      order by created_at desc
      limit 20
    `;

    const leaderboard = await sql`
      select
        uv.user_id,
        au.display_name,
        count(*)::int as visits_total,
        max(uv.created_at) as last_seen_at
      from user_visits uv
      left join app_users au on au.id = uv.user_id
      group by uv.user_id, au.display_name
      order by last_seen_at desc nulls last, visits_total desc
      limit 50
    `;

    return NextResponse.json({
      ok: true,
      mine: { userId: me.id, displayName: me.displayName },
      recentMine,
      leaderboard: leaderboard.map((r: any) => ({
        userId: String(r.user_id),
        displayName: r.display_name == null ? "Unknown" : String(r.display_name),
        visitsTotal: Number(r.visits_total),
        lastSeenAt: r.last_seen_at,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
