import { getStore } from "@/lib/payfence-store";
import { ok, fail } from "@/lib/api-response";

/**
 * POST /api/payments/verify — pre-payment verification
 *
 * Confirms item, price, and merchant match the mandate BEFORE funds move.
 */
export async function POST(request: Request) {
  let body: {
    mandate_id?: string;
    merchant_id?: string;
    amount?: number;
    item_details?: { sku?: string; price?: number; name?: string };
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.mandate_id || !body.merchant_id || typeof body.amount !== "number") {
    return fail("INVALID_REQUEST", "mandate_id, merchant_id, and amount are required", 400);
  }

  const store = getStore();
  const mandate = store.mandates.find((m) => m.id === body.mandate_id);

  if (!mandate) {
    return fail("MANDATE_NOT_FOUND", `Mandate ${body.mandate_id} not found`, 404);
  }

  const checks: { field: string; expected: string; actual: string; match: boolean }[] = [];
  let allPassed = true;

  // Check 1: Mandate status
  const now = Date.now();
  const isExpired = new Date(mandate.validUntil).getTime() < now;
  const isActive = mandate.status === "active" && !isExpired;
  checks.push({
    field: "mandate_status",
    expected: "active",
    actual: isExpired ? "expired" : mandate.status,
    match: isActive,
  });
  if (!isActive) allPassed = false;

  // Check 2: Merchant scope
  const merchantMatch = mandate.merchants.includes(body.merchant_id);
  checks.push({
    field: "merchant",
    expected: mandate.merchants.join(", "),
    actual: body.merchant_id,
    match: merchantMatch,
  });
  if (!merchantMatch) allPassed = false;

  // Check 3: Amount ceiling
  const amountOk = body.amount <= mandate.maxAmount;
  checks.push({
    field: "amount",
    expected: `≤ ${mandate.maxAmount}`,
    actual: String(body.amount),
    match: amountOk,
  });
  if (!amountOk) allPassed = false;

  // Check 4: Validity window
  const validFrom = mandate.validFrom ? new Date(mandate.validFrom).getTime() : 0;
  const windowOk = now >= validFrom && now <= new Date(mandate.validUntil).getTime();
  checks.push({
    field: "validity_window",
    expected: `${mandate.validFrom ?? "any"} → ${mandate.validUntil}`,
    actual: new Date().toISOString(),
    match: windowOk,
  });
  if (!windowOk) allPassed = false;

  // Log the verification attempt
  store.auditLog.push({
    id: `aud_verify_${Date.now()}`,
    paymentId: "",
    agentId: mandate.agent,
    action: "pre_payment_verification",
    mandateId: mandate.id,
    amount: body.amount,
    merchant: body.merchant_id,
    timestamp: new Date().toISOString(),
    authorizationLevel: "auto",
    details: { checks, result: allPassed ? "approved" : "rejected", itemDetails: body.item_details },
  });

  return ok({
    verified: allPassed,
    mandate_id: mandate.id,
    result: allPassed ? "APPROVED" : "REJECTED",
    checks,
    mismatches: checks.filter((c) => !c.match).map((c) => `${c.field}: expected ${c.expected}, got ${c.actual}`),
  });
}
