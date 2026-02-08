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
      values (${user.id}, ${userAgent})
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}

