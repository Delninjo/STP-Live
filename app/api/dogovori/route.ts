import { NextResponse } from "next/server";

// ✅ OVDJE zalijepi TOČAN URL koji ti u browseru daje {"items":[]}
const APPS_SCRIPT_URL =
  "PASTE_TVOJ_GOOGLEUSERCONTENT_EXEC_URL_OVDJE";

export async function GET() {
  try {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });

    const ct = r.headers.get("content-type") || "";
    const text = await r.text();

    // Ako Google vrati HTML (login/consent), to je problem s deployem/URL-om
    if (ct.includes("text/html") || text.trim().startsWith("<")) {
      return NextResponse.json(
        {
          error: "apps_script_returned_html",
          hint:
            "Apps Script mora biti Deploy: Execute as = Me, Who has access = Anyone (public). Također provjeri da APPS_SCRIPT_URL u route.ts koristi TOČAN /exec URL koji radi u incognitu.",
        },
        { status: 502 }
      );
    }

    // normalno JSON
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", details: String(e) },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const r = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      cache: "no-store",
      redirect: "follow",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const ct = r.headers.get("content-type") || "";
    const text = await r.text();

    if (ct.includes("text/html") || text.trim().startsWith("<")) {
      return NextResponse.json(
        {
          error: "apps_script_returned_html",
          hint:
            "Google vraća HTML (login/consent). Provjeri da je web app public (Anyone) i da APPS_SCRIPT_URL koristi najnoviji deployani /exec URL.",
        },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", details: String(e) },
      { status: 502 }
    );
  }
}
