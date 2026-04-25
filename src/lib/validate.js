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

//normalizes a date-of-birth input to ISO date string ("YYYY-MM-DD") or null
function toDobOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = trimString(value);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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
  const patientDob = toDobOrNull(payload.patientDob);
  if (payload.patientDob && !patientDob) {
    errors.push("patientDob must be a valid date (e.g. YYYY-MM-DD)");
  }

  if (errors.length > 0) {
    return { ok: false, errors, normalized: null };
  }

  const normalized = {
    name: trimString(payload.name),
    language: trimString(payload.language) || "en",
    chief_complaint: trimString(payload.chiefComplaint),
    symptoms: toCsvString(payload.symptoms),
    pain_level: painLevel,
    patient_dob: patientDob,
  };

  return { ok: true, errors: [], normalized };
}
