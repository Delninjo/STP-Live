import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbySPYBJ2zyrhj7uJ7CO2um-UsE1sNVK13nQg0dN101LjSHAfsAGUn-KPE8QGY3pulyvDg/exec";

async function fetchWithTimeout(input: string, init: RequestInit, ms = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
  } finally {
    clearTimeout(id);
  }
}

function isHtml(text: string, ct: string) {
  const t = text.trim();
  return ct.includes("text/html") || t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<");
}

export async function GET() {
  try {
    const r = await fetchWithTimeout(APPS_SCRIPT_URL, { method: "GET" });
    const ct = r.headers.get("content-type") || "";
    const text = await r.text();

    if (isHtml(text, ct)) {
      return NextResponse.json(
        {
          error: "apps_script_returned_html",
          status: r.status,
          hint:
            "Apps Script Web App mora biti Deploy: Execute as = Me, Who has access = Anyone. Ako si mijenjao kod, napravi novi Deploy (New deployment) i koristi njegov /exec URL.",
          sample: text.slice(0, 220),
        },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", details: String(e?.message || e) },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();

    const r = await fetchWithTimeout(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bodyText,
    });

    const ct = r.headers.get("content-type") || "";
    const text = await r.text();

    if (isHtml(text, ct)) {
      return NextResponse.json(
        {
          error: "apps_script_returned_html",
          status: r.status,
          hint:
            "Google vraća HTML (login/consent). Provjeri Deploy postavke: Execute as = Me, Who has access = Anyone.",
          sample: text.slice(0, 220),
        },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", details: String(e?.message || e) },
      { status: 502 }
    );
  }
}
