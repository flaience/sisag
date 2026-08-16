import { describe, expect, it, vi } from "vitest";

import { listCommercialPostActivationAlertHistory } from "./commercial-post-activation-alert-history.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const secondOnboardingId = "53164020-8778-4226-afed-189e8d2333cc";

function action(
  actionType: "acknowledged" | "resolved",
  actedAt: string,
  actorType: "human" | "agent" | "system" = "human",
) {
  return {
    idempotencyKey: `${actionType}:${actedAt}`,
    alertKey: `${onboardingId}:milestone_overdue:welcome`,
    action: actionType,
    actor: { type: actorType, id: `${actorType}-1` },
    actedAt,
  };
}

function candidate(
  id = onboardingId,
  actions: unknown[] = [
    action("acknowledged", "2026-08-15T23:22:20.000Z"),
    action("resolved", "2026-08-15T23:24:01.000Z"),
  ],
) {
  return {
    onboardingId: id,
    commercialClientId,
    clientName: "Cliente Exemplo",
    result: { postActivationAlertActions: actions },
  };
}

describe("commercial post-activation alert history", () => {
  it("lists enriched actions ordered from newest to oldest", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([candidate()]) };

    await expect(listCommercialPostActivationAlertHistory({}, { store })).resolves.toEqual({
      ok: true,
      data: {
        items: [
          expect.objectContaining({
            action: "resolved",
            onboardingId,
            commercialClientId,
            clientName: "Cliente Exemplo",
          }),
          expect.objectContaining({ action: "acknowledged", onboardingId }),
        ],
        summary: { acknowledged: 1, resolved: 1, total: 2 },
        invalidRecords: 0,
        nextCursor: null,
      },
    });
    expect(store.listCandidates).toHaveBeenCalledWith(100);
  });

  it("combines histories from different onboardings", async () => {
    const store = {
      listCandidates: vi.fn().mockResolvedValue([
        candidate(onboardingId, [action("acknowledged", "2026-08-15T20:00:00.000Z")]),
        candidate(secondOnboardingId, [action("resolved", "2026-08-15T21:00:00.000Z")]),
      ]),
    };

    const response = await listCommercialPostActivationAlertHistory({}, { store });
    expect(response.ok && response.data.items.map((item) => item.onboardingId)).toEqual([
      secondOnboardingId,
      onboardingId,
    ]);
  });

  it("filters by action", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([candidate()]) };
    const response = await listCommercialPostActivationAlertHistory(
      { action: "resolved" },
      { store },
    );

    expect(response.ok && response.data.items).toHaveLength(1);
    expect(response.ok && response.data.items[0]?.action).toBe("resolved");
    expect(response.ok && response.data.summary).toEqual({
      acknowledged: 0,
      resolved: 1,
      total: 1,
    });
  });

  it("filters by actor type", async () => {
    const store = {
      listCandidates: vi.fn().mockResolvedValue([candidate(onboardingId, [
        action("acknowledged", "2026-08-15T20:00:00.000Z", "agent"),
        action("resolved", "2026-08-15T21:00:00.000Z", "human"),
      ])]),
    };

    const response = await listCommercialPostActivationAlertHistory(
      { actorType: "agent" },
      { store },
    );
    expect(response.ok && response.data.items).toEqual([
      expect.objectContaining({ action: "acknowledged", actor: { type: "agent", id: "agent-1" } }),
    ]);
  });

  it("applies the limit after sorting and filtering", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([candidate()]) };
    const response = await listCommercialPostActivationAlertHistory(
      { limit: 1 },
      { store },
    );

    expect(response.ok && response.data.items).toHaveLength(1);
    expect(response.ok && response.data.items[0]?.action).toBe("resolved");
    expect(response.ok && response.data.summary.total).toBe(1);
  });

  it("isolates invalid candidate histories", async () => {
    const store = {
      listCandidates: vi.fn().mockResolvedValue([
        candidate(onboardingId, [{ action: "invalid" }]),
        candidate(secondOnboardingId, [action("resolved", "2026-08-15T21:00:00.000Z")]),
      ]),
    };

    const response = await listCommercialPostActivationAlertHistory({}, { store });
    expect(response).toMatchObject({
      ok: true,
      data: { invalidRecords: 1, summary: { total: 1 } },
    });
    expect(response.ok && response.data.items[0]?.onboardingId).toBe(secondOnboardingId);
  });

  it("accepts candidates without an action history", async () => {
    const store = {
      listCandidates: vi.fn().mockResolvedValue([{
        ...candidate(),
        result: {},
      }]),
    };

    await expect(listCommercialPostActivationAlertHistory({}, { store })).resolves.toEqual({
      ok: true,
      data: {
        items: [],
        summary: { acknowledged: 0, resolved: 0, total: 0 },
        invalidRecords: 0,
        nextCursor: null,
      },
    });
  });

  it("rejects invalid query input before loading candidates", async () => {
    const store = { listCandidates: vi.fn() };
    const response = await listCommercialPostActivationAlertHistory(
      { limit: 0 },
      { store },
    );

    expect(response).toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.listCandidates).not.toHaveBeenCalled();
  });

  it("paginates deterministically without repeating actions", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([candidate()]) };
    const firstPage = await listCommercialPostActivationAlertHistory(
      { limit: 1 },
      { store },
    );

    expect(firstPage.ok).toBe(true);
    if (!firstPage.ok) throw new Error("expected first history page");
    expect(firstPage.data.items).toEqual([
      expect.objectContaining({ action: "resolved" }),
    ]);
    expect(firstPage.data.nextCursor).toEqual(expect.any(String));

    const secondPage = await listCommercialPostActivationAlertHistory(
      { limit: 1, cursor: firstPage.data.nextCursor ?? undefined },
      { store },
    );

    expect(secondPage.ok).toBe(true);
    if (!secondPage.ok) throw new Error("expected second history page");
    expect(secondPage.data.items).toEqual([
      expect.objectContaining({ action: "acknowledged" }),
    ]);
    expect(secondPage.data.nextCursor).toBeNull();
  });

  it("rejects a malformed cursor before loading candidates", async () => {
    const store = { listCandidates: vi.fn() };
    const response = await listCommercialPostActivationAlertHistory(
      { cursor: "not-a-valid-cursor" },
      { store },
    );

    expect(response).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Cursor do histórico de alertas inválido.",
    });
    expect(store.listCandidates).not.toHaveBeenCalled();
  });

  it("rejects a valid cursor that no longer exists in the filtered history", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([candidate()]) };
    const cursor = Buffer.from(JSON.stringify({
      actedAt: "2026-08-14T20:00:00.000Z",
      idempotencyKey: "missing-action",
    })).toString("base64url");

    const response = await listCommercialPostActivationAlertHistory(
      { cursor },
      { store },
    );

    expect(response).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Cursor do histórico de alertas não encontrado.",
    });
  });
});
