import { getStore } from "@/lib/payfence-store";
import { ok } from "@/lib/api-response";

export function GET() {
  const store = getStore();
  return ok({
    mandates: store.mandates,
    transactions: store.transactions.slice(0, 20),
    ledger: store.ledger,
    agents: store.agents.map((a) => ({
      id: a.id,
      name: a.name,
      trustScore: a.trustScore,
      tier: a.tier,
      effectiveLimit: a.effectiveLimit,
      frozen: a.frozen,
      totalPayments: a.totalPayments,
      disputeCount: a.disputeCount,
    })),
    escalations: store.escalations.filter((e) => e.status === "pending"),
    stats: {
      totalMandates: store.mandates.length,
      activeMandates: store.mandates.filter((m) => m.status === "active").length,
      totalTransactions: store.transactions.length,
      pendingEscalations: store.escalations.filter((e) => e.status === "pending").length,
      openDisputes: store.refundRequests.filter((r) => r.status === "pending" || r.status === "manual_review").length,
    },
  });
}
