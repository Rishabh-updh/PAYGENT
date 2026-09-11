import { NextResponse } from "next/server";

// Drop this file at: src/app/api/agents/decide/route.ts in your PAYGENT project

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8001";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agent_name: string;
    scenario: string;
    mandate_id: string;
    merchants: string[];
    max_amount: number;
  };

  // Step 1: ask the CrewAI Python service for a purchase decision
  const decisionRes = await fetch(`${AGENT_SERVICE_URL}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_name: body.agent_name,
      scenario: body.scenario,
      merchants: body.merchants,
      max_amount: body.max_amount,
    }),
  });

  if (!decisionRes.ok) {
    return NextResponse.json({ error: "Agent service unreachable or errored" }, { status: 502 });
  }

  const decision = (await decisionRes.json()) as {
    should_purchase: boolean;
    item: string | null;
    merchant: string | null;
    price: number | null;
    reasoning: string;
  };

  if (!decision.should_purchase || !decision.merchant || !decision.price) {
    return NextResponse.json({ decision, executed: false });
  }

  // Step 2: feed the AI's decision into your EXISTING execute flow — nothing there needs to change
  const executeRes = await fetch(new URL("/api/payments/execute", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mandate_id: body.mandate_id,
      merchant_id: decision.merchant,
      amount: decision.price,
      item: { sku: decision.item ?? "unknown", price: decision.price },
      idempotency_key: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }),
  });

  const executeResult = await executeRes.json();

  return NextResponse.json({ decision, executed: true, payment: executeResult });
}
