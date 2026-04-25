import { describe, test, expect, vi, beforeEach } from "vitest";

// chainable supabase mock that records the calls and returns a configurable result
function makeSupabaseMock() {
  const state = { result: { data: [], error: null } };
  const chain = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    update: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(state.result)),
    then: undefined, // ensure await on `chain` doesn't resolve
  };
  // for `await supabase.from(...).select(...).order(...)` (queue route)
  chain.then = (resolve) => resolve(state.result);
  return { chain, state };
}

vi.mock("@/lib/supabase.js", () => {
  const { chain, state } = makeSupabaseMock();
  return { supabase: chain, __state: state };
});

const { supabase, __state } = await import("@/lib/supabase.js");

beforeEach(() => {
  __state.result = { data: [], error: null };
  vi.clearAllMocks();
});

describe("GET /api/queue", () => {
  test("returns sorted active patients", async () => {
    __state.result = {
      data: [
        { id: "a", status: "waiting", esi_score: 1 },
        { id: "b", status: "in_progress", esi_score: 2 },
      ],
      error: null,
    };
    const { GET } = await import("../src/app/api/queue/route.js");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.patients).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith("patients");
    expect(supabase.in).toHaveBeenCalledWith("status", ["waiting", "in_progress"]);
  });

  test("surfaces db errors as 500", async () => {
    __state.result = { data: null, error: { message: "boom" } };
    const { GET } = await import("../src/app/api/queue/route.js");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors[0]).toBe("boom");
  });
});

describe("PATCH /api/patients/[id]", () => {
  const validId = "11111111-1111-1111-1111-111111111111";

  function makeReq(body) {
    return { json: async () => body };
  }

  test("rejects invalid id", async () => {
    const { PATCH } = await import("../src/app/api/patients/[id]/route.js");
    const res = await PATCH(makeReq({ status: "completed" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects bad status value", async () => {
    const { PATCH } = await import("../src/app/api/patients/[id]/route.js");
    const res = await PATCH(makeReq({ status: "exploded" }), {
      params: Promise.resolve({ id: validId }),
    });
    expect(res.status).toBe(400);
  });

  test("404 when no row updated", async () => {
    __state.result = { data: null, error: null };
    const { PATCH } = await import("../src/app/api/patients/[id]/route.js");
    const res = await PATCH(makeReq({ status: "completed" }), {
      params: Promise.resolve({ id: validId }),
    });
    expect(res.status).toBe(404);
  });

  test("returns updated patient on success", async () => {
    __state.result = {
      data: { id: validId, status: "completed" },
      error: null,
    };
    const { PATCH } = await import("../src/app/api/patients/[id]/route.js");
    const res = await PATCH(makeReq({ status: "completed" }), {
      params: Promise.resolve({ id: validId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.patient.status).toBe("completed");
  });
});
