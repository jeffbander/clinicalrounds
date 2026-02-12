import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      anthropic_key: hasApiKey ? "configured" : "missing",
    },
  });
}
