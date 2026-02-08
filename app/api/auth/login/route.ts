import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const rows = await sql`
    select id, email, display_name, password_hash
    from app_users
    where email = ${email}
    limit 1
  `;

  const user = rows?.[0];
  if (!user) {
    return NextResponse.json({ ok: false, error: "bad_credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "bad_credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.user = { id: user.id, email: user.email, displayName: user.display_name };
  await session.save();

  return NextResponse.json({ ok: true });
}

