import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");

    if (!isEmail(email)) {
      return NextResponse.json({ ok: false, error: "bad_email" }, { status: 400 });
    }
    if (displayName.length < 2) {
      return NextResponse.json({ ok: false, error: "bad_display_name" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
    }

    const existing = await sql`select id from app_users where email = ${email} limit 1`;
    if (existing.length > 0) {
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const rows =
      await sql`insert into app_users (email, display_name, password_hash)
               values (${email}, ${displayName}, ${passwordHash})
               returning id, email, display_name`;

    const u = rows[0];
    const session = await getSession();
    session.user = { id: String(u.id), email: String(u.email), displayName: String(u.display_name) };
    await session.save();

    return NextResponse.json({ ok: true, user: session.user });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

