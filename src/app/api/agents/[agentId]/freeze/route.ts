import { findAgent, getStore, addAuditEntry } from "@/lib/payfence-store";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * POST /api/agents/[agentId]/freeze — freeze or unfreeze an agent (kill switch)
 *
 * Body: { action: "freeze" | "unfreeze", user_id?: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  let body: { action?: "freeze" | "unfreeze"; user_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.action || !["freeze", "unfreeze"].includes(body.action)) {
    return fail("INVALID_REQUEST", 'action must be "freeze" or "unfreeze"', 400);
  }

  const agent = findAgent(agentId);
  if (!agent) {
    return fail("AGENT_NOT_FOUND", `Agent ${agentId} not found`, 404);
  }

  const wasFrozen = agent.frozen;
  agent.frozen = body.action === "freeze";

  if (wasFrozen === agent.frozen) {
    return ok({
      agent_id: agent.id,
      name: agent.name,
      frozen: agent.frozen,
      message: `Agent is already ${agent.frozen ? "frozen" : "unfrozen"}.`,
    });
  }

  // If freezing, also block all pending payments
  if (agent.frozen) {
    const store = getStore();
    const pendingTxns = store.transactions.filter(
      (t) => (t.agent === agent.name || t.agent === agent.id) && (t.status === "pending" || t.status === "authorized" || t.status === "awaiting_approval"),
    );
    for (const txn of pendingTxns) {
      txn.status = "blocked";
    }
  }

  addAuditEntry({
    paymentId: "",
    agentId: agent.id,
    action: agent.frozen ? "agent_frozen" : "agent_unfrozen",
    mandateId: "",
    amount: 0,
    merchant: "",
    authorizationLevel: "manual",
    userId: body.user_id,
    details: { previousState: wasFrozen ? "frozen" : "active" },
  });

  return ok({
    agent_id: agent.id,
    name: agent.name,
    frozen: agent.frozen,
    message: agent.frozen
      ? "Agent frozen. All pending payments blocked. No new payments will be processed."
      : "Agent unfrozen. Payments can resume.",
  });
}
