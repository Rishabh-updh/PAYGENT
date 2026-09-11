import { getStore, newId, addAuditEntry } from "@/lib/payfence-store";
import { classifyRisk } from "@/lib/risk-engine";
import { ok, fail } from "@/lib/api-response";

/**
 * POST /api/payments/escalate — manually create an escalation
 * GET  /api/payments/escalate — list all escalations
 */
export async function POST(request: Request) {
  let body: { payment_id?: string; reason?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.payment_id) {
    return fail("INVALID_REQUEST", "payment_id is required", 400);
  }

  const store = getStore();
  const transaction = store.transactions.find((t) => t.id === body.payment_id);
  if (!transaction) {
    return fail("PAYMENT_NOT_FOUND", `Payment ${body.payment_id} not found`, 404);
  }

  // Check if escalation already exists
  const existing = store.escalations.find((e) => e.paymentId === body.payment_id && e.status === "pending");
  if (existing) {
    return ok({ escalation: existing, cached: true, message: "Escalation already exists for this payment" });
  }

  const escalation = {
    id: newId("esc"),
    paymentId: transaction.id,
    mandateId: transaction.mandateId,
    agentId: transaction.agent,
    amount: transaction.amount,
    merchant: transaction.merchant,
    reason: body.reason ?? "Manual escalation",
    riskClass: "requires_approval",
    status: "pending" as const,
    createdAt: new Date().toISOString(),
    pendingTransaction: transaction,
  };

  transaction.status = "awaiting_approval";
  store.escalations.push(escalation);

  addAuditEntry({
    paymentId: transaction.id,
    agentId: transaction.agent,
    action: "manual_escalation",
    mandateId: transaction.mandateId,
    amount: transaction.amount,
    merchant: transaction.merchant,
    authorizationLevel: "escalated",
    details: { reason: body.reason, escalationId: escalation.id },
  });

  return ok({ escalation });
}

export function GET() {
  const store = getStore();
  return ok({ escalations: store.escalations });
}
