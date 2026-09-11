"use client";

import { useState } from "react";
import { useFetch } from "@/lib/use-fetch";

type LedgerEntry = {
  seq: number;
  event: string;
  transactionId: string;
  entryHash: string;
  prevHash: string;
  createdAt: string;
};

type Transaction = {
  id: string;
  agent: string;
  merchant: string;
  amount: number;
  status: string;
  time: string;
  idempotencyKey: string;
  mandateId: string;
  authorizationLevel?: string;
};

type DashboardData = {
  ledger: LedgerEntry[];
  transactions: Transaction[];
};

export default function LedgerPage() {
  const { data, loading, error } = useFetch<DashboardData>("/api/dashboard");
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);

  if (loading) return <div className="pg-loading">Loading ledger…</div>;
  if (error) return <div className="pg-error">{error}</div>;

  const ledger = data?.ledger ?? [];
  const transactions = data?.transactions ?? [];

  const findTxn = (id: string) => transactions.find((t) => t.id === id);

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Ledger</h1>
          <div className="pg-page-subtitle">Hash-chained audit trail — tamper-evident by design</div>
        </div>
        <span className="pg-badge pg-badge-active">{ledger.length} ENTRIES</span>
      </div>

      {ledger.length === 0 ? (
        <div className="pg-empty">
          <div style={{ fontSize: 32, marginBottom: 4 }}>📒</div>
          No ledger entries yet. Execute a payment to create the first entry.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ledger.map((entry) => {
            const isExpanded = expandedSeq === entry.seq;
            const txn = findTxn(entry.transactionId);
            return (
              <div key={entry.seq}>
                <div
                  className="pg-card"
                  style={{ padding: "14px 18px" }}
                  onClick={() => setExpandedSeq(isExpanded ? null : entry.seq)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--cyan)",
                      fontFamily: "var(--font-geist-mono, monospace)",
                      minWidth: 30,
                    }}>
                      #{entry.seq}
                    </span>
                    <span style={{ fontSize: 12, color: "#c0c5c3", flex: 1 }}>
                      <strong>{entry.event.toUpperCase()}</strong>
                      <span style={{ color: "#6d7271", marginLeft: 10 }}>{entry.transactionId}</span>
                    </span>
                    <span className="pg-hash" style={{ fontSize: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.entryHash.slice(0, 16)}…
                    </span>
                    <span style={{ fontSize: 10, color: "#5a6362" }}>
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pg-expanded-row">
                    <div className="pg-modal-section-title">Hash Chain</div>
                    <div className="pg-field">
                      <span className="pg-field-label">Entry Hash</span>
                      <span className="pg-hash" style={{ fontSize: 10, wordBreak: "break-all" }}>{entry.entryHash}</span>
                    </div>
                    <div className="pg-field">
                      <span className="pg-field-label">Previous Hash</span>
                      <span className="pg-hash" style={{ fontSize: 10, wordBreak: "break-all" }}>{entry.prevHash}</span>
                    </div>
                    <div className="pg-field">
                      <span className="pg-field-label">Sequence</span>
                      <span className="pg-field-value">{entry.seq}</span>
                    </div>
                    <div className="pg-field">
                      <span className="pg-field-label">Event</span>
                      <span className="pg-field-value">{entry.event}</span>
                    </div>
                    <div className="pg-field">
                      <span className="pg-field-label">Timestamp</span>
                      <span className="pg-field-value">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>

                    {txn && (
                      <div style={{ marginTop: 14 }}>
                        <div className="pg-modal-section-title">Transaction Payload</div>
                        <div className="pg-field">
                          <span className="pg-field-label">Agent</span>
                          <span className="pg-field-value">{txn.agent}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Merchant</span>
                          <span className="pg-field-value">{txn.merchant}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Amount</span>
                          <span className="pg-field-value">₹{(txn.amount / 100).toFixed(2)}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Status</span>
                          <span className="pg-field-value">{txn.status}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Mandate</span>
                          <span className="pg-field-value">{txn.mandateId}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Idempotency Key</span>
                          <span className="pg-field-value truncate">{txn.idempotencyKey}</span>
                        </div>
                        {txn.authorizationLevel && (
                          <div className="pg-field">
                            <span className="pg-field-label">Auth Level</span>
                            <span className="pg-field-value">{txn.authorizationLevel}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chain visualization */}
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(114,233,225,.04)", borderRadius: 8, fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}>
                      <span style={{ color: "#6d7271" }}>prevHash: </span>
                      <span className="pg-hash">{entry.prevHash === "0" ? "GENESIS" : entry.prevHash.slice(0, 20) + "…"}</span>
                      <span style={{ color: "#5a6362", margin: "0 8px" }}>→</span>
                      <span style={{ color: "#6d7271" }}>SHA256(prev + payload) = </span>
                      <span className="pg-hash">{entry.entryHash.slice(0, 20)}…</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
