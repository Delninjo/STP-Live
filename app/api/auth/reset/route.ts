import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const token = String(body.token || "").trim();
  const newPassword = String(body.newPassword || "");

  if (!email || !token || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ ok: false, error: "missing_or_weak" }, { status: 400 });
  }

  const userRows = await sql`
    select id from app_users where email = ${email} limit 1
  `;
  const user = userRows?.[0];
  if (!user) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const tokenHash = sha256(token);

  const resetRows = await sql`
    select id
    from password_resets
    where user_id = ${user.id}
      and token_hash = ${tokenHash}
      and used_at is null
      and expires_at > now()
    order by created_at desc
    limit 1
  `;
  const reset = resetRows?.[0];
  if (!reset) return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await sql`update app_users set password_hash = ${passwordHash} where id = ${user.id}`;
  await sql`update password_resets set used_at = now() where id = ${reset.id}`;

  return NextResponse.json({ ok: true });
}

