"use client";

import type { AgentCard } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { AgentTopology } from "./agent-topology";
import {
  formatStreamEvent,
  metricCards,
  type DashboardEvent,
  type StreamEventPayload
} from "../../lib/dashboard-data";

type OnlineCount = {
  count: number;
  byType: Record<string, number>;
};

export function DashboardClient({ fullScreen = false }: { fullScreen?: boolean }) {
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [online, setOnline] = useState<OnlineCount>({
    count: 0,
    byType: {}
  });
  const [sseEvents, setSseEvents] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [agentsResponse, onlineResponse, historyResponse] = await Promise.all([
        fetch("/api/agents", { cache: "no-store" }),
        fetch("/api/agents/online", { cache: "no-store" }),
        fetch("/api/events/history", { cache: "no-store" })
      ]);
      const nextAgents = (await agentsResponse.json()) as AgentCard[];
      const nextOnline = (await onlineResponse.json()) as OnlineCount;
      const history = (await historyResponse.json()) as StreamEventPayload[];

      if (!cancelled) {
        setAgents(nextAgents);
        setOnline(nextOnline);
        setSseEvents(uniqueEvents(history.map(formatStreamEvent)).slice(0, 24));
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 5_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (message) => {
      const event = formatStreamEvent(JSON.parse(message.data) as StreamEventPayload);
      setSseEvents((current) => uniqueEvents([event, ...current]).slice(0, 24));
    };

    return () => {
      source.close();
    };
  }, []);

  const events = useMemo(() => {
    return sseEvents.slice(0, 24);
  }, [sseEvents]);
  const metrics = metricCards(online.count);

  return (
    <main className="min-h-screen bg-[#07080d] px-5 py-5 text-white lg:px-8">
      <section className="mx-auto grid max-w-[1600px] gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#22d3ee]">
              WishLive Live Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">
              A2A Agent Mission Control
            </h1>
          </div>
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 font-mono text-sm text-emerald-200">
            System healthy · SSE event latency &lt; 2s
          </div>
        </header>

        <div className={fullScreen ? "grid gap-5" : "grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"}>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                Agent Topology
              </h2>
              <span className="font-mono text-xs text-[#ddb7ff]">
                {agents.length || 57}+ nodes
              </span>
            </div>
            <AgentTopology agents={agents} />
          </section>

          {!fullScreen && (
            <section className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <div
                    className="rounded-lg border border-white/10 bg-[#11131b] p-4"
                    key={metric.label}
                  >
                    <p className="font-mono text-xs uppercase text-white/45">
                      {metric.label}
                    </p>
                    <p className={`mt-3 text-3xl font-black ${metric.tone}`}>
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>

              <NegotiationPanel />
            </section>
          )}
        </div>

        {!fullScreen && (
          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <EventStream events={events} />
            <BlockchainStatus />
          </div>
        )}
      </section>
    </main>
  );
}

function EventStream({
  events
}: {
  events: DashboardEvent[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Redis Event Stream
      </h2>
      <div className="max-h-[330px] overflow-hidden rounded-lg border border-white/10">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/[0.06] font-mono text-xs uppercase text-white/45">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Event</th>
              <th className="p-3">Agent</th>
              <th className="p-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr className="border-t border-white/8" key={event.id}>
                <td className="p-3 font-mono text-white/45">{event.time}</td>
                <td className="p-3 text-[#ddb7ff]">{event.type}</td>
                <td className="p-3 text-white/70">{event.agent}</td>
                <td className="p-3 text-white/55">{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NegotiationPanel() {
  return (
    <section className="rounded-lg border border-[#ddb7ff]/20 bg-[#11131b] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
          Negotiation Panel
        </h2>
        <span className="font-mono text-xs text-orange-300">ACTIVE · 07:32</span>
      </div>
      <div className="mt-4 grid gap-3">
        {[
          ["Musician", "Proposes 25% split"],
          ["Venue", "Counter 22% + min fee"],
          ["Musician", "Accepts 22%"],
          ["Negotiation", "Deal pending human confirmation"]
        ].map(([agent, message]) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3" key={message}>
            <p className="font-mono text-xs text-[#22d3ee]">{agent}</p>
            <p className="mt-1 text-sm text-white/75">{message}</p>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-lg bg-[#7c3aed] px-4 py-3 text-sm font-bold text-white">
        Confirm Deal · Human Confirmation
      </button>
    </section>
  );
}

function BlockchainStatus() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Blockchain Status
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["AgentProfile", "57 cards anchored"],
          ["Escrow", "15 pools ready"],
          ["TicketNFT", "128 minted"],
          ["Hardhat", "Chain 31337 healthy"]
        ].map(([label, value]) => (
          <div className="rounded-lg border border-white/10 bg-[#11131b] p-4" key={label}>
            <p className="font-mono text-xs uppercase text-white/45">{label}</p>
            <p className="mt-2 text-lg font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function uniqueEvents(events: DashboardEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });
}
