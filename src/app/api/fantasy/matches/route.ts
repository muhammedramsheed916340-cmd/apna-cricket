import { NextResponse } from "next/server";
import { fetchMatches } from "@/lib/tg-api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams.get("sport") || "cricket";
  const matches = await fetchMatches(sport);
  return NextResponse.json({
    status: "success",
    sport,
    count: matches.length,
    data: matches,
  });
}
