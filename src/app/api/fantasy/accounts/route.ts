import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FANTASY_PLATFORMS } from "@/lib/fantasy";

export const dynamic = "force-dynamic";

// Get linked fantasy accounts (reads from per-platform cookies)
export async function GET() {
  const store = await cookies();
  const accounts = [];
  for (const p of FANTASY_PLATFORMS) {
    const raw = store.get(`tg_fantasy_${p.slug}`)?.value;
    if (raw) {
      try {
        const decoded = JSON.parse(
          Buffer.from(raw, "base64").toString("utf-8")
        );
        accounts.push({
          ...decoded,
          name: p.name,
          logo: p.logo,
          limit: p.limit,
        });
      } catch {
        /* ignore */
      }
    }
  }
  return NextResponse.json({
    status: "success",
    accounts,
    platforms: FANTASY_PLATFORMS,
  });
}

// Unlink a fantasy account
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fantasyApp } = body as { fantasyApp?: string };
    if (!fantasyApp) {
      return NextResponse.json(
        { status: "error", message: "fantasyApp is required" },
        { status: 400 }
      );
    }
    const store = await cookies();
    store.delete(`tg_fantasy_${fantasyApp}`);
    return NextResponse.json({
      status: "success",
      message: `${fantasyApp} account unlinked`,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
