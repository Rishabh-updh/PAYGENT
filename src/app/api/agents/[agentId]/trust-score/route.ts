import { findAgent } from "@/lib/payfence-store";
import { getTrustBreakdown } from "@/lib/trust-score";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * GET /api/agents/[agentId]/trust-score — agent trust score breakdown
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = findAgent(agentId);

  if (!agent) {
    return fail("AGENT_NOT_FOUND", `Agent ${agentId} not found`, 404);
  }

  return ok(getTrustBreakdown(agent));
}
