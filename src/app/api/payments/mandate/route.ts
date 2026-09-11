import { createHash } from "node:crypto";
import { createMandateToken, getStore, addAuditEntry, findOrCreateAgent } from "@/lib/payfence-store";
import { ok, created, fail } from "@/lib/api-response";

/**
 * POST /api/payments/mandate — create a new mandate
 * GET  /api/payments/mandate — list all mandates
 */
export async function POST(request: Request) {
  let body: {
    agent_id?: string;
    amount_ceiling?: number;
    merchant_scope?: string[];
    validity_start?: string;
    validity_end?: string;
    request_id?: string;
    valid_hours?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const agentId = body.agent_id;
  const amountCeiling = body.amount_ceiling;
  const merchantScope = body.merchant_scope;

  if (!agentId || !merchantScope?.length || typeof amountCeiling !== "number" || amountCeiling <= 0) {
    return fail("INVALID_REQUEST", "agent_id, merchant_scope (array), and amount_ceiling (positive number) are required", 400);
  }

  // Validity window: use explicit start/end or fall back to valid_hours
  let validFrom: string;
  let validUntil: string;

  if (body.validity_end) {
    validFrom = body.validity_start ?? new Date().toISOString();
    validUntil = body.validity_end;
  } else if (body.valid_hours && body.valid_hours > 0) {
    validFrom = new Date().toISOString();
    validUntil = new Date(Date.now() + body.valid_hours * 60 * 60 * 1000).toISOString();
  } else {
    // Default: 24 hours
    validFrom = new Date().toISOString();
    validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  // Deduplicate by request_id
  if (body.request_id) {
    const store = getStore();
    const existing = store.mandates.find((m) => m.requestId === body.request_id);
    if (existing) {
      return ok({
        mandate: existing,
        cached: true,
        message: "Mandate already exists for this request_id",
      });
    }
  }

  const store = getStore();
  const agent = findOrCreateAgent(agentId);
  const id = `mnd_${createHash("sha256").update(`${agentId}-${Date.now()}-${body.request_id ?? ""}`).digest("hex").slice(0, 8)}`;

  const mandate = {
    id,
    agent: agent.name,
    merchants: merchantScope,
    maxAmount: amountCeiling,
    validUntil,
    validFrom,
    requestId: body.request_id,
    status: "active" as const,
    token: createMandateToken(id, agent.name, merchantScope, amountCeiling, validUntil),
    createdAt: new Date().toISOString(),
  };

  store.mandates.push(mandate);

  addAuditEntry({
    paymentId: "",
    agentId: agent.id,
    action: "mandate_created",
    mandateId: mandate.id,
    amount: amountCeiling,
    merchant: merchantScope.join(", "),
    authorizationLevel: "auto",
    details: { requestId: body.request_id },
  });

  return created({
    mandate_id: mandate.id,
    agent_id: agentId,
    amount_ceiling: mandate.maxAmount,
    merchant_scope: mandate.merchants,
    validity_window: { start: validFrom, end: validUntil },
    created_at: mandate.createdAt,
    status: mandate.status,
    token: mandate.token,
  });
}

export function GET() {
  const store = getStore();
  const now = Date.now();

  const mandates = store.mandates.map((m) => ({
    ...m,
    // Auto-compute expired status
    status: m.status === "active" && new Date(m.validUntil).getTime() < now ? "expired" as const : m.status,
  }));

  return ok({ mandates });
}
