"use client";

import { useState } from "react";

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

const LOW_STOCK_SCENARIOS = [
  { scenario: "Toothpaste stock is at 0 units. Restock threshold is 5 units.", max_amount: 2000 },
  { scenario: "Office Coffee beans are empty. Current stock: 0 packs, restock threshold: 3 packs.", max_amount: 1800 },
  { scenario: "Printer Ink cartridge is at 0%. No replacement in inventory, restock threshold: 1 unit.", max_amount: 3500 },
  { scenario: "A4 Paper bundles are out of stock. Current stock: 0 reams, restock threshold: 5 reams.", max_amount: 2200 },
  { scenario: "Handwash dispensers are empty across all restrooms. Current stock: 0 bottles, restock threshold: 4 bottles.", max_amount: 1200 },
];

function pickRandomScenario() {
  const base = LOW_STOCK_SCENARIOS[Math.floor(Math.random() * LOW_STOCK_SCENARIOS.length)];
  // Randomize max_amount by ±20%
  const jitter = 0.8 + Math.random() * 0.4;
  return { ...base, max_amount: Math.round(base.max_amount * jitter) };
}

export default function AgentSimPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecideResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const runAgent = async () => {
    setLoading(true);
    setResult(null);
    const picked = pickRandomScenario();
    setActiveScenario(picked.scenario);
    try {
      const res = await fetch("/api/agents/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "ShopBot",
          scenario: picked.scenario,
          mandate_id: "mnd_shopbot",
          merchants: ["blinkit.com", "zeptonow.com", "amazon.in", "instamart.com"],
          max_amount: picked.max_amount,
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
          <h1 className="pg-page-title" style={{ fontSize: "clamp(36px, 5vw, 52px)" }}>Agent Simulation</h1>
          <div className="pg-page-subtitle" style={{ fontSize: 18, marginTop: 6 }}>Trigger a live multi-agent purchase decision</div>
        </div>
      </div>

      <button
        className="pg-btn pg-btn-primary"
        onClick={runAgent}
        disabled={loading}
        style={{ padding: "18px 40px", fontSize: 18, fontWeight: 700, letterSpacing: ".06em" }}
      >
        {loading ? "Agents are reasoning…" : "⚡ Simulate Low-Stock Event"}
      </button>

      {activeScenario && (
        <div style={{ marginTop: 20, fontSize: 18, lineHeight: 1.6, fontFamily: "var(--font-geist-mono, monospace)" }}>
          <span style={{ fontWeight: 700, color: "var(--cyan, #72e9e1)" }}>SCENARIO: </span>
          <span style={{ color: "#e0e5e4" }}>{activeScenario}</span>
        </div>
      )}

      {result?.error && <div className="pg-error" style={{ marginTop: 16, fontSize: 16 }}>{result.error}</div>}

      {result?.decision && (
        <div className="pg-card" style={{ marginTop: 28, padding: 36, cursor: "default" }}>
          <div className="pg-card-header">
            <div className="pg-card-title" style={{ fontSize: 24, fontWeight: 600, color: "var(--cyan, #72e9e1)" }}>Agent Reasoning</div>
          </div>
          <div className="pg-card-body" style={{ lineHeight: 1.9, fontSize: 17, color: "#c3d5d2", marginTop: 12 }}>{result.decision.reasoning}</div>
          <div className="pg-field" style={{ marginTop: 20 }}>
            <span className="pg-field-label" style={{ fontSize: 20, fontWeight: 600, color: "#e0e5e4" }}>Decision</span>
            <span className="pg-field-value" style={{ fontSize: 17, lineHeight: 1.7 }}>
              {result.decision.should_purchase
                ? `Buy ${result.decision.item} from ${result.decision.merchant} for ₹${((result.decision.price ?? 0) / 100).toFixed(2)}`
                : "No purchase needed"}
            </span>
          </div>
          {result.executed && (
            <div className="pg-field" style={{ marginTop: 16 }}>
              <span className="pg-field-label" style={{ fontSize: 20, fontWeight: 600, color: "#e0e5e4" }}>Payment Result</span>
              <span className="pg-field-value" style={{ fontFamily: "monospace", fontSize: 15, lineHeight: 1.7 }}>
                {JSON.stringify(result.payment)}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
