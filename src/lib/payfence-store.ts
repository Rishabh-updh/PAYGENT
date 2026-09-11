import { createHash, createHmac, randomUUID } from "node:crypto";

export type TransactionStatus = "pending" | "authorized" | "executed" | "awaiting_approval" | "blocked" | "reversed";

export type Transaction = {
  id: string;
  agent: string;
  merchant: string;
  amount: number;
  status: TransactionStatus;
  time: string;
  idempotencyKey: string;
  mandateId: string;
  instructionId?: string;
  authorizationLevel?: "auto" | "manual" | "escalated";
  item?: { sku: string; price: number };
};

export type Mandate = {
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

export type EscalationStatus = "pending" | "approved" | "rejected" | "expired";

export type Escalation = {
  id: string;
  paymentId: string;
  mandateId: string;
  agentId: string;
  amount: number;
  merchant: string;
  reason: string;
  riskClass: string;
  status: EscalationStatus;
  userResponse?: string;
  responseTimestamp?: string;
  createdAt: string;
  /* Store the full pending transaction data so we can execute on approval */
  pendingTransaction?: Transaction;
};

export type RefundStatus = "pending" | "auto_approved" | "manual_review" | "completed" | "rejected";

export type RefundRequest = {
  id: string;
  paymentId: string;
  reason: string;
  evidence?: string;
  status: RefundStatus;
  mandateViolation: boolean;
  processorRefundId?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type AuditEntry = {
  id: string;
  paymentId: string;
  agentId: string;
  action: string;
  mandateId: string;
  amount: number;
  merchant: string;
  timestamp: string;
  authorizationLevel: "auto" | "manual" | "escalated";
  userId?: string;
  instructionId?: string;
  details: Record<string, unknown>;
};

export type AgentProfile = {
  id: string;
  name: string;
  trustScore: number;
  tier: "A" | "B" | "C" | "D";
  effectiveLimit: number;
  totalPayments: number;
  successfulPayments: number;
  disputeCount: number;
  disputeAmountTotal: number;
  frozen: boolean;
};

type Store = {
  mandates: Mandate[];
  transactions: Transaction[];
  usedIdempotencyKeys: Map<string, string>;
  ledger: { seq: number; event: string; transactionId: string; entryHash: string; prevHash: string; createdAt: string }[];
  escalations: Escalation[];
  refundRequests: RefundRequest[];
  auditLog: AuditEntry[];
  agents: AgentProfile[];
};

const globalStore = globalThis as typeof globalThis & { payFenceStore?: Store };

export function createMandateToken(mandateId: string, agent: string, merchants: string[], maxAmount: number, validUntil: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: "payfence", mnd: mandateId, agt: agent, scope: merchants, amt: maxAmount, exp: Math.floor(new Date(validUntil).getTime() / 1000) })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = createHmac("sha256", process.env.JWT_SECRET ?? "payfence-demo-secret").update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function makeSeedStore(): Store {
  const firstMandate: Mandate = {
    id: "mnd_shopbot",
    agent: "ShopBot",
    merchants: ["blinkit.com", "zeptonow.com"],
    maxAmount: 2000,
    validUntil: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
    validFrom: new Date().toISOString(),
    status: "active",
    token: "",
    createdAt: new Date().toISOString(),
  };
  firstMandate.token = createMandateToken(firstMandate.id, firstMandate.agent, firstMandate.merchants, firstMandate.maxAmount, firstMandate.validUntil);
  const secondMandate: Mandate = {
    id: "mnd_travelgenie",
    agent: "TravelGenie",
    merchants: ["makemytrip.com"],
    maxAmount: 10000,
    validUntil: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
    validFrom: new Date().toISOString(),
    status: "active",
    token: "",
    createdAt: new Date().toISOString(),
  };
  secondMandate.token = createMandateToken(secondMandate.id, secondMandate.agent, secondMandate.merchants, secondMandate.maxAmount, secondMandate.validUntil);
  return {
    mandates: [firstMandate, secondMandate],
    transactions: [
      { id: "txn_8f2a", agent: "ShopBot", merchant: "blinkit.com", amount: 1240, status: "executed", time: "Just now", idempotencyKey: "seed_8f2a", mandateId: firstMandate.id, authorizationLevel: "auto" },
      { id: "txn_8f19", agent: "TravelGenie", merchant: "makemytrip.com", amount: 7800, status: "awaiting_approval", time: "2 min ago", idempotencyKey: "seed_8f19", mandateId: secondMandate.id, authorizationLevel: "escalated" },
      { id: "txn_8e91", agent: "ShopBot", merchant: "zeptonow.com", amount: 860, status: "executed", time: "8 min ago", idempotencyKey: "seed_8e91", mandateId: firstMandate.id, authorizationLevel: "auto" },
      { id: "txn_8e77", agent: "TravelGenie", merchant: "makemytrip.com", amount: 4200, status: "executed", time: "14 min ago", idempotencyKey: "seed_8e77", mandateId: secondMandate.id, authorizationLevel: "auto" },
    ],
    usedIdempotencyKeys: new Map(),
    ledger: [],
    escalations: [],
    refundRequests: [],
    auditLog: [],
    agents: [
      { id: "agent_shopbot", name: "ShopBot", trustScore: 92, tier: "B", effectiveLimit: 10000, totalPayments: 24, successfulPayments: 23, disputeCount: 1, disputeAmountTotal: 450, frozen: false },
      { id: "agent_travelgenie", name: "TravelGenie", trustScore: 88, tier: "B", effectiveLimit: 10000, totalPayments: 18, successfulPayments: 17, disputeCount: 1, disputeAmountTotal: 2200, frozen: false },
    ],
  };
}

export function getStore() {
  const store = globalStore.payFenceStore;
  if (
    !store ||
    !Array.isArray(store.mandates) ||
    !Array.isArray(store.transactions) ||
    !Array.isArray(store.ledger) ||
    !Array.isArray(store.escalations) ||
    !Array.isArray(store.refundRequests) ||
    !Array.isArray(store.auditLog) ||
    !Array.isArray(store.agents)
  ) {
    const seedStore = makeSeedStore();
    globalStore.payFenceStore = seedStore;
    return seedStore;
  }
  return store;
}

export function appendLedger(event: string, transactionId: string, payload: object) {
  const store = getStore();
  const previous = store.ledger.at(-1);
  const prevHash = previous?.entryHash ?? "0";
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const entryHash = createHash("sha256").update(`${prevHash}${canonical}`).digest("hex");
  store.ledger.push({ seq: store.ledger.length + 1, event, transactionId, entryHash, prevHash, createdAt: new Date().toISOString() });
}

export function verifyMandateToken(token: string, mandate: Mandate) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return false;
  const expected = createHmac("sha256", process.env.JWT_SECRET ?? "payfence-demo-secret").update(`${header}.${payload}`).digest("base64url");
  if (signature !== expected) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { mnd?: string; agt?: string; amt?: number; exp?: number };
    return claims.mnd === mandate.id && claims.agt === mandate.agent && claims.amt === mandate.maxAmount && typeof claims.exp === "number" && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function newTransactionId() {
  return `txn_${randomUUID().slice(0, 8)}`;
}

/* ── New helpers ── */

export function newId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">) {
  const store = getStore();
  const full: AuditEntry = {
    ...entry,
    id: newId("aud"),
    timestamp: new Date().toISOString(),
  };
  store.auditLog.push(full);
  return full;
}

export function findAgent(agentNameOrId: string): AgentProfile | undefined {
  const store = getStore();
  return store.agents.find(
    (a) => a.id === agentNameOrId || a.name === agentNameOrId || a.name.toLowerCase() === agentNameOrId.toLowerCase(),
  );
}

export function findOrCreateAgent(agentName: string): AgentProfile {
  const existing = findAgent(agentName);
  if (existing) return existing;
  const store = getStore();
  const agent: AgentProfile = {
    id: `agent_${agentName.toLowerCase().replace(/\s+/g, "_")}`,
    name: agentName,
    trustScore: 85,
    tier: "B",
    effectiveLimit: 10000,
    totalPayments: 0,
    successfulPayments: 0,
    disputeCount: 0,
    disputeAmountTotal: 0,
    frozen: false,
  };
  store.agents.push(agent);
  return agent;
}
