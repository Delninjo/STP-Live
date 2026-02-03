import { NextResponse } from "next/server";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyiv5YJurkbkzIARVuSIJnKU7jnyzRYq--fd2m6YkhkpVOXL1Oak5qRkjPwpfTHnofM/exec";

function toJson(text: string) {
  const t = (text || "").trim();

  // Ako Google vrati HTML (login/redirect), objasni
  if (t.startsWith("<!DOCTYPE") || t.startsWith("<html") || t.startsWith("<")) {
    return {
      error: "apps_script_returned_html",
      hint: "Apps Script mora biti Deploy: Execute as = Me, Who has access = Anyone (public). Inace Google vrati login HTML pa fetch puca.",
    };
  }

  try {
    return JSON.parse(t);
  } catch {
    return { error: "invalid_json_from_apps_script", raw: t.slice(0, 200) };
  }
}

export async function GET() {
  try {
    const res = await fetch(SCRIPT_URL, { cache: "no-store" });
    const text = await res.text();
    const data = toJson(text);
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "proxy_get_failed" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text();

    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    const text = await res.text();
    const data = toJson(text);
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "proxy_post_failed" }, { status: 502 });
  }
}

