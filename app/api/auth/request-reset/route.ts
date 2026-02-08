import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { mailer } from "@/lib/mailer";

export const runtime = "nodejs";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: true }); // ne otkrivamo postoji li user

  const rows = await sql`
    select id, email
    from app_users
    where email = ${email}
    limit 1
  `;
  const user = rows?.[0];
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await sql`
    insert into password_resets(user_id, token_hash, expires_at)
    values (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  const baseUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "";

  // Ako baseUrl nije set, link će biti relativan – OK, ali bolje je u Vercelu dodati env:
  // VERCEL_PROJECT_PRODUCTION_URL = stp-live.vercel.app (bez https)
  const link = `${baseUrl}/reset?token=${token}&email=${encodeURIComponent(email)}`;

  await mailer().sendMail({
    from: process.env.MAIL_FROM!,
    to: email,
    subject: "STP Live — reset lozinke",
    text: `Reset link: ${link}`,
  });

  return NextResponse.json({ ok: true });
}

