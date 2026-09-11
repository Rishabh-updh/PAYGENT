import { getStore } from "@/lib/payfence-store";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * GET /api/payments/agent/[agentId]/history — all payments by a specific agent
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const store = getStore();

  // Find agent by id or name
  const agent = store.agents.find(
    (a) => a.id === agentId || a.name === agentId || a.name.toLowerCase() === agentId.toLowerCase(),
  );

  if (!agent) {
    return fail("AGENT_NOT_FOUND", `Agent ${agentId} not found`, 404);
  }

  // Get all transactions by this agent
  const transactions = store.transactions.filter(
    (t) => t.agent === agent.name || t.agent === agent.id,
  );

  // Compute summary stats
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const executedCount = transactions.filter((t) => t.status === "executed").length;
  const reversedCount = transactions.filter((t) => t.status === "reversed").length;
  const pendingCount = transactions.filter((t) => t.status === "awaiting_approval").length;
  const blockedCount = transactions.filter((t) => t.status === "blocked").length;

  return ok({
    agent: {
      id: agent.id,
      name: agent.name,
      trustScore: agent.trustScore,
      tier: agent.tier,
      frozen: agent.frozen,
    },
    summary: {
      total_transactions: transactions.length,
      total_amount: totalAmount,
      executed: executedCount,
      reversed: reversedCount,
      pending_approval: pendingCount,
      blocked: blockedCount,
    },
    transactions,
  });
}
