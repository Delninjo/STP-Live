import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await sql`select current_database() as db, current_schema() as schema, now() as now`;
    const hasActivities = await sql`
      select to_regclass('public.user_activities') as user_activities,
             to_regclass('public.app_users') as app_users
    `;
    const cols = await sql`
      select column_name, data_type
      from information_schema.columns
      where table_schema='public' and table_name='user_activities'
      order by ordinal_position
    `;

    return NextResponse.json({
      ok: true,
      db: db[0],
      tables: hasActivities[0],
      userActivitiesColumns: cols,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
