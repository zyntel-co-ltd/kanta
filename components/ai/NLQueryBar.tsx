"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Sparkles, SendHorizontal, Loader2, AlertCircle, X } from "lucide-react";
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  latency_ms?: number;
};

const SUGGESTIONS = [
  "Show me the three highest-delay test categories this week",
  "Which sections had the most anomalies in the last 7 days?",
  "What is the average TAT for Microbiology this week?",
  "Are there any clusters of consecutive anomalies?",
];

export default function NLQueryBar({
  facilityId,
  userId,
}: {
  /** Required for correct multi-tenant queries; omit or pass null to disable */
  facilityId: string | null | undefined;
  userId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const send = async (question: string) => {
    if (!facilityId || !question.trim() || loading) return;
    setError(null);
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, facility_id: facilityId, user_id: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.answer,
        latency_ms: data.latency_ms,
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
    if (e.key === "Escape") setOpen(false);
  };

  const overlay =
    open &&
    mounted &&
    createPortal(
      <div className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center p-3 sm:p-6 pointer-events-auto">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />

        <div className="relative z-10 mt-auto sm:mt-0 w-full max-w-xl max-h-[min(85vh,32rem)] sm:max-h-[80vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Sparkles size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Kanta Intelligence</p>
                  <p className="text-[11px] text-slate-400">Operational data only · No patient inference</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Suggested questions</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 text-slate-600 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-sm"
                        : "bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                    {m.role === "assistant" && m.latency_ms && (
                      <p className="text-[10px] text-slate-400 mt-1">{(m.latency_ms / 1000).toFixed(1)}s</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-emerald-600" />
                    <span className="text-sm text-slate-500">Thinking…</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 px-3 py-3 flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about TAT, anomalies, volumes…"
                disabled={loading}
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-400 disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
              </button>
            </div>
          </div>
      </div>,
      document.body
    );

  if (!facilityId) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
        title="Select a facility to use AI queries"
      >
        <Sparkles size={14} />
        Ask Kanta AI
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
      >
        <Sparkles size={14} className="text-emerald-600" />
        Ask Kanta AI
      </button>
      {overlay}
    </>
  );
}
