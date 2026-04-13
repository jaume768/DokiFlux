"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  index?: number;
  isOpen?: boolean;
  onToggle?: () => void;
  isVisible?: boolean;
}

export function FAQItem({ question, answer, index = 0, isOpen: controlledOpen, onToggle, isVisible = true }: FAQItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleToggle = onToggle || (() => setInternalOpen((p) => !p));

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [answer]);

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: isOpen ? "rgba(139,92,246,0.07)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isOpen ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: isOpen ? "0 8px 40px rgba(139,92,246,0.10)" : "none",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.55s ease ${index * 0.07}s, transform 0.55s ease ${index * 0.07}s, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease`,
      }}
    >
      <button
        className="w-full flex items-start gap-4 px-6 py-5 text-left focus:outline-none"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span
          className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all duration-300"
          style={{
            background: isOpen ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isOpen ? "rgba(139,92,246,0.40)" : "rgba(255,255,255,0.08)"}`,
            color: isOpen ? "#c084fc" : "rgba(255,255,255,0.30)",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <span
          className="flex-1 text-[15px] font-semibold leading-snug transition-colors duration-300"
          style={{ color: isOpen ? "#fff" : "rgba(255,255,255,0.70)" }}
        >
          {question}
        </span>

        <span
          className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-lg flex items-center justify-center transition-all duration-300"
          style={{
            background: isOpen ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isOpen ? "rgba(139,92,246,0.40)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          {isOpen ? (
            <Minus size={13} strokeWidth={2.5} style={{ color: "#c084fc" }} />
          ) : (
            <Plus size={13} strokeWidth={2.5} className="text-white/40 group-hover:text-white/70 transition-colors duration-200" />
          )}
        </span>
      </button>

      <div
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : "0px",
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div ref={contentRef}>
          <div
            className="mx-6 h-px"
            style={{ background: "linear-gradient(to right, rgba(139,92,246,0.25), transparent)" }}
          />
          <div className="px-6 py-5 pl-[4.25rem]">
            <p className="text-white/50 text-[14px] leading-relaxed">{answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
