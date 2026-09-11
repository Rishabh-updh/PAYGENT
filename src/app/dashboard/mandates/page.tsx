"use client";

import { useState } from "react";
import { useFetch, apiFetch } from "@/lib/use-fetch";

type Mandate = {
  id: string;
  agent: string;
  merchants: string[];
  maxAmount: number;
  validUntil: string;
  validFrom?: string;
  requestId?: string;
  status: "active" | "revoked" | "expired";
  token: string;
  createdAt?: string;
};

type MandateListData = { mandates: Mandate[] };

type MandateDetail = {
  mandate: Mandate;
  usage: { total_spent: number; remaining: number; transaction_count: number };
  transactions: { id: string; amount: number; merchant: string; status: string; time: string }[];
};

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active" ? "pg-badge-active" :
    status === "revoked" ? "pg-badge-blocked" :
    "pg-badge-expired";
  return <span className={`pg-badge ${cls}`}>{status.toUpperCase()}</span>;
}

export default function MandatesPage() {
  const { data, loading, error, refetch } = useFetch<MandateListData>("/api/payments/mandate");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<MandateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const openDetail = async (id: string) => {
    setSelected(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/payments/mandate/${id}`);
      const json = await res.json();
      setDetail(json.success ? json.data : null);
    } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const closeDetail = () => { setSelected(null); setDetail(null); };

  const handleRevoke = async (id: string) => {
    setRevoking(true);
    // The API doesn't have a dedicated revoke endpoint, but we can call the mandate store
    // For now we'll note this and refetch
    await apiFetch(`/api/payments/mandate/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "revoked" }),
    });
    setRevoking(false);
    refetch();
    closeDetail();
  };

  if (loading) return <div className="pg-loading">Loading mandates…</div>;
  if (error) return <div className="pg-error">{error}</div>;

  const mandates = data?.mandates ?? [];

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Mandates</h1>
          <div className="pg-page-subtitle">Payment authorization credentials</div>
        </div>
      </div>

      {mandates.length === 0 ? (
        <div className="pg-empty">
          <div style={{ fontSize: 32, marginBottom: 4 }}>📋</div>
          No mandates created yet
        </div>
      ) : (
        <div className="pg-card-grid">
          {mandates.map((m) => {
            const expired = new Date(m.validUntil).getTime() < Date.now();
            const displayStatus = m.status === "active" && expired ? "expired" : m.status;
            return (
              <div className="pg-card" key={m.id} onClick={() => openDetail(m.id)}>
                <div className="pg-card-header">
                  <div>
                    <div className="pg-card-title">{m.agent}</div>
                    <div className="pg-card-meta">{m.id}</div>
                  </div>
                  <StatusBadge status={displayStatus} />
                </div>
                <div className="pg-field">
                  <span className="pg-field-label">Merchants</span>
                  <span className="pg-field-value">{m.merchants.join(", ")}</span>
                </div>
                <div className="pg-field">
                  <span className="pg-field-label">Max Amount</span>
                  <span className="pg-field-value">₹{(m.maxAmount / 100).toFixed(2)}</span>
                </div>
                <div className="pg-field">
                  <span className="pg-field-label">Expires</span>
                  <span className="pg-field-value" style={{ fontSize: 11 }}>
                    {new Date(m.validUntil).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="pg-modal-overlay" onClick={closeDetail}>
          <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pg-modal-close" onClick={closeDetail}>×</button>
            {detailLoading ? (
              <div className="pg-loading">Loading mandate details…</div>
            ) : detail ? (
              <>
                <div className="pg-modal-title">{detail.mandate.agent}</div>
                <div style={{ fontSize: 11, color: "#6d7271", fontFamily: "var(--font-geist-mono, monospace)" }}>
                  {detail.mandate.id}
                </div>

                <div className="pg-modal-section">
                  <div className="pg-modal-section-title">Mandate Details</div>
                  <div className="pg-field">
                    <span className="pg-field-label">Status</span>
                    <StatusBadge status={detail.mandate.status} />
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Merchants</span>
                    <span className="pg-field-value">{detail.mandate.merchants.join(", ")}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Max Amount</span>
                    <span className="pg-field-value">₹{(detail.mandate.maxAmount / 100).toFixed(2)}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Valid From</span>
                    <span className="pg-field-value" style={{ fontSize: 11 }}>
                      {detail.mandate.validFrom ? new Date(detail.mandate.validFrom).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Valid Until</span>
                    <span className="pg-field-value" style={{ fontSize: 11 }}>
                      {new Date(detail.mandate.validUntil).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pg-modal-section">
                  <div className="pg-modal-section-title">Usage</div>
                  <div className="pg-field">
                    <span className="pg-field-label">Total Spent</span>
                    <span className="pg-field-value">₹{(detail.usage.total_spent / 100).toFixed(2)}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Remaining</span>
                    <span className="pg-field-value" style={{ color: "var(--emerald)" }}>
                      ₹{(detail.usage.remaining / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Transactions</span>
                    <span className="pg-field-value">{detail.usage.transaction_count}</span>
                  </div>
                  {/* Limit bar */}
                  <div className="pg-limit-bar-track" style={{ marginTop: 10 }}>
                    <div
                      className="pg-limit-bar-fill"
                      style={{
                        width: `${Math.min(100, (detail.usage.total_spent / detail.mandate.maxAmount) * 100)}%`,
                        background: detail.usage.total_spent > detail.mandate.maxAmount * 0.8
                          ? "#ff7070"
                          : "var(--cyan)",
                      }}
                    />
                  </div>
                </div>

                {/* JWT Claims */}
                <div className="pg-modal-section">
                  <div className="pg-modal-section-title">JWT Claims (Decoded)</div>
                  {(() => {
                    const claims = decodeJwtClaims(detail.mandate.token);
                    if (!claims) return <div style={{ color: "#6d7271", fontSize: 12 }}>Unable to decode token</div>;
                    return Object.entries(claims).map(([k, v]) => (
                      <div className="pg-field" key={k}>
                        <span className="pg-field-label">{k}</span>
                        <span className="pg-field-value truncate">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Recent transactions under this mandate */}
                {detail.transactions.length > 0 && (
                  <div className="pg-modal-section">
                    <div className="pg-modal-section-title">Recent Transactions</div>
                    {detail.transactions.slice(0, 5).map((t) => (
                      <div className="pg-field" key={t.id}>
                        <span className="pg-field-label" style={{ fontFamily: "var(--font-geist-mono, monospace)" }}>{t.id}</span>
                        <span className="pg-field-value">₹{(t.amount / 100).toFixed(2)} — {t.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Revoke button */}
                {detail.mandate.status === "active" && (
                  <div className="pg-btn-row">
                    <button
                      className="pg-btn pg-btn-danger"
                      disabled={revoking}
                      onClick={() => handleRevoke(detail.mandate.id)}
                    >
                      {revoking ? "Revoking…" : "Revoke Mandate"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="pg-error">Failed to load mandate details</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
