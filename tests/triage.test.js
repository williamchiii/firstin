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
    const { ok, errors } = validateIntake({});
    expect(ok).toBe(false);
    expect(errors).toContain("name is required");
    expect(errors).toContain("chiefComplaint is required");
  });

  test("normalizes comma-separated symptoms into csv string", () => {
    const { ok, normalized } = validateIntake({
      name: "X",
      chiefComplaint: "headache",
      symptoms: "nausea, dizziness, blurry vision",
    });
    expect(ok).toBe(true);
    expect(normalized.symptoms).toBe("nausea, dizziness, blurry vision");
  });

  test("array symptoms also normalize to csv string", () => {
    const { normalized } = validateIntake({
      name: "X",
      chiefComplaint: "headache",
      symptoms: ["nausea", "dizziness"],
    });
    expect(normalized.symptoms).toBe("nausea, dizziness");
  });

  test("clamps painLevel to 0-10", () => {
    const high = validateIntake({ name: "X", chiefComplaint: "h", painLevel: 99 });
    const low = validateIntake({ name: "X", chiefComplaint: "h", painLevel: -5 });
    expect(high.normalized.pain_level).toBe(10);
    expect(low.normalized.pain_level).toBe(0);
  });

  test("language defaults to 'en'", () => {
    const { normalized } = validateIntake({ name: "X", chiefComplaint: "headache" });
    expect(normalized.language).toBe("en");
  });

  test("language is preserved when provided", () => {
    const { normalized } = validateIntake({
      name: "X",
      chiefComplaint: "headache",
      language: "es",
    });
    expect(normalized.language).toBe("es");
  });

  test("output shape matches DB columns", () => {
    const { normalized } = validateIntake({
      name: "Jane",
      chiefComplaint: "headache",
      symptoms: "nausea",
      painLevel: 5,
      language: "en",
    });
    expect(Object.keys(normalized).sort()).toEqual(
      ["chief_complaint", "language", "name", "pain_level", "patient_dob", "symptoms"].sort(),
    );
  });
});

describe("triage ESI 1 (immediate)", () => {
  test("unconscious patient", () => {
    const r = process({ name: "X", chiefComplaint: "found unconscious" });
    expect(r.esi_score).toBe(1);
    expect(r.wait_category).toBe("immediate");
    expect(r.red_flags.length).toBeGreaterThan(0);
  });

  test("life-threat keyword overrides low pain level", () => {
    const r = process({
      name: "X",
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
      chiefComplaint: "severe chest pain radiating to left arm",
    });
    expect(r.esi_score).toBe(2);
    expect(r.wait_category).toBe("priority");
  });

  test("pain level 9 alone", () => {
    const r = process({ name: "X", chiefComplaint: "back injury", painLevel: 9 });
    expect(r.esi_score).toBe(2);
  });
});

describe("triage ESI 3 (urgent)", () => {
  test("moderate pain", () => {
    const r = process({ name: "X", chiefComplaint: "ankle injury", painLevel: 6 });
    expect(r.esi_score).toBe(3);
    expect(r.wait_category).toBe("urgent");
  });

  test("multiple symptoms", () => {
    const r = process({
      name: "X",
      chiefComplaint: "feeling unwell",
      symptoms: "fatigue, mild headache, runny nose",
    });
    expect(r.esi_score).toBe(3);
  });
});

describe("triage ESI 4 / 5 (low acuity)", () => {
  test("ESI 4 from minor pain", () => {
    const r = process({ name: "X", chiefComplaint: "scraped knee", painLevel: 3 });
    expect(r.esi_score).toBe(4);
    expect(r.wait_category).toBe("standard");
  });

  test("ESI 5 trivial complaint", () => {
    const r = process({
      name: "X",
      chiefComplaint: "small paper cut",
      painLevel: 1,
    });
    expect(r.esi_score).toBe(5);
    expect(r.wait_category).toBe("non_urgent");
  });
});

describe("triage output shape", () => {
  test("returns expected fields with text (not array) red_flags", () => {
    const r = process({
      name: "Jane",
      chiefComplaint: "chest pain",
      painLevel: 9,
      symptoms: "nausea",
    });
    expect(r).toMatchObject({
      ok: true,
      esi_score: expect.any(Number),
      wait_category: expect.any(String),
      red_flags: expect.any(String),
      clinical_rationale: expect.any(String),
    });
  });
});
