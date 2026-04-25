import {
  ESI_1_KEYWORDS,
  ESI_2_KEYWORDS,
  ESI_TO_WAIT_CATEGORY,
  VITALS_THRESHOLDS,
} from "./constants.js";

function buildSearchText(p) {
  return [p.chief_complaint, ...(p.symptoms || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchKeywords(text, keywords) {
  return keywords.filter((k) => text.includes(k));
}

export function triage(p) {
  const text = buildSearchText(p);
  const red_flags = [];
  const suggested_actions = [];
  const rationale = [];

  const esi1Matches = matchKeywords(text, ESI_1_KEYWORDS);
  const esi2Matches = matchKeywords(text, ESI_2_KEYWORDS);

  const { heartRate: hr, oxygenLevel: ox } = VITALS_THRESHOLDS;
  const heartRate = p.heart_rate;
  const oxygenLevel = p.oxygen_level;
  const painLevel = p.pain_level;

  let esi_score = 5;

  if (esi1Matches.length > 0) {
    esi_score = 1;
    red_flags.push(...esi1Matches.map((k) => `life-threat keyword: ${k}`));
    suggested_actions.push(
      "Activate resuscitation team",
      "Move to trauma/resus bay immediately",
      "Continuous monitoring",
    );
    rationale.push(`ESI 1 triggered by: ${esi1Matches.join(", ")}`);
  }

  if (oxygenLevel !== null && oxygenLevel <= ox.critical && esi_score > 1) {
    esi_score = 1;
    red_flags.push(`oxygen ${oxygenLevel}% (critical)`);
    suggested_actions.push("Apply oxygen immediately", "Continuous SpO2 monitoring");
    rationale.push(`ESI 1 from oxygen <= ${ox.critical}%`);
  }

  if (
    heartRate !== null &&
    (heartRate <= hr.criticalLow || heartRate >= hr.criticalHigh) &&
    esi_score > 1
  ) {
    esi_score = 1;
    red_flags.push(`heart rate ${heartRate} bpm (critical)`);
    suggested_actions.push("ECG", "Continuous cardiac monitoring");
    rationale.push(`ESI 1 from heart rate outside ${hr.criticalLow}-${hr.criticalHigh}`);
  }

  if (esi_score > 2 && esi2Matches.length > 0) {
    esi_score = 2;
    red_flags.push(...esi2Matches.map((k) => `high-risk symptom: ${k}`));
    suggested_actions.push("Rapid nurse assessment", "Place on monitor", "Notify physician");
    rationale.push(`ESI 2 triggered by: ${esi2Matches.join(", ")}`);
  }

  if (esi_score > 2 && painLevel !== null && painLevel >= 9) {
    esi_score = 2;
    red_flags.push(`pain level ${painLevel}/10`);
    suggested_actions.push("Rapid assessment for severe pain");
    rationale.push("ESI 2 from pain >= 9");
  }

  if (
    esi_score > 2 &&
    ((oxygenLevel !== null && oxygenLevel <= ox.concern) ||
      (heartRate !== null && (heartRate <= hr.concernLow || heartRate >= hr.concernHigh)))
  ) {
    esi_score = 2;
    if (oxygenLevel !== null && oxygenLevel <= ox.concern) {
      red_flags.push(`oxygen ${oxygenLevel}% (low)`);
    }
    if (heartRate !== null && (heartRate <= hr.concernLow || heartRate >= hr.concernHigh)) {
      red_flags.push(`heart rate ${heartRate} bpm (abnormal)`);
    }
    suggested_actions.push("Place on monitor", "Recheck vitals");
    rationale.push("ESI 2 from abnormal vitals");
  }

  const symptomCount = (p.symptoms || []).length;
  if (esi_score > 3 && (symptomCount >= 3 || (painLevel !== null && painLevel >= 6))) {
    esi_score = 3;
    if (painLevel !== null && painLevel >= 6) red_flags.push(`pain level ${painLevel}/10`);
    if (symptomCount >= 3) red_flags.push(`${symptomCount} concurrent symptoms`);
    suggested_actions.push("Standard nurse assessment", "Likely needs labs or imaging");
    rationale.push("ESI 3 from moderate pain or multiple symptoms");
  }

  if (esi_score === 5 && (painLevel !== null && painLevel >= 3)) {
    esi_score = 4;
    suggested_actions.push("Routine assessment");
    rationale.push("ESI 4 from minor pain");
  }

  if (suggested_actions.length === 0) {
    suggested_actions.push("Routine assessment when available");
  }
  if (rationale.length === 0) {
    rationale.push("No red flags detected; minor complaint");
  }

  return {
    esi_score,
    wait_category: ESI_TO_WAIT_CATEGORY[esi_score],
    red_flags: Array.from(new Set(red_flags)),
    suggested_actions: Array.from(new Set(suggested_actions)),
    triage_rationale: rationale.join("; "),
  };
}
