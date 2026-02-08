import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Badge = { emoji: string; label: string };

function calcBadge(pointsTotal: number): Badge {
  // slobodno kasnije promijeni pragove
  if (pointsTotal >= 200) return { emoji: "🏆", label: "Legenda" };
  if (pointsTotal >= 100) return { emoji: "🥇", label: "Zlatni" };
  if (pointsTotal >= 50) return { emoji: "🥈", label: "Srebrni" };
  if (pointsTotal >= 20) return { emoji: "🥉", label: "Brončani" };
  if (pointsTotal >= 5) return { emoji: "🚀", label: "U naletu" };
  if (pointsTotal >= 1) return { emoji: "✅", label: "Početnik" };
  return { emoji: "🆕", label: "Novi" };
}

export async function GET() {
  const session = await getSession();
  const me = session.user;

  if (!me) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    // 1) user basic
    const urows =
      await sql`select id, email, display_name
               from app_users
               where id = ${me.id}::uuid
               limit 1`;

    const u = urows[0];
    if (!u) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    // 2) stats
    const srows =
      await sql`select
                  coalesce(sum(points),0)::int as points_total,
                  count(*)::int as activities_total,
                  max(created_at) as last_activity_at
               from user_activities
               where user_id = ${me.id}::uuid`;

    const statsRow = srows[0] ?? {
      points_total: 0,
      activities_total: 0,
      last_activity_at: null,
    };

    const pointsTotal = Number(statsRow.points_total ?? 0);
    const activitiesTotal = Number(statsRow.activities_total ?? 0);
    const lastActivityAt = statsRow.last_activity_at ?? null;

    // 3) by category
    const byCat =
      await sql`select
                  category,
                  coalesce(sum(points),0)::int as points,
                  count(*)::int as count
               from user_activities
               where user_id = ${me.id}::uuid
               group by category
               order by points desc, count desc, category asc`;

    // 4) recent activities (for UI "Zadnje aktivnosti")
    const recentActs =
      await sql`select id, category, points, note, occurred_on, created_at
               from user_activities
               where user_id = ${me.id}::uuid
               order by created_at desc
               limit 20`;

    // 5) visits (user_visits.user_id je TEXT!)
    //    Zato radimo match na string UUID: uv.user_id = ${me.id}
    const visits =
      await sql`select created_at, user_agent
               from user_visits
               where user_id = ${me.id}
               order by created_at desc
               limit 30`;

    const badge = calcBadge(pointsTotal);

    return NextResponse.json({
      ok: true,
      user: {
        id: String(u.id),
        email: String(u.email),
        displayName: String(u.display_name),
      },
      stats: {
        pointsTotal,
        activitiesTotal,
        lastActivityAt,
        badge,
      },
      byCategory: byCat.map((r: any) => ({
        category: String(r.category),
        points: Number(r.points),
        count: Number(r.count),
      })),
      activities: recentActs.map((a: any) => ({
        id: String(a.id),
        category: String(a.category),
        points: Number(a.points),
        note: a.note == null ? null : String(a.note),
        occurredOn: a.occurred_on,
        createdAt: a.created_at,
      })),
      visits: visits.map((v: any) => ({
        createdAt: v.created_at,
        userAgent: v.user_agent == null ? null : String(v.user_agent),
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
