import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const rows =
      await sql`select id, email, display_name, password_hash
               from app_users where email = ${email} limit 1`;

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "bad_credentials" }, { status: 401 });
    }

    const u = rows[0];
    const ok = await bcrypt.compare(password, String(u.password_hash));
    if (!ok) {
      return NextResponse.json({ ok: false, error: "bad_credentials" }, { status: 401 });
    }

    const session = await getSession();
    session.user = { id: String(u.id), email: String(u.email), displayName: String(u.display_name) };
    await session.save();

    return NextResponse.json({ ok: true, user: session.user });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
