"use client";

import { useState } from "react";
import { useFetch, apiFetch } from "@/lib/use-fetch";

type Escalation = {
  id: string;
  paymentId: string;
  mandateId: string;
  agentId: string;
  amount: number;
  merchant: string;
  reason: string;
  riskClass: string;
  status: string;
  createdAt: string;
};

type EscalationsData = { escalations: Escalation[] };

type AgentHistory = {
  agent: { name: string; trustScore: number; tier: string };
  transactions: { id: string; amount: number; merchant: string; status: string; time: string }[];
};

export default function ApprovalsPage() {
  const { data, loading, error, refetch } = useFetch<EscalationsData>("/api/payments/escalate");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [agentHistory, setAgentHistory] = useState<AgentHistory | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pending = data?.escalations?.filter((e) => e.status === "pending") ?? [];
  const resolved = data?.escalations?.filter((e) => e.status !== "pending") ?? [];

  const toggleExpand = async (esc: Escalation) => {
    if (expandedId === esc.id) {
      setExpandedId(null);
      setAgentHistory(null);
      return;
    }
    setExpandedId(esc.id);
    try {
      const res = await fetch(`/api/payments/agent/${esc.agentId}/history`);
      const json = await res.json();
      setAgentHistory(json.success ? json.data : null);
    } catch { setAgentHistory(null); }
  };

  const handleAction = async (escalationId: string, action: "approve" | "reject") => {
    setActionLoading(escalationId);
    await apiFetch(`/api/payments/confirm/${escalationId}`, {
      body: JSON.stringify({ action, user_id: "dashboard_user" }),
    });
    setActionLoading(null);
    setExpandedId(null);
    refetch();
  };

  if (loading) return <div className="pg-loading">Loading approvals…</div>;
  if (error) return <div className="pg-error">{error}</div>;

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Approvals</h1>
          <div className="pg-page-subtitle">Human-in-the-loop payment confirmation</div>
        </div>
        {pending.length > 0 && (
          <span className="pg-badge pg-badge-pending">{pending.length} PENDING</span>
        )}
      </div>

      {/* Pending approvals */}
      {pending.length === 0 ? (
        <div className="pg-empty">
          <div style={{ fontSize: 32, marginBottom: 4 }}>✓</div>
          No pending approvals
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {pending.map((esc) => (
            <div key={esc.id}>
              <div className="pg-card" onClick={() => toggleExpand(esc)}>
                <div className="pg-card-header">
                  <div>
                    <div className="pg-card-title">₹{(esc.amount / 100).toFixed(2)} → {esc.merchant}</div>
                    <div className="pg-card-meta">Agent: {esc.agentId} · {esc.id}</div>
                  </div>
                  <span className="pg-badge pg-badge-pending">{esc.riskClass.replace("_", " ").toUpperCase()}</span>
                </div>
                <div className="pg-card-body">
                  <strong style={{ color: "#c0c5c3" }}>Reason:</strong> {esc.reason}
                </div>
                <div className="pg-card-meta" style={{ marginTop: 8 }}>
                  {new Date(esc.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Expanded context */}
              {expandedId === esc.id && (
                <div className="pg-expanded-row">
                  {/* Mandate info */}
                  <div className="pg-modal-section-title" style={{ marginBottom: 8 }}>Mandate Details</div>
                  <div className="pg-field">
                    <span className="pg-field-label">Mandate ID</span>
                    <span className="pg-field-value">{esc.mandateId}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Payment ID</span>
                    <span className="pg-field-value">{esc.paymentId}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Amount</span>
                    <span className="pg-field-value">₹{(esc.amount / 100).toFixed(2)}</span>
                  </div>
                  <div className="pg-field">
                    <span className="pg-field-label">Merchant</span>
                    <span className="pg-field-value">{esc.merchant}</span>
                  </div>

                  {/* Agent's recent transactions */}
                  {agentHistory && (
                    <div style={{ marginTop: 16 }}>
                      <div className="pg-modal-section-title">
                        Agent: {agentHistory.agent.name} (Score: {agentHistory.agent.trustScore}, Tier {agentHistory.agent.tier})
                      </div>
                      {agentHistory.transactions.slice(0, 10).map((t) => (
                        <div className="pg-field" key={t.id}>
                          <span className="pg-field-label">{t.id}</span>
                          <span className="pg-field-value">₹{(t.amount / 100).toFixed(2)} · {t.merchant} · {t.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Approve / Deny buttons */}
                  <div className="pg-btn-row" style={{ marginTop: 20 }}>
                    <button
                      className="pg-btn pg-btn-success"
                      disabled={actionLoading === esc.id}
                      onClick={(e) => { e.stopPropagation(); handleAction(esc.id, "approve"); }}
                    >
                      {actionLoading === esc.id ? "…" : "✓ Approve"}
                    </button>
                    <button
                      className="pg-btn pg-btn-danger"
                      disabled={actionLoading === esc.id}
                      onClick={(e) => { e.stopPropagation(); handleAction(esc.id, "reject"); }}
                    >
                      {actionLoading === esc.id ? "…" : "✕ Deny"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <>
          <h2 className="pg-page-title" style={{ fontSize: 16, marginBottom: 14 }}>Resolved</h2>
          <table className="pg-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Agent</th>
                <th>Amount</th>
                <th>Risk</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((esc) => (
                <tr key={esc.id}>
                  <td style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 11 }}>{esc.id}</td>
                  <td>{esc.agentId}</td>
                  <td>₹{(esc.amount / 100).toFixed(2)}</td>
                  <td>{esc.riskClass}</td>
                  <td>
                    <span className={`pg-badge ${esc.status === "approved" ? "pg-badge-active" : "pg-badge-blocked"}`}>
                      {esc.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
