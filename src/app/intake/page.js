"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Volume2, Keyboard, X } from "lucide-react";
import EmailCaptureModal from "@/components/EmailCaptureModal.jsx";

const STORAGE_KEY = "firstin.finalize";

// --- Shared navbar ---

function Navbar() {
  return (
    <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-13">
      <Link href="/" className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl">
        FirstIn
      </Link>
      <div className="flex items-center gap-2.5">
        <Link
          href="/patient/dashboard"
          className="inline-flex h-9 items-center rounded-md border border-neutral-900 bg-neutral-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-700 sm:h-10 sm:px-4 sm:text-sm"
        >
          Patient Dashboard
        </Link>
        <Link
          href="/staff"
          className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm"
        >
          Staff Access
        </Link>
      </div>
    </div>
  );
}

// --- Split-screen selector ---

function ModeSelector({ onSelect }) {
  const [hovered, setHovered] = useState(null); // "voice" | "text" | null

  const voiceWidth =
    hovered === "voice" ? "65%" : hovered === "text" ? "35%" : "50%";
  const textWidth =
    hovered === "text" ? "65%" : hovered === "voice" ? "35%" : "50%";

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Link href="/" className="absolute top-5 left-5 z-10 text-white/50 hover:text-white transition-colors">
        <X className="w-5 h-5" />
      </Link>
      {/* Voice side */}
      <div
        className="relative flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-500 ease-in-out bg-black"
        style={{ width: voiceWidth }}
        onMouseEnter={() => setHovered("voice")}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelect("voice")}
      >
        <div
          className="flex flex-col items-center gap-2 transition-all duration-300"
          style={{ opacity: hovered === "text" ? 0.5 : 1 }}
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center">
            <Mic className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium tracking-widest text-white/40 uppercase mb-2">
              Option A
            </p>
            <h2 className="text-3xl font-semibold text-white">Voice</h2>
            <p className="text-white/50 text-sm mt-2 max-w-45">
              Speak with our AI intake assistant
            </p>
          </div>
          <div
            className="mt-2 px-5 py-2 rounded-full border border-white/20 text-white/60 text-sm transition-all duration-300"
            style={{
              opacity: hovered === "voice" ? 1 : 0,
              transform: hovered === "voice" ? "translateY(0)" : "translateY(6px)",
            }}
          >
            Click to begin
          </div>
        </div>

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.07) 1.5px, transparent 0)",
            backgroundSize: "39px 39px",
          }}
        />
      </div>

      {/* Text side */}
      <div
        className="relative flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-500 ease-in-out bg-white"
        style={{ width: textWidth }}
        onMouseEnter={() => setHovered("text")}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelect("text")}
      >
        <div
          className="flex flex-col items-center gap-2 transition-all duration-300"
          style={{ opacity: hovered === "voice" ? 0.5 : 1 }}
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center">
            <Keyboard className="w-10 h-10 text-gray-700" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-2">
              Option B
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">Type</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-45">
              Fill out a short intake form
            </p>
          </div>
          <div
            className="mt-2 px-5 py-2 rounded-full border border-gray-200 text-gray-500 text-sm transition-all duration-300"
            style={{
              opacity: hovered === "text" ? 1 : 0,
              transform: hovered === "text" ? "translateY(0)" : "translateY(6px)",
            }}
          >
            Click to begin
          </div>
        </div>

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1.5px 1.5px, rgba(23,23,23,0.12) 1.5px, transparent 0)",
            backgroundSize: "39px 39px",
          }}
        />
      </div>
    </div>
  );
}

// --- Post-submission email capture ---

function EmailForm({ patientId }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | sent | skipped | error
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save email");
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-gray-500">
        We&apos;ll send updates to <strong className="text-gray-800">{email}</strong>.
      </p>
    );
  }

  if (status === "skipped") {
    return (
      <p className="text-xs text-gray-400">
        A staff member will call your name when it&apos;s your turn.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        Want a confirmation email with your triage details?
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        autoComplete="email"
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 outline-none"
      />
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {status === "submitting" ? "Saving…" : "Send confirmation"}
        </button>
        <button
          type="button"
          onClick={() => setStatus("skipped")}
          className="px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-gray-300 transition-colors"
        >
          Skip
        </button>
      </div>
    </form>
  );
}

