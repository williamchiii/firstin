"use client";

import { useState, useEffect } from "react";

/**
 * Types out a string with a typewriter effect that loops indefinitely.
 * @param {Object} props
 * @param {string} props.text - The string to type out
 * @param {string} [props.className] - Additional classes for the element
 */
export default function TypewriterText({ text, className = "" }) {
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let delay;
    if (!isDeleting && displayed.length < text.length) {
      delay = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 60);
    } else if (!isDeleting && displayed.length === text.length) {
      delay = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayed.length > 0) {
      delay = setTimeout(() => setDisplayed(text.slice(0, displayed.length - 1)), 35);
    } else if (isDeleting && displayed.length === 0) {
      delay = setTimeout(() => setIsDeleting(false), 400);
    }
    return () => clearTimeout(delay);
  }, [displayed, isDeleting, text]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}
