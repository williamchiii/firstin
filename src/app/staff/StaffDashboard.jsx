"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase-browser.js";

const STATUSES = ["waiting", "in_progress", "completed"];
const FALLBACK_POLL_MS = 30000; // backup poll if realtime drops

export default function StaffDashboard() {
  const [patients, setPatients] = useState([]);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok)
        throw new Error(data.errors?.join("; ") || `queue ${res.status}`);
      setPatients(data.patients || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("patients-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        refresh,
      )
      .subscribe();

    // Fallback poll keeps the list fresh if the realtime socket drops
    const fallback = setInterval(refresh, FALLBACK_POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [refresh]);

  const priorityPatient = patients[0];
  const stackPatients = patients.slice(1);

  async function setStatus(id, status) {
    const prev = patients;
    setPatients((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok)
        throw new Error(data.errors?.join("; ") || `update ${res.status}`);
      refresh();
    } catch (err) {
      setError(err.message);
      setPatients(prev);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-semibold">Patient Queue</h1>
          <p className="text-sm text-muted-foreground">
            Triage queue based on priority
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : patients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No active patients</CardTitle>
            <CardDescription>
              When a patient checks in, they&apos;ll appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
            <div>
              <div className="text-sm font-semibold">Top priority</div>
              <div className="text-xs text-muted-foreground">
                Always showing the first patient in the priority queue
              </div>
            </div>
          </div>

          <PatientCard p={priorityPatient} onStatus={setStatus} featured />

          <section className="rounded-2xl border bg-white/90 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Queue stack</div>
                <div className="text-xs text-muted-foreground">
                  Select a card to expand details
                </div>
              </div>
              <span className="text-xs font-semibold text-neutral-600">
                {stackPatients.length} waiting
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {stackPatients.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-white/70 p-3 text-sm text-muted-foreground">
                  No other patients in the queue.
                </div>
              ) : (
                stackPatients.map((p) => {
                  const expanded = expandedPatientId === p.id;
                  const wc =
                    p.wait_category || waitCategoryFromEsi(p.esi_score);
                  const sidebarColor = getEsiSidebarColor(p.esi_score);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border border-neutral-200 transition ${sidebarColor} ${
                        p.esi_score === 1
                          ? "hover:border-l-red-650"
                          : p.esi_score === 2
                            ? "hover:border-l-amber-550"
                            : "hover:border-l-neutral-450"
                      } ${
                        expanded
                          ? "bg-neutral-50 shadow-md"
                          : "bg-white shadow-sm hover:-translate-y-0.2 hover:shadow-md hover:bg-neutral-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPatientId(expanded ? null : p.id)
                        }
                        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-3 text-left"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-neutral-700">
                          {p.queue_position ?? "—"}
                        </span>
                        <span>
                          <span className="block font-semibold">
                            {p.name || "Unknown"}
                          </span>
                          <span
                            className={`block text-xs font-semibold ${
                              p.esi_score === 1
                                ? "text-red-600"
                                : p.esi_score === 2
                                  ? "text-amber-600"
                                  : "text-muted-foreground font-normal"
                            }`}
                          >
                            {p.chief_complaint || "—"}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-neutral-700">
                          ESI {p.esi_score ?? "?"} ·{" "}
                          {(wc || "").replace("_", " ")}
                        </span>
                      </button>

                      {expanded && (
                        <div className="border-t px-3 pb-3 pt-2">
                          <PatientDetails p={p} onStatus={setStatus} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PatientCard({ p, onStatus, featured = false }) {
  const wc = p.wait_category || waitCategoryFromEsi(p.esi_score);
  const sidebarColor = getEsiSidebarColor(p.esi_score);
  return (
    <Card
      className={`${sidebarColor} ${
        featured
          ? "bg-neutral-50 shadow-lg border-2 ring-2 ring-neutral-900/10"
          : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle
              className={
                featured ? "text-3xl font-bold" : "text-lg font-semibold"
              }
            >
              {p.name || "Unknown"}
            </CardTitle>
            <div
              className={`${
                featured
                  ? `text-lg font-semibold mt-2 ${
                      p.esi_score === 1
                        ? "text-red-600"
                        : p.esi_score === 2
                          ? "text-amber-600"
                          : "text-neutral-900"
                    }`
                  : "text-xs text-muted-foreground mt-1"
              }`}
            >
              #{p.queue_position ?? "—"} · {p.chief_complaint || "—"}
            </div>
          </div>
          <EsiBadge esi={p.esi_score} wc={wc} />
        </div>
      </CardHeader>
      <CardContent
        className={`flex flex-col gap-3 ${featured ? "text-base" : "text-sm"}`}
      >
        <PatientDetails p={p} onStatus={onStatus} />
      </CardContent>
    </Card>
  );
}

function PatientDetails({ p, onStatus }) {
  const [soap, setSoap] = useState(null); // null | string | "error"
  const [soapLoading, setSoapLoading] = useState(false);
  const [ttsState, setTtsState] = useState("idle"); // idle | loading | playing | error
  const audioRef = useRef(null);

  // --- prescription state ---
  const [rxPanelOpen, setRxPanelOpen] = useState(false);
  const [rxForm, setRxForm] = useState({
    medications: "",
    dosage_notes: "",
    recovery_steps: "",
    follow_up_date: "",
    notes: "",
  });
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState("");
  const [rxAdded, setRxAdded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const isDischargedOrCompleted =
    p.status === "completed" || p.status === "discharged";

  function setRxField(field, value) {
    setRxForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRxSubmit() {
    setRxLoading(true);
    setRxError("");
    try {
      const res = await fetch("/api/prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: p.id,
          prescribed_by: "Nurse",
          medications: rxForm.medications,
          dosage_notes: rxForm.dosage_notes,
          recovery_steps: rxForm.recovery_steps,
          follow_up_date: rxForm.follow_up_date,
          notes: rxForm.notes,
        }),
      });
      const data = await res.json();
      if (!data.ok)
        throw new Error(data.errors?.[0] ?? data.error ?? "Failed to save prescription");
      setRxPanelOpen(false);
      setRxAdded(true);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } catch (err) {
      setRxError(err.message);
    } finally {
      setRxLoading(false);
    }
  }

  async function fetchSoap() {
    setSoapLoading(true);
    setSoap(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: p.id }),
      });
      const data = await res.json();
      if (!data.ok)
        throw new Error(data.errors?.[0] ?? "Failed to generate note");
      setSoap(data.report);
    } catch (err) {
      console.error("[soap] error:", err);
      setSoap("error");
    } finally {
      setSoapLoading(false);
    }
  }

  async function playConfirmation() {
    if (ttsState === "playing") {
      audioRef.current?.pause();
      setTtsState("idle");
      return;
    }
    setTtsState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: p.id, type: "confirmation" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errors?.[0] ?? `TTS failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setTtsState("playing");
      audio.onended = () => {
        setTtsState("idle");
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setTtsState("error");
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch (err) {
      console.error("[tts] error:", err);
      setTtsState("error");
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* --- Vitals Row: Arrival, Pain, Status --- */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs font-medium text-neutral-500">Arrival</div>
          <div className="font-medium text-foreground">
            {formatArrivalTime(p.arrival_time)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-neutral-500">Pain</div>
          <div className="font-medium text-foreground">
            {p.pain_level ?? "—"}/10
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-neutral-500">Status</div>
          <div className="font-medium text-foreground">{p.status}</div>
        </div>
      </div>

      {/* --- Optional fields: only show if data exists --- */}
      {(p.symptoms || p.red_flags) && (
        <div className="grid grid-cols-2 gap-4">
          {p.symptoms && (
            <div>
              <div className="text-xs font-medium text-neutral-500">
                Symptoms
              </div>
              <div className="font-medium text-foreground">{p.symptoms}</div>
            </div>
          )}
          {p.red_flags && (
            <div>
              <div className="text-xs font-medium text-neutral-500">
                Red flags
              </div>
              <div className="font-medium text-foreground">{p.red_flags}</div>
            </div>
          )}
        </div>
      )}

      {/* --- Reasoning Box: highlight the triage logic --- */}
      {p.clinical_rationale && (
        <div
          className={`rounded-lg p-3 ${
            p.esi_score === 1
              ? "bg-amber-50 border border-amber-200"
              : "bg-neutral-50 border border-neutral-200"
          }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${
              p.esi_score === 1 ? "text-amber-900" : "text-neutral-700"
            }`}
          >
            Reasoning
          </div>
          <div
            className={`text-sm ${
              p.esi_score === 1 ? "text-amber-900" : "text-neutral-700"
            }`}
          >
            {p.clinical_rationale}
          </div>
        </div>
      )}

      {/* --- Actions row --- */}
      <div className="flex flex-wrap gap-2 pt-1">
        {STATUSES.filter((s) => s !== p.status).map((s) => {
          const isStart = s === "in_progress";
          return (
            <Button
              key={s}
              size="sm"
              variant={isStart ? "default" : "outline"}
              className={isStart ? "bg-neutral-900 hover:bg-neutral-800" : ""}
              onClick={() => onStatus(p.id, s)}
            >
              {labelFor(s)}
            </Button>
          );
        })}

        {/* --- Prescription button (discharged / completed patients only) --- */}
        {isDischargedOrCompleted && !rxAdded && (
          <button
            className="rounded border border-blue-600 px-3 py-1 text-sm text-blue-400 transition hover:bg-blue-600 hover:text-white"
            onClick={() => setRxPanelOpen(true)}
          >
            Add Prescription
          </button>
        )}

        {rxAdded && (
          <span className="rounded px-2 py-1 text-xs font-semibold" style={{ backgroundColor: "#14532d", color: "#86efac" }}>
            Prescription Added
          </span>
        )}
      </div>

      {/* --- Prescription slide-over panel --- */}
      {rxPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setRxPanelOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed right-0 top-0 z-50 h-full w-96 overflow-y-auto p-6"
            style={{ backgroundColor: "#0F172A", borderLeft: "1px solid #1E293B" }}
          >
            {/* Panel header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Add Prescription</h2>
              <button
                onClick={() => setRxPanelOpen(false)}
                className="text-slate-400 transition hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Patient context */}
            <div
              className="mb-6 rounded-lg p-3"
              style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E293B" }}
            >
              <p className="text-sm font-medium text-white">{p.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                {p.chief_complaint}
              </p>
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-5">
              <RxField label="Medications" required>
                <textarea
                  rows={3}
                  placeholder="List medications and dosages"
                  value={rxForm.medications}
                  onChange={(e) => setRxField("medications", e.target.value)}
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600"
                  style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E293B" }}
                />
              </RxField>

              <RxField label="Dosage Instructions" required>
                <textarea
                  rows={3}
                  placeholder="How and when to take each medication"
                  value={rxForm.dosage_notes}
                  onChange={(e) => setRxField("dosage_notes", e.target.value)}
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600"
                  style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E293B" }}
                />
              </RxField>

              <RxField label="Recovery Steps" required>
                <textarea
                  rows={4}
                  placeholder="Step by step recovery instructions"
                  value={rxForm.recovery_steps}
                  onChange={(e) => setRxField("recovery_steps", e.target.value)}
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600"
                  style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E293B" }}
                />
              </RxField>

              <RxField label="Follow-Up Date" required>
                <input
                  type="date"
                  value={rxForm.follow_up_date}
                  onChange={(e) => setRxField("follow_up_date", e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-600"
                  style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E293B", colorScheme: "dark" }}
                />
              </RxField>

              <RxField label="Additional Notes">
                <textarea
                  rows={2}
                  placeholder="Any additional notes for the patient"
                  value={rxForm.notes}
                  onChange={(e) => setRxField("notes", e.target.value)}
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600"
                  style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E293B" }}
                />
              </RxField>
            </div>

            {/* Error */}
            {rxError && (
              <p className="mt-4 text-sm text-red-400">{rxError}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleRxSubmit}
              disabled={rxLoading || !rxForm.medications || !rxForm.dosage_notes || !rxForm.recovery_steps || !rxForm.follow_up_date}
              className="mt-6 h-11 w-full rounded-lg bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rxLoading ? "Saving…" : "Save and Send to Patient"}
            </button>
          </div>
        </>
      )}

      {/* --- Toast --- */}
      {toastVisible && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          Prescription saved and sent to patient
        </div>
      )}
    </div>
  );
}

function RxField({ label, required = false, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94A3B8" }}>
        {label}
        {required && <span className="ml-1 text-blue-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function EsiBadge({ esi, wc }) {
  if (esi === 1) {
    return (
      <div className="flex flex-col items-center gap-0 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
          ESI
        </span>
        <span className="text-5xl font-black text-red-600 leading-none">1</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mt-0.5">
          Immediate
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <span className="text-xs font-semibold text-foreground">
        ESI {esi ?? "?"}
      </span>
      <span className="text-xs text-muted-foreground">
        {(wc || "").replace("_", " ")}
      </span>
    </div>
  );
}

function labelFor(status) {
  if (status === "waiting") return "Move to waiting";
  if (status === "in_progress") return "Start";
  if (status === "completed") return "Complete";
  return status;
}

function waitCategoryFromEsi(esi) {
  return (
    {
      1: "immediate",
      2: "priority",
      3: "urgent",
      4: "standard",
      5: "non_urgent",
    }[esi] || ""
  );
}

/**
 * Get the ESI color class for the left sidebar indicator
 * ESI 1: Bold Red, ESI 2: Amber/Orange, ESI 3-5: Neutral Grey
 */
function getEsiSidebarColor(esi) {
  if (esi === 1) return "border-l-4 border-l-red-600";
  if (esi === 2) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-neutral-400";
}

function formatArrivalTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
