"use client";

import { useState } from "react";

type ConciergeMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ConciergeFloat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("当前流程到哪一步？哪个 agent 正在谈判？为什么还没出票？");
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    const trimmed = message.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setMessage("");
    try {
      const response = await fetch("/api/concierge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          workflowId: workflowFromPath(),
          conversationId: conversationFromPath()
        })
      });
      const content = await response.text();
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: content || "Concierge 没有拿到回答。"
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Concierge request failed"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 grid justify-items-end gap-3 text-white">
      {open && (
        <section className="w-[min(420px,calc(100vw-2.5rem))] overflow-hidden rounded-lg border border-[#22d3ee]/30 bg-[#080a10]/95 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <header className="border-b border-white/10 px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#22d3ee]">
              Concierge Agent
            </p>
            <p className="mt-1 text-sm text-white/55">Live workflow explainer</p>
          </header>
          <div className="grid max-h-[360px] gap-3 overflow-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/60">
                Ask about agent status, current negotiation, missing confirmation, escrow, or tickets.
              </p>
            )}
            {messages.map((entry, index) => (
              <div
                className={`rounded-lg border p-3 text-sm leading-6 ${
                  entry.role === "user"
                    ? "border-[#ddb7ff]/25 bg-[#ddb7ff]/10 text-[#f7e8ff]"
                    : "border-[#22d3ee]/20 bg-[#22d3ee]/10 text-cyan-50"
                }`}
                key={`${entry.role}-${index}`}
              >
                {entry.content}
              </div>
            ))}
          </div>
          <form
            className="grid gap-2 border-t border-white/10 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <textarea
              className="min-h-20 resize-none rounded-lg border border-white/10 bg-[#11131b] px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/30"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="问 Concierge 当前流程状态..."
              value={message}
            />
            <button
              className="rounded-lg bg-[#22d3ee] px-4 py-2 text-sm font-bold text-[#041015] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Thinking..." : "Ask Concierge"}
            </button>
          </form>
        </section>
      )}
      <button
        aria-label="Toggle Concierge"
        className="rounded-full border border-[#22d3ee]/40 bg-[#0b1320] px-5 py-3 font-mono text-sm font-bold uppercase tracking-[0.14em] text-[#22d3ee] shadow-xl shadow-cyan-950/50 transition hover:border-[#ddb7ff] hover:text-[#ddb7ff]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Concierge
      </button>
    </div>
  );
}

function workflowFromPath() {
  if (typeof window === "undefined") {
    return undefined;
  }
  const match = window.location.pathname.match(/workflow:[^/?#]+/);
  return match?.[0];
}

function conversationFromPath() {
  if (typeof window === "undefined") {
    return undefined;
  }
  if (window.location.pathname.startsWith("/negotiation/")) {
    return decodeURIComponent(window.location.pathname.split("/").pop() ?? "");
  }
  return undefined;
}
