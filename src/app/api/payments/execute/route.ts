import {
  getStore,
  newTransactionId,
  verifyMandateToken,
  appendLedger,
  addAuditEntry,
  findOrCreateAgent,
  newId,
  type Transaction,
} from "@/lib/payfence-store";
import { classifyRisk } from "@/lib/risk-engine";
import { refreshAgentProfile } from "@/lib/trust-score";
import { ok, fail } from "@/lib/api-response";

/**
 * POST /api/payments/execute — idempotent payment execution
 *
 * The main payment flow:
 * 1. Check agent not frozen
 * 2. Validate mandate (time, merchant, amount)
 * 3. Idempotency check
 * 4. Risk classification
 * 5. Escalate if high risk
 * 6. Execute if low/medium risk
 * 7. Audit + trust update
 */
export async function POST(request: Request) {
  let body: {
    mandate_id?: string;
    instruction_id?: string;
    merchant_id?: string;
    item?: { sku: string; price: number };
    amount?: number;
    idempotency_key?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const { mandate_id, instruction_id, merchant_id, item, amount, idempotency_key } = body;

  if (!mandate_id || !merchant_id || typeof amount !== "number" || amount <= 0) {
    return fail("INVALID_REQUEST", "mandate_id, merchant_id, and amount (positive number) are required", 400);
  }

  const store = getStore();

  // ── 1. Find mandate ──
  const mandate = store.mandates.find((m) => m.id === mandate_id);
  if (!mandate) {
    return fail("MANDATE_NOT_FOUND", `Mandate ${mandate_id} not found`, 404);
  }

  // ── 2. Find/create agent & check frozen ──
  const agent = findOrCreateAgent(mandate.agent);
  if (agent.frozen) {
    return fail("AGENT_FROZEN", `Agent ${agent.name} is frozen. All payments blocked.`, 403);
  }

  // ── 3. Idempotency check ──
  // Use instruction_id or idempotency_key as dedup key
  const dedupKey = idempotency_key ?? instruction_id ?? "";
  if (dedupKey) {
    const existingTxnId = store.usedIdempotencyKeys.get(dedupKey);
    if (existingTxnId) {
      const existingTxn = store.transactions.find((t) => t.id === existingTxnId);
      if (existingTxn) {
        return ok({
          payment_id: existingTxn.id,
          status: existingTxn.status,
          amount: existingTxn.amount,
          merchant: existingTxn.merchant,
          timestamp: existingTxn.time,
          cached: true,
          message: "Duplicate request — returning cached result. No additional charge.",
        });
      }
    }
  }

  // ── 4. Validate mandate ──
  // Time window
  const now = Date.now();
  if (new Date(mandate.validUntil).getTime() < now) {
    return fail("MANDATE_EXPIRED", "Mandate has expired", 403);
  }
  if (mandate.validFrom && new Date(mandate.validFrom).getTime() > now) {
    return fail("MANDATE_NOT_YET_VALID", "Mandate validity window has not started", 403);
  }
  if (mandate.status !== "active") {
    return fail("MANDATE_INVALID", `Mandate status is ${mandate.status}`, 403);
  }

  // Verify token signature
  if (!verifyMandateToken(mandate.token, mandate)) {
    return fail("MANDATE_TOKEN_INVALID", "Mandate token signature verification failed", 401);
  }

  // Merchant scope
  if (!mandate.merchants.includes(merchant_id)) {
    return fail("SCOPE_MISMATCH", `Merchant ${merchant_id} is not in mandate scope [${mandate.merchants.join(", ")}]`, 403);
  }

  // Amount ceiling
  if (amount > mandate.maxAmount) {
    return fail("LIMIT_EXCEEDED", `Amount ${amount} exceeds mandate ceiling ${mandate.maxAmount}`, 403);
  }

  // ── 5. Risk classification ──
  const isFirstMerchantTxn = !store.transactions.some(
    (t) => t.agent === mandate.agent && t.merchant === merchant_id && t.status === "executed",
  );
  const risk = classifyRisk(amount, agent, isFirstMerchantTxn);

  // ── 6. Build transaction ──
  const txnId = newTransactionId();
  const transaction: Transaction = {
    id: txnId,
    agent: mandate.agent,
    merchant: merchant_id,
    amount,
    status: risk.escalationRequired ? "awaiting_approval" : "authorized",
    time: new Date().toISOString(),
    idempotencyKey: dedupKey || txnId,
    mandateId: mandate.id,
    instructionId: instruction_id,
    authorizationLevel: risk.escalationRequired ? "escalated" : "auto",
    item,
  };

  store.transactions.unshift(transaction);
  if (dedupKey) {
    store.usedIdempotencyKeys.set(dedupKey, transaction.id);
  }

  // ── 7. Escalate if required ──
  if (risk.escalationRequired) {
    const escalation = {
      id: newId("esc"),
      paymentId: transaction.id,
      mandateId: mandate.id,
      agentId: agent.id,
      amount,
      merchant: merchant_id,
      reason: risk.reasons.join("; "),
      riskClass: risk.riskClass,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      pendingTransaction: transaction,
    };
    store.escalations.push(escalation);

    addAuditEntry({
      paymentId: transaction.id,
      agentId: agent.id,
      action: "payment_escalated",
      mandateId: mandate.id,
      amount,
      merchant: merchant_id,
      authorizationLevel: "escalated",
      instructionId: instruction_id,
      details: { riskClass: risk.riskClass, reasons: risk.reasons, escalationId: escalation.id },
    });

    appendLedger("escalated", transaction.id, { ...transaction, escalationId: escalation.id });

    return ok({
      payment_id: transaction.id,
      status: "awaiting_approval",
      escalation_id: escalation.id,
      risk: { class: risk.riskClass, reasons: risk.reasons },
      message: "Payment requires human approval. Use POST /api/payments/confirm/:escalationId to approve.",
    });
  }

  // ── 8. Execute payment (auto-approved) ──
  transaction.status = "executed";

  // Update agent stats
  agent.totalPayments += 1;
  agent.successfulPayments += 1;
  refreshAgentProfile(agent);

  appendLedger("executed", transaction.id, transaction);

  addAuditEntry({
    paymentId: transaction.id,
    agentId: agent.id,
    action: "payment_executed",
    mandateId: mandate.id,
    amount,
    merchant: merchant_id,
    authorizationLevel: "auto",
    instructionId: instruction_id,
    details: { riskClass: risk.riskClass, item, razorpayOrderId: `order_demo_${transaction.id}` },
  });

  return ok({
    payment_id: transaction.id,
    status: "completed",
    amount,
    merchant: merchant_id,
    timestamp: transaction.time,
    risk: { class: risk.riskClass, reasons: risk.reasons },
    razorpay_order_id: `order_demo_${transaction.id}`,
    cached: false,
  });
}
