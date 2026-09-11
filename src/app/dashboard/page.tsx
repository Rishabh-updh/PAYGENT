"use client";

import { useFetch } from "@/lib/use-fetch";

type DashboardData = {
  mandates: { id: string; agent: string; merchants: string[]; maxAmount: number; status: string }[];
  transactions: { id: string; agent: string; merchant: string; amount: number; status: string; time: string }[];
  agents: { id: string; name: string; trustScore: number; tier: string; effectiveLimit: number; frozen: boolean; totalPayments: number; disputeCount: number }[];
  stats: { totalMandates: number; activeMandates: number; totalTransactions: number; pendingEscalations: number; openDisputes: number };
  ledger: { seq: number; event: string; transactionId: string; entryHash: string; createdAt: string }[];
};

const STATUS_BADGE: Record<string, string> = {
  executed: "pg-badge-active",
  authorized: "pg-badge-active",
  awaiting_approval: "pg-badge-pending",
  pending: "pg-badge-pending",
  blocked: "pg-badge-blocked",
  reversed: "pg-badge-reversed",
};

export default function OverviewPage() {
  const { data, loading, error } = useFetch<DashboardData>("/api/dashboard");

  if (loading) return <div className="pg-loading">Loading overview…</div>;
  if (error) return <div className="pg-error">{error}</div>;
  if (!data) return <div className="pg-empty">No data available</div>;

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Overview</h1>
          <div className="pg-page-subtitle">PAYGENT payment reliability dashboard</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="pg-stats-row">
        <div className="pg-stat-card">
          <div className="pg-stat-label">Active Mandates</div>
          <div className="pg-stat-value pg-stat-accent">{data.stats.activeMandates}</div>
        </div>
        <div className="pg-stat-card">
          <div className="pg-stat-label">Total Transactions</div>
          <div className="pg-stat-value">{data.stats.totalTransactions}</div>
        </div>
        <div className="pg-stat-card">
          <div className="pg-stat-label">Pending Approvals</div>
          <div className="pg-stat-value" style={{ color: data.stats.pendingEscalations > 0 ? "var(--gold)" : undefined }}>
            {data.stats.pendingEscalations}
          </div>
        </div>
        <div className="pg-stat-card">
          <div className="pg-stat-label">Open Disputes</div>
          <div className="pg-stat-value" style={{ color: data.stats.openDisputes > 0 ? "#ff7070" : undefined }}>
            {data.stats.openDisputes}
          </div>
        </div>
      </div>

      {/* Agents summary */}
      <h2 className="pg-page-title" style={{ fontSize: 16, marginBottom: 14 }}>Agents</h2>
      <div className="pg-card-grid" style={{ marginBottom: 32 }}>
        {data.agents.map((agent) => (
          <div className="pg-card" key={agent.id} style={{ cursor: "default" }}>
            <div className="pg-card-header">
              <div>
                <div className="pg-card-title">{agent.name}</div>
                <div className="pg-card-meta">{agent.totalPayments} payments · {agent.disputeCount} disputes</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`pg-badge-tier pg-badge-tier-${agent.tier}`}>{agent.tier}</span>
                {agent.frozen && <span className="pg-badge pg-badge-frozen">FROZEN</span>}
              </div>
            </div>
            <div className="pg-field">
              <span className="pg-field-label">Trust Score</span>
              <span className="pg-field-value">{agent.trustScore}/100</span>
            </div>
            <div className="pg-field">
              <span className="pg-field-label">Effective Limit</span>
              <span className="pg-field-value">₹{(agent.effectiveLimit / 100).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <h2 className="pg-page-title" style={{ fontSize: 16, marginBottom: 14 }}>Recent Transactions</h2>
      {data.transactions.length === 0 ? (
        <div className="pg-empty">No transactions yet</div>
      ) : (
        <table className="pg-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Agent</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((txn) => (
              <tr key={txn.id}>
                <td style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 11 }}>{txn.id}</td>
                <td>{txn.agent}</td>
                <td>{txn.merchant}</td>
                <td>₹{(txn.amount / 100).toFixed(2)}</td>
                <td><span className={`pg-badge ${STATUS_BADGE[txn.status] ?? ""}`}>{txn.status.toUpperCase()}</span></td>
                <td style={{ color: "#6d7271" }}>{txn.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
