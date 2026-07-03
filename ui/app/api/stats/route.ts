import { NextResponse } from "next/server";
import { collectSystemStats } from "@/lib/system-stats";

export async function GET() {
  try {
    const data = collectSystemStats();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to collect system stats:", err);
    return NextResponse.json({ error: "Failed to collect system stats" }, { status: 500 });
  }
}
