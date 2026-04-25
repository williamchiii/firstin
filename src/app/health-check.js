"use client";

import { useState } from "react";

export default function HealthCheck() {
  const [state, setState] = useState({ status: "idle", timestamp: null });
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setState({ status: data.status, timestamp: data.timestamp });
    } catch {
      setState({ status: "error", timestamp: null });
    } finally {
      setLoading(false);
    }
  }

  const color =
    state.status === "ok"
      ? "bg-green-500"
      : state.status === "error"
        ? "bg-red-500"
        : "bg-zinc-400";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={check}
        disabled={loading}
        className="flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {loading ? "Checking..." : "Check health"}
      </button>
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
        <span>API: {state.status}</span>
        {state.timestamp && (
          <span className="text-zinc-400 dark:text-zinc-500">
            ({new Date(state.timestamp).toLocaleTimeString()})
          </span>
        )}
      </div>
    </div>
  );
}
