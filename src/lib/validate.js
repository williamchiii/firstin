import { REQUIRED_INTAKE_FIELDS } from "./constants";

//cleans up the whitespace
function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

//converts ints in string format to int ("20" -> 20), if empty return null
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

//converts symptoms/history/etc to arrays ("example, dizzynes" -> ["example", "dizzyness"])
function toArray(value) {
  if (Array.isArray(value)) return value.map(trimString).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

//keeps pain level between min and max
function clamp(n, min, max) {
  if (n === null) return null;
  return Math.min(max, Math.max(min, n));
}

//checks the patient intake form to see if data is valid, then cleans it to a consistent format
export function validateIntake(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["payload must be an object"], normalized: null };
  }

  for (const field of REQUIRED_INTAKE_FIELDS) {
    const v = payload[field];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      errors.push(`${field} is required`);
    }
  }

  const age = toNumberOrNull(payload.age);
  if (payload.age !== undefined && age === null) errors.push("age must be a number");
  if (age !== null && (age < 0 || age > 130)) errors.push("age must be between 0 and 130");

  const painLevel = clamp(toNumberOrNull(payload.painLevel), 0, 10);
  const heartRate = toNumberOrNull(payload.heartRate);
  const oxygenLevel = toNumberOrNull(payload.oxygenLevel);

  if (errors.length > 0) {
    return { ok: false, errors, normalized: null };
  }

  const normalized = {
    name: trimString(payload.name),
    age,
    chief_complaint: trimString(payload.chiefComplaint),
    pain_level: painLevel,
    symptoms: toArray(payload.symptoms),
    medical_history: toArray(payload.medicalHistory),
    medications: toArray(payload.medications),
    allergies: toArray(payload.allergies),
    heart_rate: heartRate,
    oxygen_level: oxygenLevel,
  };

  return { ok: true, errors: [], normalized };
}
