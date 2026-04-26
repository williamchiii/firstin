"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import EmailCaptureModal from "@/components/EmailCaptureModal.jsx";

// --- Inner component (must be inside ConversationProvider) ---

function VoiceIntake() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | connecting | active | ending | done | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [finalizeResult, setFinalizeResult] = useState(null);
  const messagesEndRef = useRef(null);
  const hasConnectedRef = useRef(false);
  const msgCounterRef = useRef(0);
  // Mirror of messages state — lets the finalize effect read the latest messages
  // without depending on React re-render timing when onDisconnect fires.
  const messagesRef = useRef([]);

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
      // Strip any [Tag] SSML/prosody markers (e.g. [Warmly], [slow], [pause])
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

    // Use the ref — has all messages regardless of render timing
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
        setFinalizeResult(data);
        setPhase("done");
      } catch (err) {
        console.error("[intake] finalize error:", err);
        setPhase("error");
        setErrorMsg(
          "We had trouble saving your intake. Please speak to a staff member.",
        );
      }
    }

    finalize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // --- Start session ---
  const handleStart = useCallback(async () => {
    setPhase("connecting");
    setMessages([]);
    messagesRef.current = [];
    msgCounterRef.current = 0;
    hasConnectedRef.current = false;
    try {
      const res = await fetch("/api/voice/token");
      const body = await res.json();
      if (!res.ok) {
        console.error("[intake] token route error:", body);
        throw new Error(
          body?.errors?.[0] ?? `Token request failed (${res.status})`,
        );
      }
      const { conversationToken } = body;
      if (!conversationToken)
        throw new Error("No conversation token in response");
      await conversation.startSession({ conversationToken });
    } catch (err) {
      console.error("[intake] start error:", err);
      setPhase("error");
      setErrorMsg(
        err.message ??
          "Could not connect to the voice agent. Please try again.",
      );
    }
  }, [conversation]);

  const handleEnd = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // --- Status indicator label ---
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

  // --- Done: show result + optional email capture ---
  if (phase === "done" && finalizeResult) {
    return (
      <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] flex items-center justify-center px-6">
        <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
          <span className="text-5xl">✅</span>
          <h2 className="text-2xl font-semibold text-gray-900">
            You&apos;re all set
          </h2>
          <p className="text-gray-500 text-sm">
            ESI level{" "}
            <strong className="text-gray-800">{finalizeResult.esi}</strong> ·
            Queue position{" "}
            <strong className="text-gray-800">
              #{finalizeResult.queuePosition}
            </strong>
          </p>
          <EmailCaptureModal
            caseId={finalizeResult.caseId}
            patientId={finalizeResult.patientId}
            queuePosition={finalizeResult.queuePosition}
          />
          <Link
            href={`/patient/status?patientId=${finalizeResult.patientId}&caseId=${finalizeResult.caseId}`}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
          >
            Check live queue status
          </Link>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] flex items-center justify-center px-6">
        <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-2xl font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
          <button
            onClick={() => {
              setPhase("idle");
              setErrorMsg(null);
            }}
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
        <span className="text-xs font-medium tracking-widest text-gray-400 uppercase">
          FirstIn
        </span>
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
          <span className="text-sm text-gray-400 animate-pulse">
            Connecting…
          </span>
        )}
        {phase === "ending" && (
          <span className="text-sm text-gray-400 animate-pulse">
            Processing your intake…
          </span>
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
                <>
                  <Volume2 className="w-3.5 h-3.5" /> AI speaking
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> Listening
                </>
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

// --- Page wrapper — provides ConversationProvider context ---

export default function IntakePage() {
  return (
    <ConversationProvider>
      <VoiceIntake />
    </ConversationProvider>
  );
}
