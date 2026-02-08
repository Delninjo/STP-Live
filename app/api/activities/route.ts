import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const CATEGORY_POINTS: Record<string, number> = {
  ride_climb: 3,     // vožnja uspon
  work: 2,           // radna akcija
  training: 2,       // trening
  race: 2,           // utrka
  ride_emtb: 1,      // vožnja e-mtb
  ride_cablecar: 0,  // vožnja žičara (nisi dao bodove -> 0)
};

function isValidCategory(c: string) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_POINTS, c);
}

export async function POST(req: Request) {
  const session = await getSession();
  const me = session.user;

  if (!me) {
    return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const category = String(body.category || "").trim();
    const note = String(body.note || "").trim().slice(0, 200);
    const occurredOn = body.occurredOn ? String(body.occurredOn).slice(0, 10) : null;

    if (!isValidCategory(category)) {
      return NextResponse.json({ ok: false, error: "bad_category" }, { status: 400 });
    }

    const points = CATEGORY_POINTS[category];

    const rows =
      await sql`insert into user_activities (user_id, category, points, note, occurred_on)
               values (${me.id}, ${category}, ${points}, ${note || null}, ${occurredOn || sql`current_date`})
               returning id, category, points, note, occurred_on, created_at`;

    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}

/**
 * Leaderboard (all-time)
 */
export async function GET() {
  try {
    const rows =
      await sql`select
                  ua.user_id,
                  au.display_name,
                  coalesce(sum(ua.points),0)::int as points_total,
                  count(*)::int as activities_total,
                  max(ua.created_at) as last_activity_at
               from user_activities ua
               left join app_users au on au.id::text = ua.user_id
               group by ua.user_id, au.display_name
               order by points_total desc, activities_total desc, last_activity_at desc
               limit 50`;

    return NextResponse.json({
      ok: true,
      leaderboard: rows.map((r: any) => ({
        userId: String(r.user_id),
        displayName: r.display_name == null ? "Unknown" : String(r.display_name),
        pointsTotal: Number(r.points_total),
        activitiesTotal: Number(r.activities_total),
        lastActivityAt: r.last_activity_at,
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

