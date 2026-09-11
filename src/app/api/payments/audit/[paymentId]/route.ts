import { getStore } from "@/lib/payfence-store";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * GET /api/payments/audit/[paymentId] — full audit trail for a payment
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const store = getStore();

  const transaction = store.transactions.find((t) => t.id === paymentId);
  if (!transaction) {
    return fail("PAYMENT_NOT_FOUND", `Payment ${paymentId} not found`, 404);
  }

  // Gather all audit entries for this payment
  const auditEntries = store.auditLog.filter((a) => a.paymentId === paymentId);

  // Gather related escalations
  const escalations = store.escalations.filter((e) => e.paymentId === paymentId);

  // Gather related refund requests
  const refunds = store.refundRequests.filter((r) => r.paymentId === paymentId);

  // Gather ledger entries
  const ledgerEntries = store.ledger.filter((l) => l.transactionId === paymentId);

  // Get the mandate
  const mandate = store.mandates.find((m) => m.id === transaction.mandateId);

  return ok({
    payment: transaction,
    mandate: mandate ? {
      id: mandate.id,
      agent: mandate.agent,
      merchants: mandate.merchants,
      maxAmount: mandate.maxAmount,
      validUntil: mandate.validUntil,
      status: mandate.status,
    } : null,
    audit_trail: auditEntries,
    escalations,
    refunds,
    ledger_entries: ledgerEntries,
    provenance: {
      agent_id: transaction.agent,
      instruction_id: transaction.instructionId ?? null,
      mandate_id: transaction.mandateId,
      authorization_level: transaction.authorizationLevel ?? "unknown",
      idempotency_key: transaction.idempotencyKey,
    },
  });
}
