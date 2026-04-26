"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
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

  const currentIndex = patients.length === 0 ? 0 : Math.min(activeIndex, patients.length - 1);
  const activePatient = patients[currentIndex];

  function showPrevious() {
    setActiveIndex((i) => (patients.length === 0 ? 0 : (i - 1 + patients.length) % patients.length));
  }

  function showNext() {
    setActiveIndex((i) => (patients.length === 0 ? 0 : (i + 1) % patients.length));
  }

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
            Triage Queue based on priority
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
          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white/90 p-3 shadow-sm">
            <div>
              <div className="text-sm font-semibold">
                Patient {currentIndex + 1} of {patients.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Ordered by ESI priority and arrival time
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={showPrevious} disabled={patients.length <= 1}>
                Previous
              </Button>
              <Button variant="outline" onClick={showNext} disabled={patients.length <= 1}>
                Next
              </Button>
            </div>
          </div>

          <PatientCard p={activePatient} onStatus={setStatus} featured />

          <section className="rounded-2xl border bg-white/90 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Queue stack</div>
                <div className="text-xs text-muted-foreground">
                  Select a card to bring it forward
                </div>
              </div>
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                {patients.length} active
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {patients.map((p, index) => {
                const selected = index === currentIndex;
                const wc = p.wait_category || waitCategoryFromEsi(p.esi_score);
                const isEsi1 = p.esi_score === 1;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-md"
                        : isEsi1
                          ? "border-red-200 bg-red-50/80 text-neutral-800 shadow-sm hover:-translate-y-0.5 hover:border-red-300"
                          : "border-neutral-200 bg-white text-neutral-800 shadow-sm hover:-translate-y-0.5 hover:border-neutral-400"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                        selected ? "text-white" : "text-neutral-700"
                      }`}
                    >
                      {p.queue_position ?? "—"}
                    </span>
                    <span>
                      <span className="block font-semibold">{p.name || "Unknown"}</span>
                      <span className={`block text-xs ${selected ? "text-white/70" : "text-muted-foreground"}`}>
                        {p.chief_complaint || "—"}
                      </span>
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        selected ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      ESI {p.esi_score ?? "?"} · {(wc || "").replace("_", " ")}
                    </span>
                  </button>
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
          <div>Pain</div>
          <div className="text-foreground">{p.pain_level ?? "—"}/10</div>
          <div>Symptoms</div>
          <div className="text-foreground">{p.symptoms || "—"}</div>
          <div>Red flags</div>
          <div className="text-foreground">{p.red_flags || "—"}</div>
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
      </CardContent>
    </Card>
  );
}

function EsiBadge({ esi, wc }) {
  const color =
    esi === 1 ? "bg-red-600 text-white"
    : esi === 2 ? "bg-orange-500 text-white"
    : esi === 3 ? "bg-amber-400 text-black"
    : esi === 4 ? "bg-emerald-500 text-white"
    : "bg-zinc-300 text-black";
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
        ESI {esi ?? "?"}
      </span>
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
