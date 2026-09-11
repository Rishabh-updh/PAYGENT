import { NextResponse } from "next/server";
import { getStore } from "@/lib/payfence-store";

export function GET() {
  const store = getStore();
  return NextResponse.json({
    mandates: store.mandates,
    transactions: store.transactions.slice(0, 20),
    ledger: store.ledger,
    agents: [
      { id: "agent_shopbot", name: "ShopBot", trustScore: 92, tier: "A", effectiveLimit: 10000 },
      { id: "agent_travelgenie", name: "TravelGenie", trustScore: 88, tier: "B", effectiveLimit: 6000 },
    ],
  });
}
