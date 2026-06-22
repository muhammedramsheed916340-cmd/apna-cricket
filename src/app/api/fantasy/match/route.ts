import { NextResponse } from "next/server";
import { fetchMatchDetail } from "@/lib/tg-api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json(
      { status: "error", message: "matchId is required" },
      { status: 400 }
    );
  }
  const detail = await fetchMatchDetail(matchId);
  if (!detail) {
    return NextResponse.json(
      { status: "error", message: "Failed to fetch match detail" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    status: "success",
    matchId,
    data: detail,
  });
}
