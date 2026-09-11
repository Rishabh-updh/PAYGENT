import { getStore } from "@/lib/payfence-store";
import { ok, fail } from "@/lib/api-response";
import type { NextRequest } from "next/server";

/**
 * GET /api/payments/mandate/[id] — retrieve a single mandate
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const mandate = store.mandates.find((m) => m.id === id);

  if (!mandate) {
    return fail("NOT_FOUND", `Mandate ${id} not found`, 404);
  }

  // Compute live status
  const now = Date.now();
  const liveStatus = mandate.status === "active" && new Date(mandate.validUntil).getTime() < now
    ? "expired" as const
    : mandate.status;

  // Gather related transactions
  const transactions = store.transactions.filter((t) => t.mandateId === id);
  const totalSpent = transactions
    .filter((t) => t.status === "executed" || t.status === "authorized")
    .reduce((sum, t) => sum + t.amount, 0);

  return ok({
    mandate: { ...mandate, status: liveStatus },
    usage: {
      total_spent: totalSpent,
      remaining: Math.max(0, mandate.maxAmount - totalSpent),
      transaction_count: transactions.length,
    },
    transactions: transactions.slice(0, 20),
  });
}
