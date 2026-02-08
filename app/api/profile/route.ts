import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const me = session.user;

  if (!me) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    const mineRows = await sql`
      select
        ua.user_id,
        au.display_name,
        coalesce(sum(ua.points),0)::int as points_total,
        count(*)::int as activities_total,
        max(ua.created_at) as last_activity_at
      from user_activities ua
      left join app_users au on au.id = ua.user_id
      where ua.user_id = ${me.id}::uuid
      group by ua.user_id, au.display_name
      limit 1
    `;

    const mine = mineRows[0] ?? {
      user_id: me.id,
      display_name: me.displayName,
      points_total: 0,
      activities_total: 0,
      last_activity_at: null,
    };

    const recent = await sql`
      select id, category, points, note, occurred_on, created_at
      from user_activities
      where user_id = ${me.id}::uuid
      order by created_at desc
      limit 20
    `;

    return NextResponse.json({
      ok: true,
      mine: {
        userId: String(mine.user_id),
        displayName: mine.display_name == null ? me.displayName : String(mine.display_name),
        pointsTotal: Number(mine.points_total),
        activitiesTotal: Number(mine.activities_total),
        lastActivityAt: mine.last_activity_at,
      },
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
