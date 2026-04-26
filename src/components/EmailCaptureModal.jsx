"use client";

import { useState } from "react";

export default function EmailCaptureModal({ caseId, patientId, queuePosition }) {
  const [uiState, setUiState] = useState("prompt"); // prompt | submitting | sent | skipped | error
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setUiState("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/patient/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, patientId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.errors?.[0] ?? "Failed to send email");
      setUiState("sent");
    } catch (err) {
      setErrorMsg(err.message);
      setUiState("error");
    }
  }

  if (uiState === "sent") {
    return (
      <div className="w-full rounded-xl border border-green-200 bg-green-50 px-6 py-5 text-center">
        <p className="text-sm font-medium text-green-800">Confirmation sent to {email}</p>
        <p className="mt-1 text-xs text-green-600">Check your inbox for triage details.</p>
      </div>
    );
  }

  if (uiState === "skipped") {
    return (
      <p className="text-xs text-gray-400 text-center">
        No email sent. Remember your queue position <strong className="text-gray-600">#{queuePosition}</strong>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <p className="text-sm text-gray-500 text-center">
        Want a confirmation email with your triage details?
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        autoComplete="email"
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
      />
      {uiState === "error" && errorMsg && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={uiState === "submitting"}
          className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {uiState === "submitting" ? "Sending…" : "Send confirmation"}
        </button>
        <button
          type="button"
          onClick={() => setUiState("skipped")}
          className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 transition-colors hover:border-gray-300"
        >
          Skip
        </button>
      </div>
    </form>
  );
}
