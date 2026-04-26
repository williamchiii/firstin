import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server.js";
import { supabase } from "@/lib/supabase.js";
import { getPrescriptionByPatientId } from "@/lib/prescriptions.js";
import SignOutButton from "./SignOutButton.jsx";

// --- helpers ---

const ESI_TO_WAIT = {
  1: "immediate",
  2: "priority",
  3: "urgent",
  4: "standard",
  5: "non_urgent",
};

function waitCategoryText(wc) {
  if (wc === "immediate" || wc === "priority") return "You were seen as a priority patient";
  if (wc === "urgent") return "You were seen as an urgent patient";
  if (wc === "standard") return "You were seen as a standard priority patient";
  if (wc === "non_urgent") return "You were seen as a non-urgent patient";
  return null;
}

function formatArrivalTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFollowUpDate(value) {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function parseSymptoms(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    // stored as CSV
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseRecoverySteps(raw) {
  if (!raw) return [];
  const byNewline = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  return raw.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
}

// --- shared card style ---
const CARD = { backgroundColor: "#0F172A", border: "1px solid #1E293B" };

// --- page ---

export default async function PatientDashboardPage() {
  const authClient = await getSupabaseServer();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) redirect("/patient/login");

  const patientId = session.user.user_metadata?.patient_id;
  if (!patientId) redirect("/patient/login");

  // --- fetch patient ---
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) redirect("/patient/login");

  // --- fetch prescription (may be null) ---
  const { data: prescription } = await getPrescriptionByPatientId(supabase, patientId);

  const waitCategory = patient.wait_category ?? ESI_TO_WAIT[patient.esi_score] ?? null;
  const waitText = waitCategoryText(waitCategory);
  const symptoms = parseSymptoms(patient.symptoms);
  const recoverySteps = parseRecoverySteps(prescription?.recovery_steps);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0F1E" }}>

      {/* ── Header ── */}
      <header
        className="grid grid-cols-3 items-center px-6 py-4 border-b"
        style={{ borderColor: "#1E293B" }}
      >
        <span className="text-lg font-bold tracking-tight text-white">
          First<span className="text-blue-500">In</span>
        </span>
        <span className="text-center text-sm font-medium" style={{ color: "#CBD5E1" }}>
          Welcome back, {patient.name}
        </span>
        <div className="flex justify-end">
          <SignOutButton />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">

        {/* Section 2 — Visit summary */}
        <section className="rounded-xl p-6 flex flex-col gap-5" style={CARD}>
          <h2 className="text-lg font-semibold text-white">Your Visit</h2>

          <Row label="Date and time" value={formatArrivalTime(patient.arrival_time)} />
          <Row label="Reason for visit" value={patient.chief_complaint} />

          {symptoms.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                Symptoms
              </span>
              <ul className="flex flex-col gap-1 pl-1">
                {symptoms.map((s, i) => (
                  <li key={i} className="text-sm" style={{ color: "#CBD5E1" }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Row
            label="Pain level"
            value={patient.pain_level != null ? `${patient.pain_level} out of 10` : "—"}
          />
          {waitText && <Row label="Priority" value={waitText} />}
        </section>

        {/* Section 3 — What you told us */}
        <section className="rounded-xl p-6 flex flex-col gap-5" style={CARD}>
          <h2 className="text-lg font-semibold text-white">Your Check-In Responses</h2>

          <Row label="Chief complaint" value={patient.chief_complaint} />

          {symptoms.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                Symptoms
              </span>
              <div className="flex flex-col gap-1 pl-1">
                {symptoms.map((s, i) => (
                  <span key={i} className="text-sm" style={{ color: "#CBD5E1" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Row
            label="Pain level"
            value={patient.pain_level != null ? `${patient.pain_level} out of 10` : "—"}
          />
          <Row label="Language" value={patient.language} />
        </section>

        {/* Section 4 — Prescription */}
        <section className="rounded-xl p-6 flex flex-col gap-5" style={CARD}>
          <h2 className="text-lg font-semibold text-white">Your Prescription</h2>

          {prescription ? (
            <>
              <Row label="Prescribed by" value={prescription.prescribed_by} />
              <Row label="Medications" value={prescription.medications} />
              <Row label="Dosage instructions" value={prescription.dosage_notes} />
              <Row label="Follow-up date" value={formatFollowUpDate(prescription.follow_up_date)} />
              {prescription.notes && (
                <Row label="Additional notes" value={prescription.notes} />
              )}

              {prescription.audio_url && (
                <div className="flex flex-col gap-2 pt-1">
                  <span
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "#94A3B8" }}
                  >
                    Listen to your prescription in your language
                  </span>
                  <audio
                    controls
                    src={prescription.audio_url}
                    className="w-full rounded-lg"
                    style={{ backgroundColor: "#0A0F1E" }}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: "#64748B" }}>
              Your care team will add your prescription shortly. Check back after your visit.
            </p>
          )}
        </section>

        {/* Section 5 — Recovery steps */}
        <section className="rounded-xl p-6 flex flex-col gap-5" style={CARD}>
          <h2 className="text-lg font-semibold text-white">Your Recovery Steps</h2>

          {prescription && recoverySteps.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {recoverySteps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                    style={{ backgroundColor: "#1E3A5F", color: "#93C5FD" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "#CBD5E1" }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm" style={{ color: "#64748B" }}>
              Your care team will add your prescription shortly. Check back after your visit.
            </p>
          )}
        </section>

      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94A3B8" }}>
        {label}
      </span>
      <span className="text-sm leading-relaxed" style={{ color: "#CBD5E1" }}>
        {value || "—"}
      </span>
    </div>
  );
}
