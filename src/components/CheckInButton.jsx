"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckInButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function handleClick() {
    setLeaving(true);
    setTimeout(() => router.push("/intake"), 250);
  }

  return (
    <>
      {leaving && (
        <div
          className="fixed inset-0 z-50 bg-white pointer-events-none"
          style={{ animation: "fadeIn 250ms ease forwards" }}
        />
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <button
        onClick={handleClick}
        className="group block w-full rounded-lg border border-neutral-800 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-4 sm:p-4 text-left cursor-pointer"
      >
        <span className="block text-sm font-semibold tracking-tight text-neutral-800 sm:text-base">
          Patient check-in
        </span>
        <span className="mx-auto mt-1.5 block max-w-xs text-xs leading-snug text-neutral-500 sm:text-sm">
          Answer a few questions and receive guidance on your next step.
        </span>
        <span className="mt-3 inline-flex items-center justify-center gap-1 text-[0.55rem] font-semibold uppercase tracking-widest text-neutral-500 transition group-hover:text-neutral-900">
          Start intake
        </span>
      </button>
    </>
  );
}
