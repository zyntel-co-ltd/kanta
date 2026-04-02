"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Sparkles, SendHorizontal, Loader2, AlertCircle, X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSyncQueue } from "@/lib/SyncQueueContext";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";
type MessageLink = { label: string; href: string };
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  latency_ms?: number;
  links?: MessageLink[];
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
  const { isOnline } = useSyncQueue();
  const { aiPanelOpen, setAiPanelOpen } = useSidebarLayout();
  const open = aiPanelOpen;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

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
        links: Array.isArray(data.links) ? data.links : [],
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
    if (e.key === "Escape") setAiPanelOpen(false);
  };

  const overlay =
    open &&
    mounted &&
    createPortal(
      <div className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center p-3 sm:p-6 pointer-events-auto">
        <div
          className="fixed inset-0 z-[199] bg-black/20"
          onClick={() => setAiPanelOpen(false)}
          aria-hidden
        />

        <div
          className={`fixed z-[200] bg-white border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
            isMobile
              ? `left-0 right-0 bottom-0 h-[85vh] rounded-t-2xl border-t transform ${open ? "translate-y-0" : "translate-y-full"}`
              : `top-0 right-0 h-screen w-[380px] max-w-full border-l transform ${open ? "translate-x-0" : "translate-x-full"}`
          }`}
        >
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
              <button onClick={() => setAiPanelOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50">
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
                    {m.role === "assistant" && Array.isArray(m.links) && m.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((link) => (
                          <button
                            key={`${m.id}-${link.href}-${link.label}`}
                            type="button"
                            onClick={() => router.push(link.href)}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2.5 py-1 rounded-full hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <span>{link.label}</span>
                            <ArrowRight size={11} />
                          </button>
                        ))}
                      </div>
                    )}
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

  if (!isOnline) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-amber-200 bg-amber-50 text-amber-900/90 cursor-not-allowed"
        title="Available when online"
      >
        <Sparkles size={14} className="text-amber-600" />
        Ask Kanta AI
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAiPanelOpen(true);
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
