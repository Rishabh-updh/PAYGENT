import { NextResponse } from "next/server";
import { appendLedger, getStore, newTransactionId, verifyMandateToken } from "@/lib/payfence-store";

export async function POST(request: Request) {
  const body = await request.json() as { mandateToken?: string; amount?: number; merchant?: string; idempotencyKey?: string };
  if (!body.mandateToken || typeof body.amount !== "number" || !Number.isInteger(body.amount) || body.amount <= 0 || !body.merchant || !body.idempotencyKey) {
    return NextResponse.json({ code: "INVALID_REQUEST", error: "mandateToken, integer amount, merchant, and idempotencyKey are required" }, { status: 400 });
  }
  const { mandateToken, amount, merchant, idempotencyKey } = body;
  const store = getStore();
  const existingId = store.usedIdempotencyKeys.get(idempotencyKey);
  if (existingId) {
    const transaction = store.transactions.find((item) => item.id === existingId);
    if (transaction) return NextResponse.json({ transaction, replayed: true });
  }
  const mandate = store.mandates.find((item) => item.token === mandateToken);
  if (!mandate || mandate.status !== "active" || !verifyMandateToken(mandateToken, mandate)) {
    return NextResponse.json({ code: "MANDATE_INVALID", error: "Mandate is invalid, expired, or revoked" }, { status: 401 });
  }
  if (!mandate.merchants.includes(merchant)) return NextResponse.json({ code: "SCOPE_MISMATCH", error: "Merchant is outside the mandate scope" }, { status: 403 });
  if (amount > mandate.maxAmount) return NextResponse.json({ code: "LIMIT_EXCEEDED", error: "Amount exceeds the mandate ceiling" }, { status: 403 });
  const transaction = { id: newTransactionId(), agent: mandate.agent, merchant, amount, status: "authorized" as const, time: "Just now", idempotencyKey, mandateId: mandate.id };
  store.transactions.unshift(transaction);
  store.usedIdempotencyKeys.set(idempotencyKey, transaction.id);
  appendLedger("authorized", transaction.id, transaction);
  return NextResponse.json({ transaction, razorpayOrderId: `order_demo_${transaction.id}`, replayed: false });
}
