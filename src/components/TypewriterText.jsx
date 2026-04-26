"use client";

import { useState, useEffect } from "react";

/**
 * Types out a single string with a typewriter effect, cursor included.
 * @param {Object} props
 * @param {string} props.text - The string to type out
 * @param {string} [props.className] - Additional classes for the element
 */
export default function TypewriterText({ text, className = "" }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed.length < text.length) {
      const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 60);
      return () => clearTimeout(t);
    } else {
      setDone(true);
    }
  }, [displayed, text]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}
