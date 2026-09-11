"use client";

import { useState } from "react";
import { useFetch, apiFetch } from "@/lib/use-fetch";

type Agent = {
  id: string;
  name: string;
  trustScore: number;
  tier: string;
  effectiveLimit: number;
  frozen: boolean;
  totalPayments: number;
  disputeCount: number;
};

type TrustBreakdown = {
  agentId: string;
  name: string;
  trustScore: number;
  tier: string;
  effectiveLimit: number;
  frozen: boolean;
  metrics: {
    totalPayments: number;
    successfulPayments: number;
    disputeCount: number;
    disputeAmountTotal: number;
    successRate: string;
    disputeRate: string;
  };
};

type DashboardData = { agents: Agent[] };

function TrustRing({ score, tier }: { score: number; tier: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    tier === "A" ? "var(--emerald)" :
    tier === "B" ? "var(--cyan)" :
    tier === "C" ? "var(--gold)" : "#ff7070";

  return (
    <div className="pg-trust-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <span className="pg-trust-ring-value">{score}</span>
    </div>
  );
}

export default function AgentsPage() {
  const { data, loading, error, refetch } = useFetch<DashboardData>("/api/dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TrustBreakdown | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const openDetail = async (agentId: string) => {
    setSelectedId(agentId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/trust-score`);
      const json = await res.json();
      setDetail(json.success ? json.data : null);
    } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const closeDetail = () => { setSelectedId(null); setDetail(null); };

  const handleFreeze = async (agentId: string, freeze: boolean) => {
    setActionLoading(true);
    await apiFetch(`/api/agents/${agentId}/freeze`, {
      body: JSON.stringify({ action: freeze ? "freeze" : "unfreeze" }),
    });
    // Refetch both the list and the detail
    refetch();
    const res = await fetch(`/api/agents/${agentId}/trust-score`);
    const json = await res.json();
    if (json.success) setDetail(json.data);
    setActionLoading(false);
  };

  if (loading) return <div className="pg-loading">Loading agents…</div>;
  if (error) return <div className="pg-error">{error}</div>;

  const agents = data?.agents ?? [];

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Agents</h1>
          <div className="pg-page-subtitle">Trust scores, tiers, and kill switches</div>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="pg-empty">
          <div style={{ fontSize: 32, marginBottom: 4 }}>🤖</div>
          No agents registered
        </div>
      ) : (
        <div className="pg-card-grid">
          {agents.map((agent) => {
            const limitPct = Math.min(100, (agent.trustScore / 100) * 100);
            const tierColor =
              agent.tier === "A" ? "var(--emerald)" :
              agent.tier === "B" ? "var(--cyan)" :
              agent.tier === "C" ? "var(--gold)" : "#ff7070";
            return (
              <div className="pg-card" key={agent.id} onClick={() => openDetail(agent.id)}>
                <div className="pg-card-header">
                  <div>
                    <div className="pg-card-title">{agent.name}</div>
                    <div className="pg-card-meta">{agent.id}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`pg-badge-tier pg-badge-tier-${agent.tier}`}>{agent.tier}</span>
                    {agent.frozen && <span className="pg-badge pg-badge-frozen">FROZEN</span>}
                  </div>
                </div>
                <div className="pg-field">
                  <span className="pg-field-label">Trust Score</span>
                  <span className="pg-field-value" style={{ color: tierColor }}>{agent.trustScore}/100</span>
                </div>
                <div className="pg-field">
                  <span className="pg-field-label">Effective Limit</span>
                  <span className="pg-field-value">₹{(agent.effectiveLimit / 100).toFixed(2)}</span>
                </div>
                <div className="pg-limit-bar-track">
                  <div
                    className="pg-limit-bar-fill"
                    style={{ width: `${limitPct}%`, background: tierColor }}
                  />
                </div>
                <div className="pg-field" style={{ marginTop: 6 }}>
                  <span className="pg-field-label">Payments / Disputes</span>
                  <span className="pg-field-value">{agent.totalPayments} / {agent.disputeCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <div className="pg-modal-overlay" onClick={closeDetail}>
          <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pg-modal-close" onClick={closeDetail}>×</button>
            {detailLoading ? (
              <div className="pg-loading">Loading agent details…</div>
            ) : detail ? (
              <>
                <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 8 }}>
                  <TrustRing score={detail.trustScore} tier={detail.tier} />
                  <div>
                    <div className="pg-modal-title">{detail.name}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                      <span className={`pg-badge-tier pg-badge-tier-${detail.tier}`}>{detail.tier}</span>
                      <span style={{ fontSize: 12, color: "#6d7271" }}>Tier {detail.tier}</span>
                      {detail.frozen && <span className="pg-badge pg-badge-frozen">FROZEN</span>}
                    </div>
                  </div>
                </div>

                <div className="pg-modal-section">
                  <div className="pg-modal-section-title">Trust Metrics</div>
                  <div className="pg-field">
                    <span className="pg-field-label">Trust Score</span>
                    <span className="pg-field-value">{detail.trustScore}/100</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Success Rate</span>
                    <span className="pg-field-value" style={{ color: "var(--emerald)" }}>{detail.metrics.successRate}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Dispute Rate</span>
                    <span className="pg-field-value" style={{ color: parseFloat(detail.metrics.disputeRate) > 5 ? "#ff7070" : "var(--gold)" }}>
                      {detail.metrics.disputeRate}
                    </span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Total Payments</span>
                    <span className="pg-field-value">{detail.metrics.totalPayments}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Successful</span>
                    <span className="pg-field-value">{detail.metrics.successfulPayments}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Disputes</span>
                    <span className="pg-field-value">{detail.metrics.disputeCount}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Dispute Amount Total</span>
                    <span className="pg-field-value">₹{(detail.metrics.disputeAmountTotal / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pg-modal-section">
                  <div className="pg-modal-section-title">Effective Limit</div>
                  <div className="pg-field">
                    <span className="pg-field-label">Limit</span>
                    <span className="pg-field-value">₹{(detail.effectiveLimit / 100).toFixed(2)}</span>
                  </div>
                  <div className="pg-limit-bar-track">
                    <div
                      className="pg-limit-bar-fill"
                      style={{
                        width: `${(detail.effectiveLimit / 15000) * 100}%`,
                        background: detail.tier === "A" ? "var(--emerald)" : detail.tier === "B" ? "var(--cyan)" : detail.tier === "C" ? "var(--gold)" : "#ff7070",
                      }}
                    />
                  </div>
                </div>

                <div className="pg-btn-row">
                  <button
                    className={`pg-btn ${detail.frozen ? "pg-btn-success" : "pg-btn-danger"}`}
                    disabled={actionLoading}
                    onClick={() => handleFreeze(detail.agentId, !detail.frozen)}
                  >
                    {actionLoading ? "Processing…" : detail.frozen ? "Unfreeze Agent" : "Freeze Agent"}
                  </button>
                </div>
              </>
            ) : (
              <div className="pg-error">Failed to load agent details</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
