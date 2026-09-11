import type { AgentProfile } from "./payfence-store";

export type RiskClass = "low_risk" | "medium_risk" | "high_risk" | "requires_approval";

export type RiskResult = {
  riskClass: RiskClass;
  reasons: string[];
  escalationRequired: boolean;
};

/* ── Configurable thresholds ── */
const THRESHOLDS = {
  HIGH_AMOUNT: 5000,     // paise — amounts above this are high risk
  MEDIUM_AMOUNT: 1000,   // paise — amounts above this are medium risk
  LOW_TRUST_SCORE: 70,   // agents below this always require approval
  MEDIUM_TRUST_SCORE: 85,
};

/**
 * Classify a payment's risk level based on amount, agent trust, and context.
 */
export function classifyRisk(
  amount: number,
  agent: AgentProfile | undefined,
  isFirstMerchantTransaction: boolean,
): RiskResult {
  const reasons: string[] = [];
  let maxRisk: RiskClass = "low_risk";

  const escalate = (risk: RiskClass, reason: string) => {
    reasons.push(reason);
    const order: RiskClass[] = ["low_risk", "medium_risk", "high_risk", "requires_approval"];
    if (order.indexOf(risk) > order.indexOf(maxRisk)) maxRisk = risk;
  };

  // Amount-based classification
  if (amount > THRESHOLDS.HIGH_AMOUNT) {
    escalate("high_risk", `Amount ₹${(amount / 100).toFixed(2)} exceeds high-risk threshold`);
  } else if (amount > THRESHOLDS.MEDIUM_AMOUNT) {
    escalate("medium_risk", `Amount ₹${(amount / 100).toFixed(2)} exceeds medium-risk threshold`);
  }

  // Agent trust-based classification
  if (agent) {
    if (agent.trustScore < THRESHOLDS.LOW_TRUST_SCORE) {
      escalate("requires_approval", `Agent trust score ${agent.trustScore} is below ${THRESHOLDS.LOW_TRUST_SCORE}`);
    } else if (agent.trustScore < THRESHOLDS.MEDIUM_TRUST_SCORE) {
      escalate("medium_risk", `Agent trust score ${agent.trustScore} is below ${THRESHOLDS.MEDIUM_TRUST_SCORE}`);
    }

    if (agent.frozen) {
      escalate("requires_approval", "Agent is currently frozen");
    }
  }

  // First-time merchant
  if (isFirstMerchantTransaction) {
    escalate("medium_risk", "First transaction with this merchant");
  }

  if (reasons.length === 0) {
    reasons.push("Transaction within normal parameters");
  }

  return {
    riskClass: maxRisk,
    reasons,
    escalationRequired: maxRisk === "high_risk" || maxRisk === "requires_approval",
  };
}
