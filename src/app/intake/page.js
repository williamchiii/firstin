"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import EmailCaptureModal from "@/components/EmailCaptureModal.jsx";

const STORAGE_KEY = "firstin.finalize";

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
            <span className="font-medium text-gray-900">Marcus Reed</span>
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

// --- Inner component (must be inside ConversationProvider) ---

function VoiceIntake() {
  const [messages, setMessages] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | connecting | active | ending | done | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [finalizeResult, setFinalizeResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  const { status, isSpeaking, isListening } = conversation;

  // --- Auto-scroll transcript ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Finalize when agent disconnects ---
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

  // --- Show credentials modal 2s after confirmation appears ---
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setShowModal(true), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // --- Start session ---
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

  const handleEnd = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

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
            <span className="text-5xl">✅</span>
            <h2 className="text-2xl font-semibold text-gray-900">You&apos;re all set</h2>
            <p className="text-gray-500 text-sm">
              ESI level{" "}
              <strong className="text-gray-800">{finalizeResult.esi}</strong> ·
              Queue position{" "}
              <strong className="text-gray-800">#{finalizeResult.queuePosition}</strong>
            </p>
            <EmailCaptureModal
              caseId={finalizeResult.caseId}
              patientId={finalizeResult.patientId}
              queuePosition={finalizeResult.queuePosition}
            />
            <div className="w-full flex flex-col gap-2">
              <Link
                href={`/patient/status?patientId=${finalizeResult.patientId}&caseId=${finalizeResult.caseId}`}
                className="text-sm text-gray-700 underline underline-offset-2 hover:text-gray-900"
              >
                Check live queue status
              </Link>
              <Link
                href="/patient/login"
                className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Patient sign-in
              </Link>
              <Link
                href="/staff/login"
                className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Staff sign-in
              </Link>
              <Link
                href="/"
                className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 mt-1"
              >
                Back to home
              </Link>
            </div>
            <button
              onClick={() => {
                try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                setPhase("idle");
                setFinalizeResult(null);
                setShowModal(false);
              }}
              className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
            >
              Start new intake
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- Error state ---
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex flex-col items-center gap-1 text-center">
        <span className="text-xs font-medium tracking-widest text-gray-400 uppercase">FirstIn</span>
        <h1 className="text-xl font-semibold text-gray-900">Voice Intake</h1>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 py-3">
        {phase === "active" && (
          <>
            <span
              className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-blue-500 animate-pulse" : isListening ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
            <span className="text-sm text-gray-500">{statusLabel}</span>
          </>
        )}
        {phase === "connecting" && (
          <span className="text-sm text-gray-400 animate-pulse">Connecting…</span>
        )}
        {phase === "ending" && (
          <span className="text-sm text-gray-400 animate-pulse">Processing your intake…</span>
        )}
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 max-w-lg mx-auto w-full">
        {messages.length === 0 && phase === "active" && (
          <p className="text-center text-gray-300 text-sm mt-8">
            Start speaking — your words will appear here.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.source === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.source === "user"
                  ? "bg-gray-900 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
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

// --- Page wrapper ---

export default function IntakePage() {
  return (
    <ConversationProvider>
      <VoiceIntake />
    </ConversationProvider>
  );
}
