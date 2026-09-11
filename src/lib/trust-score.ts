import type { AgentProfile } from "./payfence-store";

export type TrustTier = "A" | "B" | "C" | "D";

const PENALTY_FACTOR = 25; // weight of disputes in score reduction

const BASE_LIMITS: Record<TrustTier, number> = {
  A: 15000, // ₹150.00 in paise
  B: 10000, // ₹100.00
  C: 5000,  // ₹50.00
  D: 2000,  // ₹20.00
};

/**
 * Compute a trust score from 0-100 based on payment history.
 */
export function computeTrustScore(agent: AgentProfile): number {
  if (agent.totalPayments === 0) return 85; // new agents start at B tier

  const successRate = (agent.successfulPayments / agent.totalPayments) * 100;
  const disputePenalty = (agent.disputeCount / agent.totalPayments) * PENALTY_FACTOR;
  const score = Math.max(0, Math.min(100, Math.round(successRate - disputePenalty)));
  return score;
}

/**
 * Determine tier from trust score.
 */
export function getTier(score: number): TrustTier {
  if (score >= 95) return "A";
  if (score >= 85) return "B";
  if (score >= 70) return "C";
  return "D";
}

/**
 * Get the effective spending limit for an agent based on their tier.
 */
export function getEffectiveLimit(tier: TrustTier): number {
  return BASE_LIMITS[tier];
}

/**
 * Recompute trust score, tier, and effective limit for an agent.
 * Returns the updated agent profile (mutates in place).
 */
export function refreshAgentProfile(agent: AgentProfile): AgentProfile {
  agent.trustScore = computeTrustScore(agent);
  agent.tier = getTier(agent.trustScore);
  agent.effectiveLimit = getEffectiveLimit(agent.tier);
  return agent;
}

/**
 * Get a breakdown of the trust score for display.
 */
export function getTrustBreakdown(agent: AgentProfile) {
  const successRate = agent.totalPayments > 0
    ? ((agent.successfulPayments / agent.totalPayments) * 100).toFixed(1)
    : "N/A";
  const disputeRate = agent.totalPayments > 0
    ? ((agent.disputeCount / agent.totalPayments) * 100).toFixed(1)
    : "0.0";

  return {
    agentId: agent.id,
    name: agent.name,
    trustScore: agent.trustScore,
    tier: agent.tier,
    effectiveLimit: agent.effectiveLimit,
    frozen: agent.frozen,
    metrics: {
      totalPayments: agent.totalPayments,
      successfulPayments: agent.successfulPayments,
      disputeCount: agent.disputeCount,
      disputeAmountTotal: agent.disputeAmountTotal,
      successRate: `${successRate}%`,
      disputeRate: `${disputeRate}%`,
    },
    tierThresholds: {
      A: "≥ 95",
      B: "≥ 85",
      C: "≥ 70",
      D: "< 70",
    },
  };
}
