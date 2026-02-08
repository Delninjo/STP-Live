import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    const me = session.user;

    if (!me) {
      return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
    }

    // ukupni bodovi + broj aktivnosti
    const totals =
      await sql`
        select
          coalesce(sum(points), 0)::int as points_total,
          count(*)::int as activities_total,
          max(created_at) as last_activity_at
        from user_activities
        where user_id = ${me.id}
      `;

    // zadnjih 10 aktivnosti
    const recent =
      await sql`
        select
          id,
          category,
          points,
          note,
          occurred_on,
          created_at
        from user_activities
        where user_id = ${me.id}
        order by created_at desc
        limit 10
      `;

    return NextResponse.json({
      ok: true,
      mine: {
        userId: me.id,
        displayName: me.displayName,
        pointsTotal: Number(totals[0].points_total),
        activitiesTotal: Number(totals[0].activities_total),
        lastActivityAt: totals[0].last_activity_at,
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
