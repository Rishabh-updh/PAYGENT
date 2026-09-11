"use client";

import { useState } from "react";
import { useFetch, apiFetch } from "@/lib/use-fetch";

type Dispute = {
  id: string;
  paymentId: string;
  reason: string;
  evidence?: string;
  status: string;
  mandateViolation: boolean;
  processorRefundId?: string;
  createdAt: string;
  resolvedAt?: string;
};

type DisputeListData = { disputes: Dispute[] };

type AuditData = {
  payment: { id: string; agent: string; merchant: string; amount: number; status: string; mandateId: string };
  mandate: { id: string; agent: string; merchants: string[]; maxAmount: number; status: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "pg-badge-pending",
  auto_approved: "pg-badge-active",
  manual_review: "pg-badge-pending",
  completed: "pg-badge-active",
  rejected: "pg-badge-blocked",
};

export default function DisputesPage() {
  const { data, loading, error, refetch } = useFetch<DisputeListData>("/api/payments/dispute");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);

  const disputes = data?.disputes ?? [];

  const toggleExpand = async (dispute: Dispute) => {
    if (expandedId === dispute.id) {
      setExpandedId(null);
      setAuditData(null);
      return;
    }
    setExpandedId(dispute.id);
    try {
      const res = await fetch(`/api/payments/audit/${dispute.paymentId}`);
      const json = await res.json();
      setAuditData(json.success ? json.data : null);
    } catch { setAuditData(null); }
  };

  const handleRefund = async (paymentId: string) => {
    setRefunding(paymentId);
    await apiFetch(`/api/payments/refund/${paymentId}`, {
      body: JSON.stringify({ user_id: "dashboard_user" }),
    });
    setRefunding(null);
    refetch();
  };

  if (loading) return <div className="pg-loading">Loading disputes…</div>;
  if (error) return <div className="pg-error">{error}</div>;

  const open = disputes.filter((d) => d.status === "pending" || d.status === "manual_review" || d.status === "auto_approved");
  const resolved = disputes.filter((d) => d.status === "completed" || d.status === "rejected");

  return (
    <>
      <div className="pg-page-header">
        <div>
          <h1 className="pg-page-title">Disputes</h1>
          <div className="pg-page-subtitle">Refund claims and payment reversals</div>
        </div>
        {open.length > 0 && <span className="pg-badge pg-badge-pending">{open.length} OPEN</span>}
      </div>

      {disputes.length === 0 ? (
        <div className="pg-empty">
          <div style={{ fontSize: 32, marginBottom: 4 }}>⚖️</div>
          No disputes filed
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Open disputes first, then resolved */}
          {[...open, ...resolved].map((dispute) => {
            const isExpanded = expandedId === dispute.id;
            const canRefund = dispute.status !== "completed" && dispute.status !== "rejected";
            return (
              <div key={dispute.id}>
                <div className="pg-card" onClick={() => toggleExpand(dispute)}>
                  <div className="pg-card-header">
                    <div>
                      <div className="pg-card-title">{dispute.id}</div>
                      <div className="pg-card-meta">Payment: {dispute.paymentId}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {dispute.mandateViolation && (
                        <span className="pg-badge pg-badge-blocked" style={{ fontSize: 9 }}>VIOLATION</span>
                      )}
                      <span className={`pg-badge ${STATUS_BADGE[dispute.status] ?? ""}`}>
                        {dispute.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="pg-card-body">
                    <strong style={{ color: "#c0c5c3" }}>Reason:</strong> {dispute.reason}
                  </div>
                  {dispute.evidence && (
                    <div className="pg-card-body" style={{ marginTop: 4 }}>
                      <strong style={{ color: "#c0c5c3" }}>Evidence:</strong> {dispute.evidence}
                    </div>
                  )}
                  <div className="pg-card-meta" style={{ marginTop: 8 }}>
                    Filed {new Date(dispute.createdAt).toLocaleString()}
                    {dispute.resolvedAt && ` · Resolved ${new Date(dispute.resolvedAt).toLocaleString()}`}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pg-expanded-row">
                    {/* Payment & mandate details from audit */}
                    {auditData && (
                      <>
                        <div className="pg-modal-section-title">Payment Details</div>
                        <div className="pg-field">
                          <span className="pg-field-label">Agent</span>
                          <span className="pg-field-value">{auditData.payment.agent}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Merchant</span>
                          <span className="pg-field-value">{auditData.payment.merchant}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Amount</span>
                          <span className="pg-field-value">₹{(auditData.payment.amount / 100).toFixed(2)}</span>
                        </div>
                        <div className="pg-field">
                          <span className="pg-field-label">Status</span>
                          <span className="pg-field-value">{auditData.payment.status}</span>
                        </div>

                        {auditData.mandate && (
                          <div style={{ marginTop: 14 }}>
                            <div className="pg-modal-section-title">Mandate Comparison</div>
                            <div className="pg-field">
                              <span className="pg-field-label">Mandate Scope</span>
                              <span className="pg-field-value">{auditData.mandate.merchants.join(", ")}</span>
                            </div>
                            <div className="pg-field">
                              <span className="pg-field-label">Mandate Ceiling</span>
                              <span className="pg-field-value">₹{(auditData.mandate.maxAmount / 100).toFixed(2)}</span>
                            </div>
                            <div className="pg-field">
                              <span className="pg-field-label">Charged Amount</span>
                              <span className="pg-field-value" style={{
                                color: auditData.payment.amount > auditData.mandate.maxAmount ? "#ff7070" : "var(--emerald)",
                              }}>
                                ₹{(auditData.payment.amount / 100).toFixed(2)}
                                {auditData.payment.amount <= auditData.mandate.maxAmount ? " ✓ MATCH" : " ✕ EXCEEDS"}
                              </span>
                            </div>
                            <div className="pg-field">
                              <span className="pg-field-label">Merchant Match</span>
                              <span className="pg-field-value" style={{
                                color: auditData.mandate.merchants.includes(auditData.payment.merchant) ? "var(--emerald)" : "#ff7070",
                              }}>
                                {auditData.mandate.merchants.includes(auditData.payment.merchant) ? "✓ IN SCOPE" : "✕ OUT OF SCOPE"}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {dispute.processorRefundId && (
                      <div className="pg-field" style={{ marginTop: 10 }}>
                        <span className="pg-field-label">Processor Refund ID</span>
                        <span className="pg-field-value">{dispute.processorRefundId}</span>
                      </div>
                    )}

                    {canRefund && (
                      <div className="pg-btn-row" style={{ marginTop: 16 }}>
                        <button
                          className="pg-btn pg-btn-danger"
                          disabled={refunding === dispute.paymentId}
                          onClick={(e) => { e.stopPropagation(); handleRefund(dispute.paymentId); }}
                        >
                          {refunding === dispute.paymentId ? "Processing…" : "⟲ Refund Payment"}
                        </button>
                      </div>
                    )}
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
