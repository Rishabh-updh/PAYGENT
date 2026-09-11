"use client";

import { useState } from "react";

// Drop this file at: src/app/dashboard/agent-sim/page.tsx in your PAYGENT project
// It will then appear at /dashboard/agent-sim

type DecideResult = {
  decision?: {
    should_purchase: boolean;
    item: string | null;
    merchant: string | null;
    price: number | null;
    reasoning: string;
  };
  executed?: boolean;
  payment?: unknown;
  error?: string;
};

export default function AgentSimPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecideResult | null>(null);

  const runAgent = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/agents/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "ShopBot",
          scenario: "Toothpaste stock is at 0 units, restock threshold is 5 units.",
          mandate_id: "mnd_shopbot", // must match a real mandate id already in your store
          merchants: ["blinkit.com", "zeptonow.com"],
          max_amount: 2000,
        }),
      });
      const json = (await res.json()) as DecideResult;
      setResult(json);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Request failed" });
    }
    setLoading(false);
  };

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Agent Simulation</h1>
          <div className="pg-page-subtitle">Trigger a live multi-agent purchase decision</div>
        </div>
      </div>

      <button className="pg-btn pg-btn-primary" onClick={runAgent} disabled={loading}>
        {loading ? "Agents are reasoning…" : "⚡ Simulate Low-Stock Event"}
      </button>

      {result?.error && <div className="pg-error" style={{ marginTop: 16 }}>{result.error}</div>}

      {result?.decision && (
        <div className="pg-card" style={{ marginTop: 24, cursor: "default" }}>
          <div className="pg-card-header">
            <div className="pg-card-title">Agent Reasoning</div>
          </div>
          <div className="pg-card-body" style={{ lineHeight: 1.8 }}>{result.decision.reasoning}</div>
          <div className="pg-field">
            <span className="pg-field-label">Decision</span>
            <span className="pg-field-value">
              {result.decision.should_purchase
                ? `Buy ${result.decision.item} from ${result.decision.merchant} for ₹${((result.decision.price ?? 0) / 100).toFixed(2)}`
                : "No purchase needed"}
            </span>
          </div>
          {result.executed && (
            <div className="pg-field">
              <span className="pg-field-label">Payment Result</span>
              <span className="pg-field-value" style={{ fontFamily: "monospace", fontSize: 11 }}>
                {JSON.stringify(result.payment)}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
