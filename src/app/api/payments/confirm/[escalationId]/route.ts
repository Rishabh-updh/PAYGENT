import { getStore, appendLedger, addAuditEntry, findOrCreateAgent } from "@/lib/payfence-store";
import { refreshAgentProfile } from "@/lib/trust-score";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * POST /api/payments/confirm/[escalationId] — user approves or rejects escalated payment
 *
 * Body: { action: "approve" | "reject", user_id?: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ escalationId: string }> }) {
  const { escalationId } = await params;

  let body: { action?: "approve" | "reject"; user_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.action || !["approve", "reject"].includes(body.action)) {
    return fail("INVALID_REQUEST", 'action must be "approve" or "reject"', 400);
  }

  const store = getStore();
  const escalation = store.escalations.find((e) => e.id === escalationId);
  if (!escalation) {
    return fail("ESCALATION_NOT_FOUND", `Escalation ${escalationId} not found`, 404);
  }

  if (escalation.status !== "pending") {
    return fail("ESCALATION_RESOLVED", `Escalation already resolved with status: ${escalation.status}`, 409);
  }

  const transaction = store.transactions.find((t) => t.id === escalation.paymentId);
  if (!transaction) {
    return fail("PAYMENT_NOT_FOUND", "Associated payment not found", 404);
  }

  const agent = findOrCreateAgent(escalation.agentId);

  if (body.action === "approve") {
    // Execute the held payment
    escalation.status = "approved";
    escalation.userResponse = "approved";
    escalation.responseTimestamp = new Date().toISOString();

    transaction.status = "executed";
    transaction.authorizationLevel = "manual";

    agent.totalPayments += 1;
    agent.successfulPayments += 1;
    refreshAgentProfile(agent);

    appendLedger("approved_and_executed", transaction.id, {
      ...transaction,
      escalationId,
      approvedBy: body.user_id,
    });

    addAuditEntry({
      paymentId: transaction.id,
      agentId: agent.id,
      action: "escalation_approved",
      mandateId: transaction.mandateId,
      amount: transaction.amount,
      merchant: transaction.merchant,
      authorizationLevel: "manual",
      userId: body.user_id,
      details: { escalationId, riskClass: escalation.riskClass },
    });

    return ok({
      escalation_id: escalationId,
      payment_id: transaction.id,
      status: "approved",
      payment_status: "executed",
      message: "Payment approved and executed.",
    });
  } else {
    // Reject — block the payment
    escalation.status = "rejected";
    escalation.userResponse = "rejected";
    escalation.responseTimestamp = new Date().toISOString();

    transaction.status = "blocked";

    agent.totalPayments += 1;
    // Not counted as successful
    refreshAgentProfile(agent);

    appendLedger("rejected", transaction.id, {
      ...transaction,
      escalationId,
      rejectedBy: body.user_id,
    });

    addAuditEntry({
      paymentId: transaction.id,
      agentId: agent.id,
      action: "escalation_rejected",
      mandateId: transaction.mandateId,
      amount: transaction.amount,
      merchant: transaction.merchant,
      authorizationLevel: "manual",
      userId: body.user_id,
      details: { escalationId, riskClass: escalation.riskClass },
    });

    return ok({
      escalation_id: escalationId,
      payment_id: transaction.id,
      status: "rejected",
      payment_status: "blocked",
      message: "Payment rejected and blocked.",
    });
  }
}
