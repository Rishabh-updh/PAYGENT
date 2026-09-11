import { NextResponse } from "next/server";
import { createMandateToken, getStore } from "@/lib/payfence-store";
import { createHash } from "node:crypto";

export async function POST(request: Request) {
  let body: { agent?: string; merchants?: string[]; maxAmount?: number; validHours?: number };
  try {
    body = await request.json() as { agent?: string; merchants?: string[]; maxAmount?: number; validHours?: number };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!body.agent || !body.merchants?.length || typeof body.maxAmount !== "number" || !Number.isInteger(body.maxAmount) || body.maxAmount <= 0 || typeof body.validHours !== "number" || !Number.isInteger(body.validHours) || body.validHours <= 0) {
    return NextResponse.json({ error: "agent, merchants, maxAmount (paise), and validHours are required" }, { status: 400 });
  }
  const { agent, merchants, maxAmount, validHours } = body;
  const store = getStore();
  const id = `mnd_${createHash("sha256").update(`${agent}-${Date.now()}`).digest("hex").slice(0, 8)}`;
  const validUntil = new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString();
  const mandate = { id, agent, merchants, maxAmount, validUntil, status: "active" as const, token: createMandateToken(id, agent, merchants, maxAmount, validUntil) };
  store.mandates.push(mandate);
  return NextResponse.json({ mandate }, { status: 201 });
}
