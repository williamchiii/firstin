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

const STATUSES = ["waiting", "in_progress", "completed"];
const POLL_MS = 5000;

export default function StaffDashboard() {
  const [patients, setPatients] = useState([]);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.errors?.join("; ") || `queue ${res.status}`);
      setPatients(data.patients || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = setTimeout(refresh, 0);
    const t = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(initialRefresh);
      clearInterval(t);
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
      if (!data.ok) throw new Error(data.errors?.join("; ") || `update ${res.status}`);
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
          <h1 className="text-2xl font-semibold">Patient queue</h1>
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
              ) : stackPatients.map((p) => {
                const expanded = expandedPatientId === p.id;
                const wc = p.wait_category || waitCategoryFromEsi(p.esi_score);
                const isEsi1 = p.esi_score === 1;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border transition ${
                      expanded
                        ? isEsi1
                          ? "border-red-200 bg-red-50/80 text-neutral-800 shadow-md"
                          : "border-neutral-900 bg-white text-neutral-800 shadow-md"
                        : isEsi1
                          ? "border-red-200 bg-red-50/80 text-neutral-800 shadow-sm hover:-translate-y-0.5 hover:border-red-300"
                          : "border-neutral-200 bg-white text-neutral-800 shadow-sm hover:-translate-y-0.5 hover:border-neutral-400"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedPatientId(expanded ? null : p.id)}
                      className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-3 text-left"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-neutral-700">
                        {p.queue_position ?? "—"}
                      </span>
                      <span>
                        <span className="block font-semibold">{p.name || "Unknown"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.chief_complaint || "—"}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-neutral-700">
                        ESI {p.esi_score ?? "?"} · {(wc || "").replace("_", " ")}
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t px-3 pb-3 pt-2">
                        <PatientDetails p={p} onStatus={setStatus} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PatientCard({ p, onStatus, featured = false }) {
  const wc = p.wait_category || waitCategoryFromEsi(p.esi_score);
  const isEsi1 = p.esi_score === 1;
  return (
    <Card
      className={
        featured && isEsi1
          ? "border-red-200 bg-red-50/80 shadow-sm ring-red-200"
          : featured
            ? "bg-white/95 shadow-sm"
            : ""
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className={featured ? "text-2xl" : "text-base"}>
              #{p.queue_position ?? "—"} · {p.name || "Unknown"}
            </CardTitle>
            <CardDescription className={featured ? "text-base" : ""}>
              {p.chief_complaint || "—"}
            </CardDescription>
          </div>
          <EsiBadge esi={p.esi_score} wc={wc} />
        </div>
      </CardHeader>
      <CardContent className={`flex flex-col gap-3 ${featured ? "text-base" : "text-sm"}`}>
        <PatientDetails p={p} onStatus={onStatus} />
      </CardContent>
    </Card>
  );
}

function PatientDetails({ p, onStatus }) {
  const [soap, setSoap] = useState(null);       // null | string | "error"
  const [soapLoading, setSoapLoading] = useState(false);
  const [ttsState, setTtsState] = useState("idle"); // idle | loading | playing | error
  const audioRef = useRef(null);

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
      if (!data.ok) throw new Error(data.errors?.[0] ?? "Failed to generate note");
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
      audio.onended = () => { setTtsState("idle"); URL.revokeObjectURL(url); };
      audio.onerror = () => { setTtsState("error"); URL.revokeObjectURL(url); };
      audio.play();
    } catch (err) {
      console.error("[tts] error:", err);
      setTtsState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
        <div>Arrival</div>
        <div className="text-foreground">{formatArrivalTime(p.arrival_time)}</div>
        <div>Pain</div>
        <div className="text-foreground">{p.pain_level ?? "—"}/10</div>
        <div>Symptoms</div>
        <div className="text-foreground">{p.symptoms || "—"}</div>
        <div>Red flags</div>
        <div className="text-foreground">{p.red_flags || "—"}</div>
        <div>Rationale</div>
        <div className="text-foreground">{p.clinical_rationale || "—"}</div>
        <div>Status</div>
        <div className="text-foreground">{p.status}</div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {STATUSES.filter((s) => s !== p.status).map((s) => (
          <Button key={s} size="sm" variant="outline" onClick={() => onStatus(p.id, s)}>
            {labelFor(s)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button size="sm" variant="outline" disabled={soapLoading} onClick={fetchSoap}>
          {soapLoading ? "Generating…" : soap && soap !== "error" ? "Regenerate SOAP" : "SOAP note"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={ttsState === "loading"}
          onClick={playConfirmation}
        >
          {ttsState === "loading" ? "Loading audio…" :
           ttsState === "playing" ? "Stop audio" :
           "▶ Play confirmation"}
        </Button>
        {ttsState === "error" && (
          <span className="text-xs text-destructive">Audio unavailable</span>
        )}
      </div>

      {soap && soap !== "error" && (
        <div className="rounded-lg border bg-neutral-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-neutral-700">
          {soap}
        </div>
      )}
      {soap === "error" && (
        <p className="text-xs text-destructive">Failed to generate SOAP note.</p>
      )}
    </div>
  );
}

function EsiBadge({ esi, wc }) {
  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <span className="text-xs font-semibold text-foreground">ESI {esi ?? "?"}</span>
      <span className="text-xs text-muted-foreground">{(wc || "").replace("_", " ")}</span>
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
  return { 1: "immediate", 2: "priority", 3: "urgent", 4: "standard", 5: "non_urgent" }[esi] || "";
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
