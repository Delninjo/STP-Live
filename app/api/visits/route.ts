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

// GET: zadnji dolasci po useru + zadnjih 50 dolazaka ukupno
export async function GET() {
  try {
    const perUser = await sql`
      select
        v.user_id,
        u.display_name,
        max(v.created_at) as last_visit_at,
        count(*)::int as visits_total
      from user_visits v
      left join app_users u on u.id = v.user_id
      group by v.user_id, u.display_name
      order by last_visit_at desc
      limit 50
    `;

    const recent = await sql`
      select
        v.id, v.user_id, u.display_name, v.created_at, v.user_agent
      from user_visits v
      left join app_users u on u.id = v.user_id
      order by v.created_at desc
      limit 50
    `;

    return NextResponse.json({
      ok: true,
      perUser: perUser.map((r: any) => ({
        userId: String(r.user_id),
        displayName: r.display_name == null ? "Unknown" : String(r.display_name),
        lastVisitAt: r.last_visit_at,
        visitsTotal: Number(r.visits_total),
      })),
      recent,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
