import { getStore, addAuditEntry, findOrCreateAgent, newId } from "@/lib/payfence-store";
import { refreshAgentProfile } from "@/lib/trust-score";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * POST /api/payments/refund/[paymentId] — execute refund for a payment
 *
 * Body: { user_id?: string, force?: boolean }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  let body: { user_id?: string; force?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Body is optional for refunds
  }

  const store = getStore();
  const transaction = store.transactions.find((t) => t.id === paymentId);
  if (!transaction) {
    return fail("PAYMENT_NOT_FOUND", `Payment ${paymentId} not found`, 404);
  }

  if (transaction.status === "reversed") {
    return fail("ALREADY_REVERSED", "Payment has already been reversed", 409);
  }

  if (transaction.status !== "executed" && transaction.status !== "authorized") {
    return fail("INVALID_STATUS", `Cannot refund payment with status: ${transaction.status}`, 400);
  }

  // Find or create refund request
  let refundReq = store.refundRequests.find((r) => r.paymentId === paymentId && r.status !== "completed" && r.status !== "rejected");

  if (!refundReq) {
    refundReq = {
      id: newId("ref"),
      paymentId,
      reason: "Direct refund request",
      status: "pending",
      mandateViolation: false,
      createdAt: new Date().toISOString(),
    };
    store.refundRequests.push(refundReq);
  }

  // Execute refund
  transaction.status = "reversed";
  refundReq.status = "completed";
  refundReq.processorRefundId = `rfnd_demo_${newId("rz")}`;
  refundReq.resolvedAt = new Date().toISOString();

  // Update agent trust score
  const agent = findOrCreateAgent(transaction.agent);
  // Only increment dispute count if not already counted
  if (!store.refundRequests.some((r) => r.paymentId === paymentId && r.status === "completed" && r.id !== refundReq!.id)) {
    agent.disputeCount += 1;
    agent.disputeAmountTotal += transaction.amount;
  }
  refreshAgentProfile(agent);

  addAuditEntry({
    paymentId: transaction.id,
    agentId: agent.id,
    action: "payment_refunded",
    mandateId: transaction.mandateId,
    amount: transaction.amount,
    merchant: transaction.merchant,
    authorizationLevel: "manual",
    userId: body.user_id,
    details: {
      refundId: refundReq.id,
      processorRefundId: refundReq.processorRefundId,
      trustScoreAfter: agent.trustScore,
    },
  });

  return ok({
    payment_id: paymentId,
    refund_id: refundReq.id,
    processor_refund_id: refundReq.processorRefundId,
    status: "reversed",
    amount_refunded: transaction.amount,
    agent_trust_score: agent.trustScore,
    agent_tier: agent.tier,
    message: "Payment reversed. Refund processed.",
  });
}
