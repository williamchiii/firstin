import { describe, test, expect } from "vitest";
import { validateIntake } from "../src/lib/validate.js";
import { triage } from "../src/lib/triage.js";

function process(payload) {
  const { ok, errors, normalized } = validateIntake(payload);
  if (!ok) return { ok, errors };
  return { ok, ...triage(normalized), normalized };
}

describe("validateIntake", () => {
  test("rejects missing required fields", () => {
    const { ok, errors } = validateIntake({ age: 40 });
    expect(ok).toBe(false);
    expect(errors).toContain("name is required");
    expect(errors).toContain("chiefComplaint is required");
  });

  test("rejects non-numeric age", () => {
    const { ok, errors } = validateIntake({
      name: "X",
      age: "not a number",
      chiefComplaint: "headache",
    });
    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes("age"))).toBe(true);
  });

  test("normalizes comma-separated symptoms into array", () => {
    const { ok, normalized } = validateIntake({
      name: "X",
      age: 30,
      chiefComplaint: "headache",
      symptoms: "nausea, dizziness, blurry vision",
    });
    expect(ok).toBe(true);
    expect(normalized.symptoms).toEqual(["nausea", "dizziness", "blurry vision"]);
  });

  test("clamps painLevel to 0-10", () => {
    const high = validateIntake({
      name: "X",
      age: 30,
      chiefComplaint: "h",
      painLevel: 99,
    });
    const low = validateIntake({
      name: "X",
      age: 30,
      chiefComplaint: "h",
      painLevel: -5,
    });
    expect(high.normalized.pain_level).toBe(10);
    expect(low.normalized.pain_level).toBe(0);
  });

  test("snake_cases keys for the DB shape", () => {
    const { normalized } = validateIntake({
      name: "X",
      age: 30,
      chiefComplaint: "headache",
      medicalHistory: ["asthma"],
      heartRate: 80,
      oxygenLevel: 98,
    });
    expect(normalized).toMatchObject({
      chief_complaint: "headache",
      medical_history: ["asthma"],
      heart_rate: 80,
      oxygen_level: 98,
    });
  });
});

describe("triage ESI 1 (immediate)", () => {
  test("unconscious patient", () => {
    const r = process({ name: "X", age: 40, chiefComplaint: "found unconscious" });
    expect(r.esi_score).toBe(1);
    expect(r.wait_category).toBe("immediate");
    expect(r.red_flags.length).toBeGreaterThan(0);
  });

  test("critical oxygen level", () => {
    const r = process({
      name: "X",
      age: 40,
      chiefComplaint: "trouble breathing",
      oxygenLevel: 85,
    });
    expect(r.esi_score).toBe(1);
  });

  test("critical heart rate", () => {
    const r = process({
      name: "X",
      age: 40,
      chiefComplaint: "palpitations",
      heartRate: 35,
    });
    expect(r.esi_score).toBe(1);
  });

  test("life-threat keyword overrides low pain level", () => {
    const r = process({
      name: "X",
      age: 22,
      chiefComplaint: "anaphylaxis after bee sting",
      painLevel: 1,
    });
    expect(r.esi_score).toBe(1);
  });
});

describe("triage ESI 2 (priority)", () => {
  test("chest pain keyword", () => {
    const r = process({
      name: "X",
      age: 54,
      chiefComplaint: "severe chest pain radiating to left arm",
    });
    expect(r.esi_score).toBe(2);
    expect(r.wait_category).toBe("priority");
  });

  test("pain level 9 alone", () => {
    const r = process({
      name: "X",
      age: 30,
      chiefComplaint: "back injury",
      painLevel: 9,
    });
    expect(r.esi_score).toBe(2);
  });

  test("abnormal vitals without keyword", () => {
    const r = process({
      name: "X",
      age: 30,
      chiefComplaint: "feeling weak",
      oxygenLevel: 93,
    });
    expect(r.esi_score).toBe(2);
  });
});

describe("triage ESI 3 (urgent)", () => {
  test("moderate pain", () => {
    const r = process({
      name: "X",
      age: 30,
      chiefComplaint: "ankle injury",
      painLevel: 6,
    });
    expect(r.esi_score).toBe(3);
    expect(r.wait_category).toBe("urgent");
  });

  test("multiple symptoms", () => {
    const r = process({
      name: "X",
      age: 30,
      chiefComplaint: "feeling unwell",
      symptoms: ["fatigue", "mild headache", "runny nose"],
    });
    expect(r.esi_score).toBe(3);
  });
});

describe("triage ESI 4 / 5 (low acuity)", () => {
  test("ESI 4 from minor pain", () => {
    const r = process({
      name: "X",
      age: 30,
      chiefComplaint: "scraped knee",
      painLevel: 3,
    });
    expect(r.esi_score).toBe(4);
    expect(r.wait_category).toBe("standard");
  });

  test("ESI 5 trivial complaint", () => {
    const r = process({
      name: "X",
      age: 22,
      chiefComplaint: "small paper cut",
      painLevel: 1,
    });
    expect(r.esi_score).toBe(5);
    expect(r.wait_category).toBe("non_urgent");
  });
});

describe("triage output shape", () => {
  test("processed patient has all expected fields", () => {
    const r = process({
      name: "Jane",
      age: 54,
      chiefComplaint: "chest pain",
      painLevel: 9,
      heartRate: 115,
      oxygenLevel: 92,
      symptoms: ["nausea"],
    });
    expect(r).toMatchObject({
      ok: true,
      esi_score: expect.any(Number),
      wait_category: expect.any(String),
      red_flags: expect.any(Array),
      suggested_actions: expect.any(Array),
      triage_rationale: expect.any(String),
    });
  });
});
