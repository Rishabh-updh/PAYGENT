import { getStore, newId, addAuditEntry, findOrCreateAgent } from "@/lib/payfence-store";
import { refreshAgentProfile } from "@/lib/trust-score";
import { ok, fail } from "@/lib/api-response";

/**
 * POST /api/payments/dispute — initiate a refund claim
 *
 * Body: { payment_id, reason, evidence? }
 *
 * If the payment violated the mandate (wrong merchant, exceeded ceiling, expired window),
 * the refund is auto-approved. Otherwise, it's flagged for manual review.
 */
export async function POST(request: Request) {
  let body: { payment_id?: string; reason?: string; evidence?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.payment_id || !body.reason) {
    return fail("INVALID_REQUEST", "payment_id and reason are required", 400);
  }

  const store = getStore();
  const transaction = store.transactions.find((t) => t.id === body.payment_id);
  if (!transaction) {
    return fail("PAYMENT_NOT_FOUND", `Payment ${body.payment_id} not found`, 404);
  }

  if (transaction.status === "reversed") {
    return fail("ALREADY_REVERSED", "Payment has already been reversed", 409);
  }

  // Check if dispute already exists
  const existingDispute = store.refundRequests.find(
    (r) => r.paymentId === body.payment_id && (r.status === "pending" || r.status === "auto_approved" || r.status === "manual_review"),
  );
  if (existingDispute) {
    return ok({ refund_request: existingDispute, cached: true, message: "Dispute already in progress" });
  }

  // Check if the payment violated the mandate
  const mandate = store.mandates.find((m) => m.id === transaction.mandateId);
  let mandateViolation = false;
  const violations: string[] = [];

  if (mandate) {
    if (!mandate.merchants.includes(transaction.merchant)) {
      mandateViolation = true;
      violations.push(`Merchant ${transaction.merchant} not in mandate scope`);
    }
    if (transaction.amount > mandate.maxAmount) {
      mandateViolation = true;
      violations.push(`Amount ${transaction.amount} exceeds mandate ceiling ${mandate.maxAmount}`);
    }
    if (new Date(mandate.validUntil).getTime() < new Date(transaction.time).getTime()) {
      mandateViolation = true;
      violations.push("Payment executed after mandate expiry");
    }
  } else {
    mandateViolation = true;
    violations.push("No mandate found — payment was unauthorized");
  }

  const refundRequest = {
    id: newId("ref"),
    paymentId: transaction.id,
    reason: body.reason,
    evidence: body.evidence,
    status: mandateViolation ? ("auto_approved" as const) : ("manual_review" as const),
    mandateViolation,
    createdAt: new Date().toISOString(),
  };

  store.refundRequests.push(refundRequest);

  // Update agent dispute stats
  const agent = findOrCreateAgent(transaction.agent);
  agent.disputeCount += 1;
  agent.disputeAmountTotal += transaction.amount;
  refreshAgentProfile(agent);

  addAuditEntry({
    paymentId: transaction.id,
    agentId: agent.id,
    action: mandateViolation ? "dispute_auto_approved" : "dispute_manual_review",
    mandateId: transaction.mandateId,
    amount: transaction.amount,
    merchant: transaction.merchant,
    authorizationLevel: "auto",
    details: {
      refundId: refundRequest.id,
      reason: body.reason,
      mandateViolation,
      violations,
      trustScoreAfter: agent.trustScore,
    },
  });

  // If auto-approved, immediately reverse
  if (mandateViolation) {
    transaction.status = "reversed";
    refundRequest.status = "auto_approved";

    addAuditEntry({
      paymentId: transaction.id,
      agentId: agent.id,
      action: "payment_reversed_auto",
      mandateId: transaction.mandateId,
      amount: transaction.amount,
      merchant: transaction.merchant,
      authorizationLevel: "auto",
      details: { refundId: refundRequest.id, violations },
    });
  }

  return ok({
    refund_request: refundRequest,
    mandate_violation: mandateViolation,
    violations,
    agent_trust_score: agent.trustScore,
    agent_tier: agent.tier,
    message: mandateViolation
      ? "Mandate violation detected — refund auto-approved and payment reversed."
      : "Dispute filed for manual review. A human reviewer will process this within 24 hours.",
  });
}

export function GET() {
  const store = getStore();
  return ok({ disputes: store.refundRequests });
}
