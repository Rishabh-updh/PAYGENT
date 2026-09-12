"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useFetch } from "@/lib/use-fetch";
import { IconAgent, IconApproval, IconDispute, IconHome, IconLedger, IconMandate, IconStorm } from "@/app/icons";
import "./dashboard.css";

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

const DASHBOARD_MODULES = [
  { href: "/dashboard", label: "Overview", eyebrow: "01 / CONTROL", description: "A live pulse of mandates, agents, approvals, and payment activity.", icon: IconHome, tone: "cyan" },
  { href: "/dashboard/mandates", label: "Mandates", eyebrow: "02 / AUTHORITY", description: "Bounded payment credentials with merchant, amount, and expiry controls.", icon: IconMandate, tone: "gold" },
  { href: "/dashboard/agents", label: "Agents", eyebrow: "03 / TRUST", description: "Trust tiers, effective limits, and instant global freeze controls.", icon: IconAgent, tone: "emerald" },
  { href: "/dashboard/approvals", label: "Approvals", eyebrow: "04 / HUMAN LOOP", description: "Payment decisions waiting for a clear, accountable approval.", icon: IconApproval, tone: "violet" },
  { href: "/dashboard/console", label: "Console", eyebrow: "05 / SIMULATE", description: "Stress-test idempotency and watch retries collapse into one payment.", icon: IconStorm, tone: "cyan" },
  { href: "/dashboard/ledger", label: "Ledger", eyebrow: "06 / PROOF", description: "Tamper-evident payment history with verifiable event hashes.", icon: IconLedger, tone: "gold" },
  { href: "/dashboard/disputes", label: "Disputes", eyebrow: "07 / RECONCILE", description: "Investigate exceptions and keep the trust layer honest.", icon: IconDispute, tone: "emerald" },
] as const;

function renderVisualElement(href: string) {
  switch (href) {
    case "/dashboard":
    case "/dashboard/overview":
      return (
        <div className="pg-visual-wrap">
          <div className="tel-bars spark-pulse" style={{ height: 38, marginTop: 0 }}>
            <div className="tel-bar" style={{ height: '40%' }}></div>
            <div className="tel-bar" style={{ height: '70%' }}></div>
            <div className="tel-bar" style={{ height: '50%' }}></div>
            <div className="tel-bar active" style={{ height: '90%' }}></div>
            <div className="tel-bar" style={{ height: '60%' }}></div>
            <div className="tel-bar" style={{ height: '80%' }}></div>
          </div>
        </div>
      );
    case "/dashboard/mandates":
      return (
        <div className="pg-visual-wrap">
          <div className="pg-visual-mandates">14 <span>ACTIVE</span></div>
        </div>
      );
    case "/dashboard/agents":
      return (
        <div className="pg-visual-wrap">
          <svg width="68" height="68" viewBox="0 0 36 36">
            <path stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path stroke="var(--emerald)" strokeWidth="3" strokeDasharray="78, 100" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <text x="18" y="21.5" fill="#c3d5d2" fontSize="9" fontFamily="var(--font-geist-mono, monospace)" textAnchor="middle">78%</text>
          </svg>
        </div>
      );
    case "/dashboard/approvals":
      return (
        <div className="pg-visual-wrap">
          <div className="pg-visual-approvals">3 <span>PENDING</span></div>
        </div>
      );
    case "/dashboard/console":
      return (
        <div className="pg-visual-wrap">
          <div className="pg-visual-console">
            <div className="pg-live-dot"></div>
            <div className="pg-waveform"><span></span><span></span><span></span><span></span></div>
          </div>
        </div>
      );
    case "/dashboard/ledger":
      return (
        <div className="pg-visual-wrap">
          <div className="pg-visual-ledger">...3a9b8f→21c9a</div>
        </div>
      );
    case "/dashboard/disputes":
      return (
        <div className="pg-visual-wrap">
          <div className="pg-visual-disputes">1 <span>OPEN</span></div>
        </div>
      );
    default:
      return null;
  }
}

export default function OverviewPage() {
  const { data, loading, error } = useFetch<DashboardData>("/api/dashboard");
  const [activeModule, setActiveModule] = useState<(typeof DASHBOARD_MODULES)[number] | null>(null);

  if (loading) return <div className="pg-loading">Loading overview…</div>;
  if (error) return <div className="pg-error">{error}</div>;
  if (!data) return <div className="pg-empty">No data available</div>;
  const ActiveModuleIcon = activeModule?.icon;

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Overview</h1>
          <div className="pg-page-subtitle">PAYGENT payment reliability dashboard</div>
        </div>
      </div>

      <section className="pg-module-deck" aria-label="Dashboard sections">
        <div className="pg-deck-heading">
          <span>RELIABILITY SURFACE</span>
          <span>SELECT A LAYER TO INSPECT</span>
        </div>
        <div className="pg-module-grid">
          {DASHBOARD_MODULES.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.button
                key={module.href}
                className={`pg-module-card pg-module-${module.tone}`}
                onClick={() => setActiveModule(module)}
                whileHover={{ y: -5, scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <span className="pg-module-index">0{index + 1}</span>
                <span className="pg-module-icon"><Icon /></span>
                <span className="pg-module-eyebrow">{module.eyebrow}</span>
                <span className="pg-module-label">{module.label}</span>
                <span className="pg-module-description">{module.description}</span>
                {renderVisualElement(module.href)}
                <span className="pg-module-open">OPEN LAYER <b>↗</b></span>
              </motion.button>
            );
          })}
        </div>
      </section>

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

      <AnimatePresence>
        {activeModule && (
          <motion.div className="pg-module-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModule(null)}>
            <motion.div
              className={`pg-module-modal pg-module-${activeModule.tone}`}
              initial={{ opacity: 0, scale: 0.82, y: 35, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.86, y: 25, rotateX: -8 }}
              transition={{ type: "spring", stiffness: 190, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button className="pg-modal-close" onClick={() => setActiveModule(null)} aria-label="Close layer">×</button>
              <div className="pg-module-modal-mark">{ActiveModuleIcon ? <ActiveModuleIcon /> : null}</div>
              <div className="pg-module-eyebrow">{activeModule.eyebrow}</div>
              <h2 className="pg-module-modal-title">{activeModule.label}</h2>
              <p className="pg-module-modal-copy">{activeModule.description}</p>
              <Link className="pg-btn pg-btn-primary" href={activeModule.href} onClick={() => setActiveModule(null)}>
                ENTER {activeModule.label.toUpperCase()} <span>↗</span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
