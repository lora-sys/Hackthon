"use client";

import type { AgentCard } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { formatStreamEvent, type DashboardEvent, type StreamEventPayload } from "../../lib/dashboard-data";

export default function MyAgentPage() {
  const [agentId, setAgentId] = useState("agent:musician:001");
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (message) => {
      const event = formatStreamEvent(JSON.parse(message.data) as StreamEventPayload);
      if (event.agent.includes(agentId.replace("agent:", "")) || event.detail.includes(agentId)) {
        setEvents((current) => uniqueEvents([event, ...current]).slice(0, 24));
      }
    };

    return () => source.close();
  }, [agentId]);

  async function refresh() {
    const [agentsResponse, eventsResponse] = await Promise.all([
      fetch("/api/agents", { cache: "no-store" }),
      fetch("/api/events/history", { cache: "no-store" })
    ]);
    const nextAgents = (await agentsResponse.json()) as AgentCard[];
    const history = ((await eventsResponse.json()) as StreamEventPayload[])
      .map(formatStreamEvent)
      .filter((event) => event.agent.includes(agentId.replace("agent:", "")) || event.detail.includes(agentId));
    setAgents(nextAgents);
    setEvents(uniqueEvents(history).slice(0, 24));
  }

  const agent = useMemo(
    () => agents.find((entry) => entry.agent_id === agentId) ?? agents.find((entry) => entry.type === "musician"),
    [agentId, agents]
  );

  return (
    <main className="min-h-screen bg-[#07080d] px-5 py-6 text-white lg:px-8">
      <section className="mx-auto grid max-w-[1500px] gap-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#22d3ee]">
              My Agent
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              Card, inbox, tools, reputation
            </h1>
          </div>
          <select
            className="h-11 rounded-lg border border-white/10 bg-[#11131b] px-3 text-sm text-white"
            onChange={(event) => setAgentId(event.target.value)}
            value={agentId}
          >
            {agents
              .filter((entry) => entry.type === "musician" || entry.type === "venue" || entry.type === "audience")
              .slice(0, 30)
              .map((entry) => (
                <option key={entry.agent_id} value={entry.agent_id}>
                  {entry.name ?? entry.agent_id}
                </option>
              ))}
          </select>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              AgentCard
            </h2>
            {agent ? (
              <div className="mt-4 grid gap-4">
                <Info label="Agent" value={agent.name ?? agent.agent_id} />
                <Info label="A2A endpoint" value={agent.supported_interfaces[0]?.url ?? "missing"} />
                <Info label="Manager" value={agent.managerAgentId ?? "self-managed"} />
                <Info label="Skills" value={agent.skills.join(", ")} />
                <pre className="max-h-[380px] overflow-auto rounded-lg border border-white/10 bg-[#07080d] p-4 text-xs leading-6 text-white/65">
                  {JSON.stringify(agent, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/55">Loading agent roster.</p>
            )}
          </section>

          <section className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Reputation" value={String(agent?.reputation ?? 0)} />
              <Metric label="Tool Calls" value={String(events.filter((event) => event.type === "agent.tool_call").length)} />
              <Metric label="A2A Inbox" value={String(events.filter((event) => event.stream === "agent.task").length)} />
            </div>

            <section className="rounded-lg border border-[#ddb7ff]/20 bg-[#11131b] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                Recent Agent Events
              </h2>
              <div className="mt-4 grid max-h-[560px] gap-2 overflow-auto">
                {events.map((event) => (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3" key={event.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#ddb7ff]">{event.type}</span>
                      <span className="font-mono text-xs text-white/35">{event.stream}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">{event.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#11131b] p-3">
      <p className="font-mono text-xs uppercase text-white/40">{label}</p>
      <p className="mt-1 break-all text-sm text-white/75">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="font-mono text-xs uppercase text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#22d3ee]">{value}</p>
    </div>
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
