import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-svh bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] text-neutral-900">

      {/* ── Header ── */}
      <header className="grid grid-cols-3 items-center px-5 pt-5 sm:px-8 sm:pt-6 lg:px-[3.25rem]">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl"
        >
          FirstIn
        </Link>
        <span className="text-center text-xl font-medium text-neutral-500 sm:text-2xl">
          Welcome back,{" "}
          <span className="text-neutral-900">{patient.name}</span>
        </span>
        <div className="flex justify-end">
          <SignOutButton />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:py-10">

        {/* Section 2 — Visit summary */}
        <section className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-900/10">
          <h2 className="text-lg font-semibold text-neutral-900">Your Visit</h2>

          <Row label="Date and time" value={formatArrivalTime(patient.arrival_time)} />
          <Row label="Reason for visit" value={patient.chief_complaint} />

          {symptoms.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Symptoms
              </span>
              <ul className="flex flex-col gap-1 pl-1">
                {symptoms.map((s, i) => (
                  <li key={i} className="text-sm text-neutral-700">
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
        <section className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-900/10">
          <h2 className="text-lg font-semibold text-neutral-900">Your Check-In Responses</h2>

          <Row label="Chief complaint" value={patient.chief_complaint} />

          {symptoms.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Symptoms
              </span>
              <div className="flex flex-col gap-1 pl-1">
                {symptoms.map((s, i) => (
                  <span key={i} className="text-sm text-neutral-700">
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
        <section className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-900/10">
          <h2 className="text-lg font-semibold text-neutral-900">Your Prescription</h2>

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
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Listen to your prescription in your language
                  </span>
                  <audio
                    controls
                    src={prescription.audio_url}
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              Your care team will add your prescription shortly. Check back after your visit.
            </p>
          )}
        </section>

        {/* Section 5 — Recovery steps */}
        <section className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-neutral-900/10">
          <h2 className="text-lg font-semibold text-neutral-900">Your Recovery Steps</h2>

          {prescription && recoverySteps.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {recoverySteps.map((step, i) => (
                <li key={i} className="flex items-baseline gap-4">
                  <span className="flex-shrink-0 text-xl font-bold leading-none text-neutral-900">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-neutral-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-neutral-500">
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
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span className="text-sm leading-relaxed text-neutral-700">
        {value || "—"}
      </span>
    </div>
  );
}
