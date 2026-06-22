import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Google OAuth-style login endpoint.
// Accepts a Google profile payload { name, email, picture } and creates a session.
// In a production deployment you would exchange a Google `credential` JWT here;
// for this self-contained build we accept the profile directly (mirroring the
// original site's Google OAuth sign-in) and issue a server session cookie.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name =
      body.name ||
      body.credential?.name ||
      (body.email ? String(body.email).split("@")[0] : "User");
    const email = body.email || body.credential?.email;
    const picture =
      body.picture ||
      body.credential?.picture ||
      body.credential?.avatar ||
      "";

    if (!email) {
      return NextResponse.json(
        { status: "error", message: "Email is required" },
        { status: 400 }
      );
    }

    const user = {
      name,
      email,
      picture,
      loggedInAt: Date.now(),
    };

    await setSession(user);

    return NextResponse.json({
      status: "success",
      message: "Logged in",
      user,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
