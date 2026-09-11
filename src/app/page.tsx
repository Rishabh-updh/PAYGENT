"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconHome,
  IconMandate,
  IconAgent,
  IconApproval,
  IconStorm,
  IconLedger,
  IconDispute,
  IconShield,
  IconHelp,
  IconNotification,
  IconCommand,
  IconPlus,
  IconCheck,
  IconReplay,
  IconPower,
  IconMore,
  IconChevronDown,
  IconClose,
  IconArrowRight,
} from "./icons";

type NavItem = { label: string; icon: React.ReactNode };

const navItems: NavItem[] = [
  { label: "Overview", icon: <IconHome /> },
  { label: "Mandates", icon: <IconMandate /> },
  { label: "Agents", icon: <IconAgent /> },
  { label: "Approvals", icon: <IconApproval /> },
  { label: "Storm console", icon: <IconStorm /> },
  { label: "Ledger", icon: <IconLedger /> },
  { label: "Disputes", icon: <IconDispute /> },
];

const initialTransactions = [
  { id: "txn_8f2a", agent: "ShopBot", merchant: "blinkit.com", amount: 1240, status: "Executed", time: "Just now" },
  { id: "txn_8f19", agent: "TravelGenie", merchant: "makemytrip.com", amount: 7800, status: "Awaiting approval", time: "2 min ago" },
  { id: "txn_8e91", agent: "ShopBot", merchant: "zeptonow.com", amount: 860, status: "Executed", time: "8 min ago" },
  { id: "txn_8e77", agent: "TravelGenie", merchant: "makemytrip.com", amount: 4200, status: "Executed", time: "14 min ago" },
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [stormRunning, setStormRunning] = useState(false);
  const [stormResults, setStormResults] = useState<string[]>([]);
  const [shopBotFrozen, setShopBotFrozen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [mandates, setMandates] = useState(2);

  const executedVolume = useMemo(
    () => transactions.filter((tx) => tx.status === "Executed").reduce((total, tx) => total + tx.amount, 0),
    [transactions],
  );

  useEffect(() => {
    void fetch("/api/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error("Dashboard API request failed");
        return response.json() as Promise<{ mandates: unknown[]; transactions: typeof initialTransactions }>;
      })
      .then((data) => {
        setMandates(data.mandates.length);
        setTransactions(data.transactions.map((tx) => ({ ...tx, status: tx.status === "executed" ? "Executed" : "Awaiting approval" })));
      })
      .catch((error) => console.error("Unable to load dashboard state", error));
  }, []);

  async function runStorm() {
    if (stormRunning) return;
    setStormRunning(true);
    setStormResults([]);
    try {
      const dashboardResponse = await fetch("/api/dashboard");
      if (!dashboardResponse.ok) throw new Error("Could not load a demo mandate");
      const dashboard = await dashboardResponse.json() as { mandates: { agent: string; token: string }[] };
      const mandate = dashboard.mandates.find((item) => item.agent === "ShopBot");
      if (!mandate) throw new Error("ShopBot mandate is unavailable");
      const idempotencyKey = `storm_${crypto.randomUUID()}`;
      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          fetch("/api/gateway/instruct", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mandateToken: mandate.token, amount: 1240, merchant: "blinkit.com", idempotencyKey }),
          }).then(async (response) => {
            if (!response.ok) throw new Error("Gateway instruction failed");
            return response.json() as Promise<{ replayed: boolean }>;
          }),
        ),
      );
      setStormResults(responses.map((response) => response.replayed ? "replayed: true · returned cached transaction" : "authorized · Razorpay order created"));
      const refreshed = await fetch("/api/dashboard");
      if (!refreshed.ok) throw new Error("Could not refresh dashboard state");
      const data = await refreshed.json() as { transactions: typeof initialTransactions };
      setTransactions(data.transactions.map((tx) => ({ ...tx, status: tx.status === "executed" || tx.status === "authorized" ? "Executed" : "Awaiting approval" })));
    } catch (error) {
      console.error("Payment storm failed", error);
      setStormResults(["Gateway request failed — check the server logs"]);
    } finally {
      setStormRunning(false);
    }
  }

  async function createMandate() {
    try {
      const response = await fetch("/api/mandates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent: "ShopBot", merchants: ["blinkit.com"], maxAmount: 2000, validHours: 24 }),
      });
      if (!response.ok) throw new Error("Mandate creation failed");
      const data = await fetch("/api/dashboard").then((item) => item.json() as Promise<{ mandates: unknown[] }>);
      setMandates(data.mandates.length);
      setActive("Mandates");
    } catch (error) {
      console.error("Unable to create mandate", error);
    }
  }

  return (
    <main className="app-shell">
      {/* Dynamic gradient mesh background */}
      <div className="bg-mesh">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P</span><span>payfence</span></div>
        <div className="workspace-switcher"><span className="avatar avatar-blue">A</span><span><b>Aarav&apos;s workspace</b><small>Personal account</small></span><span className="chevron"><IconChevronDown width={14} height={14} /></span></div>
        <nav className="nav-list" aria-label="Primary navigation">
          <p className="nav-heading">WORKSPACE</p>
          {navItems.map((item) => (
            <button key={item.label} className={`nav-item ${active === item.label ? "active" : ""}`} onClick={() => setActive(item.label)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.label === "Approvals" && <span className="nav-count">1</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-card"><span className="shield"><IconShield width={18} height={18} /></span><div><b>Gateway protected</b><small>All systems operational</small></div><span className="pulse" /></div>
          <button className="nav-item"><span className="nav-icon"><IconHelp /></span>Help &amp; docs</button>
          <div className="profile"><span className="avatar avatar-purple">AR</span><span><b>Aarav Rao</b><small>Owner</small></span><span className="more"><IconMore width={16} height={16} /></span></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><div className="breadcrumb">Workspace <span>/</span> {active}</div><h1>{active}</h1></div>
          <div className="top-actions"><span className="live-dot" /> <span className="live-label">Live mode</span><button className="icon-button"><IconCommand width={12} height={12} /> K</button><button className="icon-button notification"><IconNotification width={18} height={18} /><i /></button><button className="avatar avatar-purple">AR</button></div>
        </header>

        <div className="page-body">
          <div className="hero-row">
            <div><p className="eyebrow">THURSDAY, SEPTEMBER 11, 2026</p><h2>Good afternoon, Aarav <span className="wave">✦</span></h2><p className="subtle">Here&apos;s what&apos;s happening across your payment gateway.</p></div>
            <button className="primary-button" onClick={createMandate}><span><IconPlus width={16} height={16} /></span> Create mandate</button>
          </div>

          <div className="stats-grid">
            <StatCard label="Protected volume" value={money(executedVolume)} delta="+12.8%" caption="vs. last 30 days" icon="₹" />
            <StatCard label="Transactions" value="248" delta="+18.4%" caption="vs. last 30 days" icon="↗" />
            <StatCard label="Blocked attempts" value="17" delta="−6.2%" positive={false} caption="vs. last 30 days" icon="⊘" />
            <StatCard label="Trust score" value="92 / 100" delta="Excellent" positive caption="ShopBot · Tier A" icon="✦" />
          </div>

          <div className="feature-grid">
            <section className="panel storm-panel">
              <div className="panel-header"><div><p className="eyebrow">DEMO CONSOLE</p><h3>Payment storm simulator</h3></div><span className="demo-badge">● Ready to demo</span></div>
              <p className="panel-description">Fire 5 concurrent retries with the same idempotency key. Prove that the gateway creates exactly one payment.</p>
              <div className="storm-metrics"><div><strong>5</strong><span>attempts</span></div><div className="metric-arrow">→</div><div className="metric-highlight"><strong>{stormResults.length ? "1" : "—"}</strong><span>payment</span></div><div className="metric-arrow">·</div><div><strong>{stormResults.length ? "1" : "—"}</strong><span>ledger entry</span></div></div>
              <div className="storm-footer"><div className="mini-agent"><span className="agent-logo">S</span><span><b>ShopBot</b><small>blinkit.com · ₹1,240</small></span></div><button className="secondary-button" onClick={runStorm} disabled={stormRunning}>{stormRunning ? "Running..." : "Run storm  →"}</button></div>
              {stormResults.length > 0 && <div className="storm-feed">{stormResults.map((result, index) => <div className="storm-line" key={`${result}-${index}`}><span className={index === 0 ? "check green" : "check"}>{index === 0 ? <IconCheck width={14} height={14} /> : <IconReplay width={14} height={14} />}</span><span>Attempt {index + 1}</span><code>{result}</code></div>)}</div>}
            </section>
            <section className="panel activity-panel">
              <div className="panel-header"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Live transaction feed</h3></div><button className="text-button" onClick={() => setActive("Ledger")}>View ledger →</button></div>
              <div className="transaction-list">{transactions.slice(0, 4).map((tx, index) => <div className="transaction" key={`${tx.id}-${tx.time}-${index}`}><span className={`tx-icon ${tx.agent === "ShopBot" ? "shop" : "travel"}`}>{tx.agent === "ShopBot" ? "S" : "T"}</span><div className="tx-detail"><b>{tx.merchant}</b><small>{tx.agent} · {tx.time}</small></div><div className="tx-amount"><b>{money(tx.amount)}</b><span className={`status ${tx.status === "Executed" ? "success" : "warning"}`}><i />{tx.status}</span></div></div>)}</div>
            </section>
          </div>

          <div className="lower-grid">
            <section className="panel mandates-panel"><div className="panel-header"><div><p className="eyebrow">ACCESS CONTROL</p><h3>Active mandates <span className="count-pill">{mandates}</span></h3></div><button className="text-button" onClick={() => setActive("Mandates")}>Manage →</button></div><div className="mandate-list"><MandateRow name="ShopBot" merchant="blinkit.com + 1 more" amount="₹2,000" expiry="Expires in 23h" icon="S" color="orange" /><MandateRow name="TravelGenie" merchant="makemytrip.com" amount="₹10,000" expiry="Expires in 47h" icon="T" color="purple" /></div></section>
            <section className="panel agent-panel"><div className="panel-header"><div><p className="eyebrow">TRUST BOARD</p><h3>Agent health</h3></div><button className="text-button" onClick={() => setActive("Agents")}>View agents →</button></div><div className="agent-health"><div className="health-agent"><span className="agent-logo">S</span><div><b>ShopBot</b><small>{shopBotFrozen ? "Frozen" : "Tier A · 92 trust score"}</small></div><span className={`tier ${shopBotFrozen ? "tier-frozen" : ""}`}>{shopBotFrozen ? "OFF" : "A"}</span></div><div className="progress-track"><span style={{ width: shopBotFrozen ? "0%" : "92%" }} /></div><div className="health-meta"><span>Effective limit</span><b>{shopBotFrozen ? "₹0" : "₹10,000"} <small>/ day</small></b></div></div><button className={`kill-switch ${shopBotFrozen ? "frozen" : ""}`} onClick={() => setShopBotFrozen((value) => !value)}>{shopBotFrozen ? "Unfreeze ShopBot" : "Freeze ShopBot"} <span><IconPower width={16} height={16} /></span></button></section>
          </div>

          <section className="banner"><div className="banner-icon"><IconCheck width={14} height={14} /></div><div><b>Your payment layer is active</b><p>Every agent instruction is verified, bounded, and written to an immutable audit trail.</p></div><div className="banner-actions"><button className="text-button" onClick={() => setActive("Ledger")}>Verify ledger integrity →</button><button className="close-banner"><IconClose width={16} height={16} /></button></div></section>

          <div className="quick-actions"><button onClick={() => setActive("Mandates")}><span><IconMandate width={18} height={18} /></span><b>New mandate</b><small>Grant scoped access</small><em><IconArrowRight width={14} height={14} /></em></button><button onClick={() => setActive("Approvals")}><span><IconApproval width={18} height={18} /></span><b>Review approvals</b><small>1 payment waiting</small><em><IconArrowRight width={14} height={14} /></em></button><button onClick={() => { setDisputeOpen(true); setActive("Disputes"); }}><span><IconDispute width={18} height={18} /></span><b>Dispute a payment</b><small>Start a resolution</small><em><IconArrowRight width={14} height={14} /></em></button></div>
          {disputeOpen && <div className="toast"><span><IconCheck width={16} height={16} /></span><div><b>Dispute workspace opened</b><small>Select a transaction to begin a refund.</small></div><button onClick={() => setDisputeOpen(false)}><IconClose width={16} height={16} /></button></div>}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, delta, caption, icon, positive = true }: { label: string; value: string; delta: string; caption: string; icon: string; positive?: boolean }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><div className="stat-bottom"><span className={positive ? "delta up" : "delta down"}>{delta}</span><span>{caption}</span></div></div>;
}

function MandateRow({ name, merchant, amount, expiry, icon, color }: { name: string; merchant: string; amount: string; expiry: string; icon: string; color: string }) {
  return <div className="mandate-row"><span className={`agent-logo ${color}`}>{icon}</span><div className="mandate-info"><b>{name}</b><small>{merchant}</small></div><div className="mandate-limit"><b>{amount}</b><small>ceiling</small></div><div className="mandate-expiry"><span className="active-dot" />{expiry}</div><button className="row-more"><IconMore width={14} height={14} /></button></div>;
}
