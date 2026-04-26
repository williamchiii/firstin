"use client";

import { useState, useEffect } from "react";

/**
 * TypewriterHeadline cycles through multiple headlines with a typewriter effect
 * @returns {JSX.Element} The animated headline
 */
export default function TypewriterHeadline() {
  const headlines = [
    "The next generation triage management.",
    "The fastest way to check-in.",
  ];

  const [displayedText, setDisplayedText] = useState("");
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Typewriter animation loop ---
  useEffect(() => {
    const currentHeadline = headlines[headlineIndex];
    const typingSpeed = isDeleting ? 50 : 80;
    const pauseTime = 2000;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentHeadline.length) {
        // Typing forward
        setDisplayedText(currentHeadline.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (isDeleting && charIndex > 0) {
        // Deleting backward
        setDisplayedText(currentHeadline.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (!isDeleting && charIndex === currentHeadline.length) {
        // Pause before deleting
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex === 0) {
        // Move to next headline
        setIsDeleting(false);
        setHeadlineIndex((prev) => (prev + 1) % headlines.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, headlineIndex]);

  return (
    <p className="mt-6 w-full text-xl font-normal leading-snug text-neutral-500 sm:text-2xl">
      {displayedText}
      <span className="animate-pulse">|</span>
    </p>
  );
}
