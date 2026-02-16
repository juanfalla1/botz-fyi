"use client";

import React, { useState, useEffect, useCallback } from "react";

interface TextRotatorProps {
  words: string[];
  prefix?: string;
  suffix?: string;
  highlightColor?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

// Blinking cursor component
function Cursor({ color }: { color: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        display: "inline-block",
        width: "3px",
        height: "1em",
        backgroundColor: color,
        marginLeft: "2px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.1s",
        verticalAlign: "text-bottom",
      }}
    />
  );
}

export default function TextRotator({
  words,
  prefix = "La forma más rápida de ",
  suffix = ".",
  highlightColor = "#a3e635", // Lime green like dapta.ai
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
  className = "",
}: TextRotatorProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentWord = words[currentWordIndex];

  const typeNextChar = useCallback(() => {
    if (isPaused) return;

    if (!isDeleting) {
      // Typing phase
      if (displayText.length < currentWord.length) {
        setDisplayText(currentWord.slice(0, displayText.length + 1));
      } else {
        // Word complete, pause before deleting
        setIsPaused(true);
        setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      // Deleting phase
      if (displayText.length > 0) {
        setDisplayText(currentWord.slice(0, displayText.length - 1));
      } else {
        // Move to next word
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      }
    }
  }, [displayText, currentWord, isDeleting, isPaused, pauseDuration, words.length]);

  useEffect(() => {
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(typeNextChar, speed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, typingSpeed, deletingSpeed, typeNextChar]);

  return (
    <span className={className} style={{ display: "inline", whiteSpace: "pre-wrap" }}>
      <span style={{ color: "inherit" }}>{prefix}</span>
      <span
        style={{
          color: highlightColor,
          fontWeight: "bold",
          position: "relative",
        }}
      >
        {displayText}
        <Cursor color={highlightColor} />
      </span>
      <span style={{ color: "inherit" }}>{suffix}</span>
    </span>
  );
}

// Alternative version with scramble effect (like hacker text)
export function TextScramble({
  words,
  prefix = "Automatiza ",
  suffix = " con IA.",
  highlightColor = "#a3e635",
  className = "",
}: Omit<TextRotatorProps, "typingSpeed" | "deletingSpeed" | "pauseDuration"> & { 
  scrambleDuration?: number;
  pauseDuration?: number;
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState(words[0]);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const scrambleDuration = 2000;
  const pauseDuration = 3000;

  useEffect(() => {
    const targetWord = words[currentWordIndex];
    let iteration = 0;
    const totalIterations = 10;
    const intervalTime = scrambleDuration / totalIterations;

    const interval = setInterval(() => {
      setDisplayText(
        targetWord
          .split("")
          .map((char, index) => {
            if (index < iteration) {
              return targetWord[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= targetWord.length) {
        clearInterval(interval);
        setTimeout(() => {
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }, pauseDuration);
      }

      iteration += 1 / 3;
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentWordIndex, words, scrambleDuration, pauseDuration, chars]);

  return (
    <span className={className} style={{ display: "inline", whiteSpace: "pre-wrap" }}>
      <span style={{ color: "inherit" }}>{prefix}</span>
      <span
        style={{
          color: highlightColor,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        {displayText}
      </span>
      <span style={{ color: "inherit" }}>{suffix}</span>
    </span>
  );
}
