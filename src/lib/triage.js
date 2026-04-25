import {
  ESI_1_KEYWORDS,
  ESI_2_KEYWORDS,
  ESI_TO_WAIT_CATEGORY,
} from "./constants.js";

function buildSearchText(p) {
  return [p.chief_complaint, p.symptoms].filter(Boolean).join(" ").toLowerCase();
}

function matchKeywords(text, keywords) {
  return keywords.filter((k) => text.includes(k));
}

function symptomCount(symptomsCsv) {
  if (!symptomsCsv) return 0;
  return symptomsCsv.split(",").map((s) => s.trim()).filter(Boolean).length;
}

export function triage(p) {
  const text = buildSearchText(p);
  const red_flags = [];
  const rationale = [];

  const esi1Matches = matchKeywords(text, ESI_1_KEYWORDS);
  const esi2Matches = matchKeywords(text, ESI_2_KEYWORDS);
  const painLevel = p.pain_level;

  let esi_score = 5;

  if (esi1Matches.length > 0) {
    esi_score = 1;
    red_flags.push(...esi1Matches.map((k) => `life-threat keyword: ${k}`));
    rationale.push(`ESI 1 triggered by: ${esi1Matches.join(", ")}`);
  }

  if (esi_score > 2 && esi2Matches.length > 0) {
    esi_score = 2;
    red_flags.push(...esi2Matches.map((k) => `high-risk symptom: ${k}`));
    rationale.push(`ESI 2 triggered by: ${esi2Matches.join(", ")}`);
  }

  if (esi_score > 2 && painLevel !== null && painLevel >= 9) {
    esi_score = 2;
    red_flags.push(`pain level ${painLevel}/10`);
    rationale.push("ESI 2 from pain >= 9");
  }

  const sCount = symptomCount(p.symptoms);
  if (esi_score > 3 && (sCount >= 3 || (painLevel !== null && painLevel >= 6))) {
    esi_score = 3;
    if (painLevel !== null && painLevel >= 6) red_flags.push(`pain level ${painLevel}/10`);
    if (sCount >= 3) red_flags.push(`${sCount} concurrent symptoms`);
    rationale.push("ESI 3 from moderate pain or multiple symptoms");
  }

  if (esi_score === 5 && painLevel !== null && painLevel >= 3) {
    esi_score = 4;
    rationale.push("ESI 4 from minor pain");
  }

  if (rationale.length === 0) {
    rationale.push("No red flags detected; minor complaint");
  }

  return {
    esi_score,
    wait_category: ESI_TO_WAIT_CATEGORY[esi_score],
    red_flags: Array.from(new Set(red_flags)).join("; "),
    clinical_rationale: rationale.join("; "),
  };
}
