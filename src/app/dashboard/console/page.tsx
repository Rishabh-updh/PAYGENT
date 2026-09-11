"use client";

import { useState, useRef } from "react";
import { useFetch } from "@/lib/use-fetch";

type Mandate = {
  id: string;
  agent: string;
  merchants: string[];
  maxAmount: number;
  status: string;
  token: string;
};

type MandateListData = { mandates: Mandate[] };

type StormResult = {
  index: number;
  replayed: boolean;
  transactionId?: string;
  status?: string;
  error?: string;
  raw: Record<string, unknown>;
};

export default function ConsolePage() {
  const { data: mandateData } = useFetch<MandateListData>("/api/payments/mandate");
  const [results, setResults] = useState<StormResult[]>([]);
  const [firing, setFiring] = useState(false);
  const [done, setDone] = useState(false);
  const resultCountRef = useRef(0);

  const activeMandates = mandateData?.mandates?.filter((m) => m.status === "active") ?? [];
  const mandate = activeMandates[0]; // Use first active mandate

  const fireStorm = async () => {
    if (!mandate) return;
    setFiring(true);
    setDone(false);
    setResults([]);
    resultCountRef.current = 0;

    const idempotencyKey = `storm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const merchant = mandate.merchants[0];
    const amount = Math.min(500, mandate.maxAmount); // ₹5.00 in paise or mandate max

    // Fire 5 concurrent requests with the SAME idempotencyKey
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch("/api/gateway/instruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandateToken: mandate.token,
          amount,
          merchant,
          idempotencyKey,
        }),
      })
        .then((res) => res.json())
        .then((json) => {
          const result: StormResult = {
            index: i + 1,
            replayed: json.replayed === true,
            transactionId: json.transaction?.id,
            status: json.transaction?.status,
            error: json.error,
            raw: json,
          };
          resultCountRef.current += 1;
          setResults((prev) => [...prev, result].sort((a, b) => a.index - b.index));
          if (resultCountRef.current >= 5) {
            setFiring(false);
            setDone(true);
          }
          return result;
        })
        .catch((err) => {
          const result: StormResult = {
            index: i + 1,
            replayed: false,
            error: err instanceof Error ? err.message : "Request failed",
            raw: {},
          };
          resultCountRef.current += 1;
          setResults((prev) => [...prev, result].sort((a, b) => a.index - b.index));
          if (resultCountRef.current >= 5) {
            setFiring(false);
            setDone(true);
          }
          return result;
        }),
    );

    await Promise.allSettled(promises);
  };

  const realCount = results.filter((r) => !r.replayed && !r.error).length;
  const replayedCount = results.filter((r) => r.replayed).length;

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Console — Storm Simulator</h1>
          <div className="pg-page-subtitle">Prove idempotency by firing concurrent retries</div>
        </div>
      </div>

      {/* Setup info */}
      <div className="pg-card" style={{ cursor: "default", marginBottom: 24 }}>
        <div className="pg-card-header">
          <div className="pg-card-title">How it works</div>
        </div>
        <div className="pg-card-body" style={{ lineHeight: 1.8 }}>
          Clicking the button fires <strong style={{ color: "var(--cyan)" }}>5 concurrent requests</strong> to{" "}
          <code style={{ color: "var(--gold)", background: "rgba(231,184,117,.1)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
            POST /api/gateway/instruct
          </code>{" "}
          with the <strong style={{ color: "var(--cyan)" }}>same idempotency key</strong>.
          The gateway should execute exactly <strong style={{ color: "var(--emerald)" }}>1 real transaction</strong> and return{" "}
          <strong style={{ color: "var(--gold)" }}>4 replayed results</strong>.
        </div>

        {mandate && (
          <div style={{ marginTop: 14 }}>
            <div className="pg-field">
              <span className="pg-field-label">Using Mandate</span>
              <span className="pg-field-value">{mandate.id} ({mandate.agent})</span>
            </div>
            <div className="pg-field">
              <span className="pg-field-label">Merchant</span>
              <span className="pg-field-value">{mandate.merchants[0]}</span>
            </div>
            <div className="pg-field">
              <span className="pg-field-label">Amount</span>
              <span className="pg-field-value">₹{(Math.min(500, mandate.maxAmount) / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fire button */}
      <button
        className="pg-btn pg-btn-primary"
        style={{ fontSize: 14, padding: "12px 28px", marginBottom: 24 }}
        disabled={firing || !mandate}
        onClick={fireStorm}
      >
        {firing ? "⚡ Firing…" : "⚡ Fire 5 Concurrent Retries"}
      </button>

      {!mandate && (
        <div className="pg-error" style={{ marginTop: 12 }}>
          No active mandate found. Create a mandate first via the Mandates page or API.
        </div>
      )}

      {/* Live result feed */}
      {results.length > 0 && (
        <div className="pg-storm-results">
          {results.map((r) => (
            <div
              key={r.index}
              className={`pg-storm-entry ${r.error ? "" : r.replayed ? "replayed" : "real"}`}
            >
              <span className={`pg-storm-dot ${r.error ? "" : r.replayed ? "replayed" : "real"}`} />
              <span style={{ color: "#6d7271", minWidth: 24 }}>#{r.index}</span>
              {r.error ? (
                <span style={{ color: "#ff7070" }}>Error: {r.error}</span>
              ) : (
                <>
                  <span style={{ color: r.replayed ? "var(--gold)" : "var(--emerald)" }}>
                    {r.replayed ? "REPLAYED" : "NEW TRANSACTION"}
                  </span>
                  <span style={{ color: "#6d7271", marginLeft: "auto" }}>{r.transactionId}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {done && (
        <div className="pg-storm-summary">
          5 attempts → {realCount} payment{realCount !== 1 ? "s" : ""}, {replayedCount} replayed
          {realCount === 1 && replayedCount === 4 && " ✓ IDEMPOTENCY PROVEN"}
        </div>
      )}
    </>
  );
}
