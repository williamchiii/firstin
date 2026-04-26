"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const POLL_MS = 10000;

const ESI_COLOR = {
  1: "text-red-600",
  2: "text-orange-500",
  3: "text-yellow-600",
  4: "text-blue-600",
  5: "text-green-600",
};

const WAIT_LABEL = {
  immediate:  "Immediate",
  priority:   "Priority",
  urgent:     "Urgent",
  standard:   "Standard",
  non_urgent: "Non-urgent",
};

const ESI_TO_WAIT = { 1: "immediate", 2: "priority", 3: "urgent", 4: "standard", 5: "non_urgent" };

export default function PatientStatusPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [state, setState] = useState("loading"); // loading | found | not-found | error
  const [patient, setPatient] = useState(null);

  async function poll() {
    const patientId = searchParams.get("patientId");
    if (!patientId && !caseId) { setState("not-found"); return; }
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error("Queue unavailable");

      const found = (data.patients ?? []).find(
        (p) => p.id === patientId || p.id === caseId,
      );

      if (found) {
        setPatient(found);
        setState("found");
      } else {
        // Not in active queue — may have been seen already
        setState(patient ? "discharged" : "not-found");
      }
    } catch (err) {
      console.error("[status] poll error:", err);
      setState((prev) => prev === "loading" ? "error" : prev);
    }
  }

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-800">
          FirstIn
        </Link>
        <Link href="/" className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-600">
          Back to home
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">

          {state === "loading" && (
            <>
              <div className="w-12 h-12 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
              <p className="text-sm text-neutral-500">Looking up your status…</p>
            </>
          )}

          {state === "found" && patient && (
            <>
              <span className="text-5xl">🏥</span>
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">You&apos;re in the queue</h1>
                <p className="mt-1 text-sm text-neutral-500">Updates every 10 seconds</p>
              </div>
              <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-5 flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Queue position</span>
                  <span className="font-semibold text-neutral-900">#{patient.queue_position}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Priority level</span>
                  <span className={`font-semibold ${ESI_COLOR[patient.esi_score] ?? "text-neutral-900"}`}>
                    ESI {patient.esi_score}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Category</span>
                  <span className="font-semibold text-neutral-900">
                    {WAIT_LABEL[patient.wait_category ?? ESI_TO_WAIT[patient.esi_score]] ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-semibold text-neutral-900 capitalize">
                    {(patient.status ?? "—").replace("_", " ")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-400">Please remain in the waiting area. Staff will call your name.</p>
            </>
          )}

          {state === "discharged" && (
            <>
              <span className="text-5xl">✅</span>
              <h1 className="text-2xl font-semibold text-neutral-900">You&apos;ve been seen</h1>
              <p className="text-sm text-neutral-500">Your visit has been completed. Thank you for using FirstIn.</p>
              <Link href="/" className="text-sm text-neutral-500 underline underline-offset-2">
                Back to home
              </Link>
            </>
          )}

          {state === "not-found" && (
            <>
              <span className="text-5xl">⚠️</span>
              <h1 className="text-2xl font-semibold text-neutral-900">Status not found</h1>
              <p className="text-sm text-neutral-500">We couldn&apos;t find your case. Please speak to a staff member.</p>
            </>
          )}

          {state === "error" && (
            <>
              <span className="text-5xl">⚠️</span>
              <h1 className="text-2xl font-semibold text-neutral-900">Connection error</h1>
              <p className="text-sm text-neutral-500">Having trouble reaching the server. Retrying…</p>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
