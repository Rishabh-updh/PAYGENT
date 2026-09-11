import { createHash, createHmac, randomUUID } from "node:crypto";

export type TransactionStatus = "pending" | "authorized" | "executed" | "awaiting_approval" | "blocked";

export type Transaction = {
  id: string;
  agent: string;
  merchant: string;
  amount: number;
  status: TransactionStatus;
  time: string;
  idempotencyKey: string;
  mandateId: string;
};

export type Mandate = {
  id: string;
  agent: string;
  merchants: string[];
  maxAmount: number;
  validUntil: string;
  status: "active" | "revoked";
  token: string;
};

type Store = {
  mandates: Mandate[];
  transactions: Transaction[];
  usedIdempotencyKeys: Map<string, string>;
  ledger: { seq: number; event: string; transactionId: string; entryHash: string; prevHash: string; createdAt: string }[];
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
    status: "active",
    token: "",
  };
  firstMandate.token = createMandateToken(firstMandate.id, firstMandate.agent, firstMandate.merchants, firstMandate.maxAmount, firstMandate.validUntil);
  const secondMandate: Mandate = {
    id: "mnd_travelgenie",
    agent: "TravelGenie",
    merchants: ["makemytrip.com"],
    maxAmount: 10000,
    validUntil: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
    status: "active",
    token: "",
  };
  secondMandate.token = createMandateToken(secondMandate.id, secondMandate.agent, secondMandate.merchants, secondMandate.maxAmount, secondMandate.validUntil);
  return {
    mandates: [firstMandate, secondMandate],
    transactions: [
      { id: "txn_8f2a", agent: "ShopBot", merchant: "blinkit.com", amount: 1240, status: "executed", time: "Just now", idempotencyKey: "seed_8f2a", mandateId: firstMandate.id },
      { id: "txn_8f19", agent: "TravelGenie", merchant: "makemytrip.com", amount: 7800, status: "awaiting_approval", time: "2 min ago", idempotencyKey: "seed_8f19", mandateId: secondMandate.id },
      { id: "txn_8e91", agent: "ShopBot", merchant: "zeptonow.com", amount: 860, status: "executed", time: "8 min ago", idempotencyKey: "seed_8e91", mandateId: firstMandate.id },
      { id: "txn_8e77", agent: "TravelGenie", merchant: "makemytrip.com", amount: 4200, status: "executed", time: "14 min ago", idempotencyKey: "seed_8e77", mandateId: secondMandate.id },
    ],
    usedIdempotencyKeys: new Map(),
    ledger: [],
  };
}

export function getStore() {
  if (!globalStore.payFenceStore) globalStore.payFenceStore = makeSeedStore();
  return globalStore.payFenceStore;
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
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { mnd: string; agt: string; scope: string[]; amt: number; exp: number };
  return claims.mnd === mandate.id && claims.agt === mandate.agent && claims.amt === mandate.maxAmount && claims.exp > Math.floor(Date.now() / 1000);
}

export function newTransactionId() {
  return `txn_${randomUUID().slice(0, 8)}`;
}
