import { REQUIRED_INTAKE_FIELDS } from "./constants.js";

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

//normalizes a list-like input to a clean comma-separated string ("a, b ,c" -> "a, b, c")
function toCsvString(value) {
  if (Array.isArray(value)) {
    return value.map(trimString).filter(Boolean).join(", ");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }
  return "";
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

  const painLevel = clamp(toNumberOrNull(payload.painLevel), 0, 10);

  if (errors.length > 0) {
    return { ok: false, errors, normalized: null };
  }

  const normalized = {
    name: trimString(payload.name),
    language: trimString(payload.language) || "en",
    chief_complaint: trimString(payload.chiefComplaint),
    symptoms: toCsvString(payload.symptoms),
    pain_level: painLevel,
  };

  return { ok: true, errors: [], normalized };
}
