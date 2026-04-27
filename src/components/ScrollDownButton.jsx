"use client";

export default function ScrollDownButton({ targetId }) {
  return (
    <button
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })}
      className="mt-24 text-neutral-400 hover:text-neutral-700 transition-colors animate-bounce"
      aria-label="Scroll down"
    >
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
