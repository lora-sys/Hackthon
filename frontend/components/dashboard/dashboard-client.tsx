"use client";

import type { AgentCard } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { AgentTopology } from "./agent-topology";
import { useLanguage } from "../language-provider";
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

type ContractStatus = {
  chainId: number;
  health: string;
  mode: string;
  counts: {
    deals: number;
    escrows: number;
    tickets: number;
    tx: number;
  };
};

export function DashboardClient({ fullScreen = false }: { fullScreen?: boolean }) {
  const { t } = useLanguage();
  const [loadError, setLoadError] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [online, setOnline] = useState<OnlineCount>({
    count: 0,
    byType: {}
  });
  const [sseEvents, setSseEvents] = useState<DashboardEvent[]>([]);
  const [contracts, setContracts] = useState<ContractStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
      const [agentsResponse, onlineResponse, historyResponse, contractsResponse] = await Promise.all([
        fetch("/api/agents", { cache: "no-store", signal: AbortSignal.timeout(4000) }),
        fetch("/api/agents/online", { cache: "no-store", signal: AbortSignal.timeout(4000) }),
        fetch("/api/events/history", { cache: "no-store", signal: AbortSignal.timeout(4000) }),
        fetch("/api/contracts/status", { cache: "no-store", signal: AbortSignal.timeout(4000) })
      ]);
      if (![agentsResponse, onlineResponse, historyResponse, contractsResponse].every((response) => response.ok)) throw new Error("Dependencies unavailable");
      const nextAgents = (await agentsResponse.json()) as AgentCard[];
      const nextOnline = (await onlineResponse.json()) as OnlineCount;
      const history = (await historyResponse.json()) as StreamEventPayload[];
      const nextContracts = (await contractsResponse.json()) as ContractStatus;

      if (!cancelled) {
        setLoadError(false);
        setAgents(nextAgents);
        setOnline(nextOnline);
        setSseEvents(uniqueEvents(history.map(formatStreamEvent)).slice(0, 80));
        setContracts(nextContracts);
      }
      } catch {
        if (!cancelled) setLoadError(true);
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
    source.onopen = () => setStreamConnected(true);
    source.onerror = () => setStreamConnected(false);
    source.onmessage = (message) => {
      const event = formatStreamEvent(JSON.parse(message.data) as StreamEventPayload);
      setSseEvents((current) => uniqueEvents([event, ...current]).slice(0, 80));
    };

    return () => {
      source.close();
    };
  }, []);

  const events = useMemo(() => {
    return sseEvents.slice(0, 80);
  }, [sseEvents]);
  const metrics = metricCards(online.count, {
    activeTasks: events.filter((event) => event.stream === "agent.runtime" || event.stream === "agent.task").length,
    negotiations: events.filter((event) => event.stream === "negotiation.events").length,
    onChainTx: contracts?.counts.tx ?? events.filter((event) => event.type.startsWith("contract.")).length
  });

  return (
    <main className="wl-dashboard min-h-screen bg-[#07080d] px-5 py-5 text-white lg:px-8">
      <section className="mx-auto grid max-w-[1600px] gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#22d3ee]">
              WishLive Live Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">
              {t("智能体协作控制台", "A2A Agent Mission Control")}
            </h1>
          </div>
          <div role="status" className="rounded-lg border border-white/25 px-4 py-2 font-mono text-sm text-amber-200">
            {loadError ? t("服务异常 · 数据暂不可用", "Service unavailable · data may be stale")
              : !contracts ? t("正在检查服务…", "Checking services...")
              : contracts.health !== "healthy" || !streamConnected
                ? t("部分服务未连接", "Some services are disconnected")
                : t("服务已连接 · 延迟未测量", "Services connected · latency not measured")}
          </div>
        </header>

        <div className={fullScreen ? "grid gap-5" : "grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"}>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                Agent Topology
              </h2>
              <span className="font-mono text-xs text-[#ddb7ff]">
                {agents.length} {t("个节点", "nodes")}
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

              <NegotiationPanel events={events} />
            </section>
          )}
        </div>

        {!fullScreen && (
          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <EventStream events={events} />
            <BlockchainStatus contracts={contracts} />
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
      <div className="max-h-[330px] overflow-auto rounded-lg border border-white/10">
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

function NegotiationPanel({ events }: { events: DashboardEvent[] }) {
  const discoveryEvents = events.filter((event) => event.stream === "a2a.discovery").slice(0, 2);
  const runtimeEvents = events.filter((event) => event.stream === "agent.runtime").slice(0, 2);
  const negotiationEvents = uniqueEvents([
    ...events
      .filter((event) => ["negotiation.events", "agent.task"].includes(event.stream ?? ""))
      .slice(0, 2),
    ...runtimeEvents,
    ...discoveryEvents
  ]).slice(0, 6);

  return (
    <section className="rounded-lg border border-[#ddb7ff]/20 bg-[#11131b] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
          Agent Activity Panel
        </h2>
        <span className="font-mono text-xs text-orange-300">{negotiationEvents.length} live events</span>
      </div>
      <div className="mt-4 grid gap-3">
        {negotiationEvents.map((event) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3" key={event.id}>
            <p className="font-mono text-xs text-[#22d3ee]">{event.type}</p>
            <p className="mt-1 text-sm text-white/75">{event.detail}</p>
          </div>
        ))}
        {negotiationEvents.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/50">
            Waiting for A2A discovery or agent tool calls.
          </p>
        )}
      </div>
    </section>
  );
}

function BlockchainStatus({ contracts }: { contracts: ContractStatus | null }) {
  const network = contracts?.chainId === 11155111 ? "Sepolia" : "Hardhat";
  const rows = [
    ["AgentProfile", "Not verified / 未验证"],
    ["Escrow", `${contracts?.counts.escrows ?? 0} pools`],
    ["TicketNFT", `${contracts?.counts.tickets ?? 0} minted`],
    [network, `Chain ${contracts?.chainId ?? 31337} ${contracts?.health ?? "unknown"}`]
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Blockchain Status
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
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
