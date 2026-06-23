import { NextResponse } from "next/server";
import { getSharedToken, setSharedToken, clearSharedToken } from "@/lib/shared-token";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = "8950888988";

export async function GET() {
  try {
    const token = await getSharedToken();
    return NextResponse.json({
      status: "success",
      hasSharedToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : null,
    });
  } catch (error) {
    return NextResponse.json({ status: "fail", error: "Failed to check shared token" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, token, expiryDays, action } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { status: "fail", error: "Unauthorized. Invalid admin password." },
        { status: 401 }
      );
    }

    if (action === "clear") {
      await clearSharedToken();
      return NextResponse.json({ status: "success", message: "Shared token cleared" });
    }

    if (!token || typeof token !== "string" || token.length < 20) {
      return NextResponse.json(
        { status: "fail", error: "A valid token (min 20 chars) is required" },
        { status: 400 }
      );
    }

    await setSharedToken(token, expiryDays || 30);
    return NextResponse.json({
      status: "success",
      message: "Shared token set successfully. All transfers will now use this Bearer token.",
    });
  } catch (error) {
    return NextResponse.json({ status: "fail", error: "Failed to set shared token" }, { status: 500 });
  }
}