// --- Text-based intake form ---

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function TextIntake({ onBack }) {
  const [form, setForm] = useState({
    name: "",
    patientDob: "",
    chiefComplaint: "",
    symptoms: "",
    painLevel: "",
    language: "en",
  });
  const [dob, setDob] = useState({ month: "", day: "", year: "" });
  const [phase, setPhase] = useState("idle"); // idle | submitting | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleDobChange(part, value) {
    const next = { ...dob, [part]: value };
    setDob(next);
    if (next.month && next.day && next.year) {
      const month = String(MONTHS.indexOf(next.month) + 1).padStart(2, "0");
      const day = next.day.padStart(2, "0");
      setForm((prev) => ({ ...prev, patientDob: `${next.year}-${month}-${day}` }));
    } else {
      setForm((prev) => ({ ...prev, patientDob: "" }));
    }
  }

  const dobDays = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const dobYears = Array.from({ length: 120 }, (_, i) => String(new Date().getFullYear() - i));

  async function handleSubmit(e) {
    e.preventDefault();
    setPhase("submitting");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = Array.isArray(data.errors)
          ? data.errors.join(", ")
          : data.error ?? "Submission failed";
        throw new Error(msgs);
      }
      setResult(data);
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
    }
  }

  const BG = "bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px]";

  if (phase === "done" && result) {
    return (
      <div className={`min-h-screen ${BG} flex flex-col`}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            You&apos;re all set
          </h2>
          <EmailForm patientId={result.patient?.id} />
        </div>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className={`min-h-screen ${BG} flex items-center justify-center px-6`}>
        <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
          <button
            onClick={() => { setPhase("idle"); setErrorMsg(null); }}
            className="px-6 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none";

  return (
    <div className={`min-h-screen ${BG} flex flex-col`}>
      <div className="px-6 pt-10 pb-6 flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-medium tracking-widest text-gray-400 uppercase">
          FirstIn
        </span>
        <h1 className="text-3xl font-semibold text-gray-900">Patient Intake</h1>
        <button
          onClick={onBack}
          className="mt-2 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          ← Switch to voice
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-3 max-w-lg mx-auto w-full px-6 pb-12"
      >
        {/* Name + DOB row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Full name <span className="text-gray-400">*</span></span>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Jane Smith" className={inputCls} />
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col gap-2">
            <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Date of birth <span className="text-gray-400">*</span></span>
            <div className="flex gap-1.5">
              <select value={dob.month} onChange={(e) => handleDobChange("month", e.target.value)} className="flex-2 bg-gray-50 rounded-lg px-2 py-1.5 text-sm text-gray-900 border-none outline-none appearance-none cursor-pointer">
                <option value="">Mon</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m.slice(0, 3)}</option>)}
              </select>
              <select value={dob.day} onChange={(e) => handleDobChange("day", e.target.value)} className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-sm text-gray-900 border-none outline-none appearance-none cursor-pointer">
                <option value="">Day</option>
                {dobDays.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={dob.year} onChange={(e) => handleDobChange("year", e.target.value)} className="flex-2 bg-gray-50 rounded-lg px-2 py-1.5 text-sm text-gray-900 border-none outline-none appearance-none cursor-pointer">
                <option value="">Year</option>
                {dobYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Chief complaint */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Chief complaint <span className="text-gray-400">*</span></span>
          <input name="chiefComplaint" value={form.chiefComplaint} onChange={handleChange} required placeholder="e.g. chest pain, shortness of breath" className={inputCls} />
        </div>

        {/* Symptoms */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Symptoms</span>
          <input name="symptoms" value={form.symptoms} onChange={handleChange} placeholder="nausea, dizziness, fever…" className={inputCls} />
        </div>

        {/* Pain level slider */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Pain level <span className="text-gray-400">*</span></span>
            <span className="text-lg font-semibold text-gray-900 tabular-nums w-6 text-right">{form.painLevel === "" ? "0" : form.painLevel}</span>
          </div>
          <input
            name="painLevel"
            type="range"
            min={0}
            max={10}
            step={1}
            value={form.painLevel === "" ? 0 : form.painLevel}
            onChange={handleChange}
            required
            className="w-full accent-gray-900 h-1.5 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>None</span>
            <span>Moderate</span>
            <span>Severe</span>
          </div>
        </div>


        <button
          type="submit"
          disabled={phase === "submitting"}
          className="mt-2 w-full py-4 rounded-2xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {phase === "submitting" ? "Submitting…" : "Submit intake"}
        </button>
      </form>
    </div>
  );
}

// --- Credentials modal ---

function CredentialsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl px-6 py-7 flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">Patient portal access</h2>
        <p className="text-sm text-gray-500 -mt-2">Use these credentials to sign in and view your visit summary.</p>
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-4 flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900">Ismael Romero</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">user@firstin.com</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Password</span>
            <span className="font-mono font-medium text-gray-900">1234</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/patient/login"
            className="block text-center rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            onClick={onClose}
          >
            Open patient portal →
          </Link>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Voice intake inner component (must be inside ConversationProvider) ---

function VoiceIntake({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const [finalizeResult, setFinalizeResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHomeButton, setShowHomeButton] = useState(false);
  const messagesEndRef = useRef(null);
  const hasConnectedRef = useRef(false);
  const msgCounterRef = useRef(0);
  const messagesRef = useRef([]);

  // --- Hydrate from sessionStorage on mount (makes back-nav work) ---
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setFinalizeResult(data);
        setPhase("done");
      }
    } catch { /* ignore */ }
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      hasConnectedRef.current = true;
      setPhase("active");
    },
    onDisconnect: () => {
      if (hasConnectedRef.current) {
        setPhase("ending");
      }
    },
    onMessage: ({ source, message }) => {
      const clean = message.replace(/\[[^\]]+\]/g, "").trim();
      if (!clean) return;
      const id = `msg-${++msgCounterRef.current}`;
      const entry = { source, message: clean, id };
      messagesRef.current = [...messagesRef.current, entry];
      setMessages((prev) => [...prev, entry]);
    },
    onError: (msg) => {
      console.error("[intake] conversation error:", msg);
      setPhase("error");
      setErrorMsg(msg ?? "Something went wrong. Please try again.");
    },
  });

  const { isSpeaking, isListening } = conversation;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (phase !== "ending") return;

    const currentMessages = messagesRef.current;
    const patientMessages = currentMessages.filter((m) => m.source === "user");
    if (patientMessages.length === 0) {
      setPhase("error");
      setErrorMsg("The connection dropped before your intake was recorded. Please try again.");
      return;
    }

    const transcript = currentMessages
      .map((m) => `${m.source === "ai" ? "Agent" : "Patient"}: ${m.message}`)
      .join("\n");

    async function finalize() {
      try {
        const res = await fetch("/api/voice/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.errors?.[0] ?? "Finalize failed");
        // Persist so back-nav restores this screen
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
        setFinalizeResult(data);
        setPhase("done");
      } catch (err) {
        console.error("[intake] finalize error:", err);
        setPhase("error");
        setErrorMsg("We had trouble saving your intake. Please speak to a staff member.");
      }
    }

    finalize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Modal is triggered by onDone from EmailCaptureModal (send or skip)

  const handleStart = useCallback(async () => {
    // Clear any stored confirmation so a new intake starts fresh
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setPhase("connecting");
    setMessages([]);
    messagesRef.current = [];
    msgCounterRef.current = 0;
    hasConnectedRef.current = false;
    setFinalizeResult(null);
    setShowModal(false);
    try {
      const res = await fetch("/api/voice/token");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.errors?.[0] ?? `Token request failed (${res.status})`);
      const { conversationToken } = body;
      if (!conversationToken) throw new Error("No conversation token in response");
      await conversation.startSession({ conversationToken });
    } catch (err) {
      console.error("[intake] start error:", err);
      setPhase("error");
      setErrorMsg(err.message ?? "Could not connect to the voice agent. Please try again.");
    }
  }, [conversation]);

  const handleEnd = useCallback(() => {
    conversation.endSession();
  }, [conversation]);

  const BG = "bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px]";

  const statusLabel =
    phase === "connecting"
      ? "Connecting…"
      : isSpeaking
        ? "AI is speaking"
        : isListening
          ? "AI is listening"
          : phase === "active"
            ? "Connected"
            : null;

  // --- Done: confirmation screen ---
  if (phase === "done" && finalizeResult) {
    return (
      <>
        {showModal && <CredentialsModal onClose={() => setShowModal(false)} />}
        <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] flex items-center justify-center px-6">
          <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
            <svg className="w-12 h-12 text-gray-900" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900">You&apos;re all set</h2>
            <EmailCaptureModal
              caseId={finalizeResult.caseId}
              patientId={finalizeResult.patientId}
              queuePosition={finalizeResult.queuePosition}
              onDone={() => { setShowModal(true); setShowHomeButton(true); }}
            />
            {showHomeButton && (
              <Link
                href="/"
                onClick={() => { try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }}
                className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50"
              >
                Back to home
              </Link>
            )}
          </div>
        </div>
      </>
    );
  }

  if (phase === "error") {
    return (
      <div className={`min-h-screen ${BG} flex items-center justify-center px-6`}>
        <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-2xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
          <button
            onClick={() => { setPhase("idle"); setErrorMsg(null); }}
            className="px-6 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${BG} flex flex-col`}>
      <div className="px-6 pt-10 pb-4 flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-medium tracking-widest text-gray-400 uppercase">FirstIn</span>
        <h1 className="text-3xl font-semibold text-gray-900">Voice Intake</h1>
        <button
          onClick={onBack}
          className="mt-2 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          ← Switch to text
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        {phase === "active" && (
          <>
            <span className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-blue-500 animate-pulse" : isListening ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-sm text-gray-500">
              {isSpeaking ? "AI is speaking" : isListening ? "AI is listening" : "Connected"}
            </span>
          </>
        )}
        {phase === "connecting" && (
          <span className="text-sm text-gray-400 animate-pulse">Connecting…</span>
        )}
        {phase === "ending" && (
          <span className="text-sm text-gray-400 animate-pulse">Processing your intake…</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 max-w-lg mx-auto w-full">
        {messages.length === 0 && phase === "active" && (
          <p className="text-center text-gray-300 text-sm mt-8">
            Start speaking — your words will appear here.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.source === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.source === "user"
                ? "bg-gray-900 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-800 rounded-bl-sm"
            }`}>
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 pb-12 flex flex-col items-center gap-4">
        {phase === "idle" && (
          <button
            onClick={handleStart}
            className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
          >
            <Mic className="w-8 h-8 text-white" strokeWidth={1.5} />
          </button>
        )}
        {phase === "connecting" && (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
            <Mic className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
          </div>
        )}
        {phase === "active" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {isSpeaking ? (
                <><Volume2 className="w-3.5 h-3.5" /> AI speaking</>
              ) : (
                <><Mic className="w-3.5 h-3.5" /> Listening</>
              )}
            </div>
            <button
              onClick={handleEnd}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-sm text-gray-500 font-medium hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              End conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Page: mode selection then selected intake ---

export default function IntakePage() {
  const [mode, setMode] = useState(null); // null | "voice" | "text"
  const [expanding, setExpanding] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 20);
    return () => clearTimeout(t);
  }, []);

  function handleSelect(selected) {
    setExpanding(true);
    setTimeout(() => {
      setMode(selected);
      setExpanding(false);
    }, 350);
  }

  const fadeOverlay = (
    <div
      className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-300"
      style={{ opacity: entered ? 0 : 1 }}
    />
  );

  if (mode === null) {
    return (
      <>
        {fadeOverlay}
        <div
          className="transition-opacity duration-300"
          style={{ opacity: expanding ? 0 : 1 }}
        >
          <ModeSelector onSelect={handleSelect} />
        </div>
      </>
    );
  }

  if (mode === "text") {
    return (
      <div
        className="animate-in fade-in duration-300"
      >
        <TextIntake onBack={() => setMode(null)} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <ConversationProvider>
        <VoiceIntake onBack={() => setMode(null)} />
      </ConversationProvider>
    </div>
  );
}
