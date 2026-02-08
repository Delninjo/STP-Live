import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function badgeForPoints(total: number) {
  if (total >= 200) return { key: "legend", label: "Legenda", emoji: "🏆" };
  if (total >= 100) return { key: "pro", label: "Pro", emoji: "🔥" };
  if (total >= 50) return { key: "active", label: "Aktivan", emoji: "💪" };
  if (total >= 10) return { key: "starter", label: "Starter", emoji: "✅" };
  return { key: "newbie", label: "Newbie", emoji: "🌱" };
}

export async function GET() {
  const session = await getSession();
  const me = session.user;

  if (!me) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    const userRows =
      await sql`select id, email, display_name from app_users where id = ${me.id} limit 1`;

    const user = userRows[0]
      ? {
          id: String(userRows[0].id),
          email: String(userRows[0].email),
          displayName: String(userRows[0].display_name),
        }
      : me;

    const visitRows =
      await sql`select created_at, user_agent
               from user_visits
               where user_id = ${me.id}
               order by created_at desc
               limit 50`;

    const activityRows =
      await sql`select id, category, points, note, occurred_on, created_at
               from user_activities
               where user_id = ${me.id}
               order by created_at desc
               limit 50`;

    const totalsRows =
      await sql`select
                  coalesce(sum(points),0) as points_total,
                  count(*)::int as activities_total
               from user_activities
               where user_id = ${me.id}`;

    const pointsTotal = Number(totalsRows[0]?.points_total ?? 0);
    const activitiesTotal = Number(totalsRows[0]?.activities_total ?? 0);

    const byCatRows =
      await sql`select category, coalesce(sum(points),0)::int as points, count(*)::int as cnt
               from user_activities
               where user_id = ${me.id}
               group by category
               order by points desc, cnt desc`;

    const badge = badgeForPoints(pointsTotal);

    return NextResponse.json({
      ok: true,
      user,
      stats: {
        pointsTotal,
        activitiesTotal,
        badge,
      },
      visits: visitRows.map((v: any) => ({
        createdAt: v.created_at,
        userAgent: v.user_agent,
      })),
      activities: activityRows.map((a: any) => ({
        id: String(a.id),
        category: String(a.category),
        points: Number(a.points),
        note: a.note == null ? "" : String(a.note),
        occurredOn: a.occurred_on,
        createdAt: a.created_at,
      })),
      byCategory: byCatRows.map((r: any) => ({
        category: String(r.category),
        points: Number(r.points),
        count: Number(r.cnt),
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

