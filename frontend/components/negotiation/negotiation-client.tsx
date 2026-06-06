"use client";

import { Button } from "@heroui/react";
import type { Deal, Demand, Negotiation } from "@wishlive/shared";
import { useEffect, useState } from "react";
import { formatStreamEvent, type DashboardEvent, type StreamEventPayload } from "../../lib/dashboard-data";

type RunState = {
  negotiation: Negotiation | null;
  deal: Deal | null;
  settlement: unknown;
};

const baseTerms = {
  venueFee: 5_000,
  splitPercentage: 25,
  schedule: {
    date: "2026-07-17",
    startTime: "19:00",
    endTime: "22:00"
  }
};

export function NegotiationClient({ negotiationId }: { negotiationId: string }) {
  const [state, setState] = useState<RunState>({
    negotiation: null,
    deal: null,
    settlement: null
  });
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (negotiationId !== "demo") {
      void refreshNegotiation();
    }
    void refreshEvents();
  }, [negotiationId]);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (message) => {
      const event = formatStreamEvent(JSON.parse(message.data) as StreamEventPayload);
      if (
        event.stream === "agent.task" ||
        event.stream === "agent.runtime" ||
        event.stream === "negotiation.events" ||
        event.stream === "show.events" ||
        event.stream === "settlement.events"
      ) {
        setEvents((current) => uniqueEvents([event, ...current]).slice(0, 24));
      }
    };

    return () => {
      source.close();
    };
  }, []);

  async function runDemo() {
    setRunning(true);
    setError(null);
    try {
      const demand = await ensureDemand();
      const musicianId = demand.matching?.musicians[0]?.agentId;
      const venueId = demand.matching?.venues[0]?.agentId;
      if (!musicianId || !venueId) {
        throw new Error("Matching candidates are required before negotiation");
      }

      const negotiation = (await postJson("/api/negotiation", {
        demandId: demand.demandId,
        musicianId,
        venueId
      })) as Negotiation;
      const proposal = (await postJson(`/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}/proposal`, {
        from: musicianId,
        to: venueId,
        terms: baseTerms
      })) as { proposalId: string };
      const counter = (await postJson(`/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}/counter`, {
        proposalId: proposal.proposalId,
        from: venueId,
        newTerms: {
          ...baseTerms,
          venueFee: 4_000,
          splitPercentage: 22
        }
      })) as { proposalId: string };
      const accepted = (await postJson(`/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}/accept`, {
        proposalId: counter.proposalId,
        from: musicianId
      })) as { deal: Deal };
      const settled = await postJson(`/api/deals/${encodeURIComponent(accepted.deal.dealId)}/confirm`, {
        signature: "browser-human-confirmation"
      });
      const nextNegotiation = (await fetchJson(
        `/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}`
      )) as Negotiation;

      setState({
        negotiation: nextNegotiation,
        deal: nextNegotiation.deal,
        settlement: settled
      });
      await refreshEvents();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Negotiation demo failed");
    } finally {
      setRunning(false);
    }
  }

  async function refreshEvents() {
    const history = ((await fetchJson("/api/events/history")) as StreamEventPayload[])
      .filter((entry) =>
        ["agent.task", "agent.runtime", "negotiation.events", "show.events", "settlement.events"].includes(entry.stream)
      )
      .map(formatStreamEvent);
    setEvents(uniqueEvents(history).slice(0, 24));
  }

  async function refreshNegotiation() {
    const nextNegotiation = (await fetchJson(
      `/api/negotiation/${encodeURIComponent(negotiationId)}`
    )) as Negotiation;
    setState({
      negotiation: nextNegotiation,
      deal: nextNegotiation.deal,
      settlement: null
    });
  }

  return (
    <main className="min-h-screen bg-[#07080d] px-5 py-6 text-white lg:px-8">
      <section className="mx-auto grid max-w-[1500px] gap-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#22d3ee]">
              A2A Negotiation Panel
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              Musician Agent ↔ Venue Agent
            </h1>
          </div>
          <Button
            className="rounded-lg bg-[#ddb7ff] px-5 py-3 font-bold text-[#22003f]"
            isDisabled={running}
            onPress={() => void (negotiationId === "demo" ? runDemo() : refreshNegotiation())}
          >
            {running ? "Running..." : negotiationId === "demo" ? "Start Agent-Agent Flow" : "Refresh Flow"}
          </Button>
        </header>

        {error && (
          <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        )}

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              Negotiation State
            </h2>
            <div className="mt-5 grid gap-3">
              <StateRow label="Negotiation" value={state.negotiation?.negotiationId ?? "waiting"} />
              <StateRow label="Status" value={state.negotiation?.status ?? "PENDING"} />
              <StateRow label="Musician" value={state.negotiation?.musicianId ?? "from Matching Top 1"} />
              <StateRow label="Venue" value={state.negotiation?.venueId ?? "from Matching Top 1"} />
              <StateRow label="Deal" value={state.deal?.dealId ?? "not created"} />
              <StateRow label="Deal Status" value={state.deal?.status ?? "not confirmed"} />
              <StateRow label="Escrow" value={state.deal?.escrowId ?? "blocked until confirm"} />
              <StateRow label="Ticket" value={state.deal?.ticketId ?? "blocked until confirm"} />
            </div>
          </section>

          <section className="rounded-lg border border-[#ddb7ff]/20 bg-[#11131b] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              Agent-Agent Chat
            </h2>
            <div className="mt-5 grid gap-3">
              {events
                .filter((event) => event.stream === "agent.runtime" || event.stream === "agent.task")
                .slice(0, 8)
                .map((event) => (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3" key={event.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs text-[#22d3ee]">{event.agent}</p>
                      <p className="font-mono text-xs text-white/40">{event.type}</p>
                    </div>
                    <p className="mt-2 text-sm text-white/70">{event.detail}</p>
                  </div>
                ))}
              {(state.negotiation?.proposals ?? []).map((proposal) => (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3" key={proposal.proposalId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs text-[#22d3ee]">
                      {proposal.type} · {proposal.decision}
                    </p>
                    <p className="font-mono text-xs text-white/40">{proposal.terms.venueFee} USDT</p>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    {proposal.senderAgentId} → {proposal.receiverAgentId}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    split {proposal.terms.splitPercentage}% · {proposal.terms.schedule.startTime}-
                    {proposal.terms.schedule.endTime}
                  </p>
                </div>
              ))}
              {!state.negotiation?.proposals.length && events.length === 0 && (
                <p className="text-sm text-white/55">Waiting for agent messages.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
            Redis A2A + Settlement Event Chain
          </h2>
          <div className="mt-4 grid max-h-[430px] gap-2 overflow-auto">
            {events.map((event) => (
              <div className="rounded-lg border border-white/10 bg-[#11131b] p-3" key={event.id}>
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
    </main>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-white/10 bg-[#11131b] p-3">
      <span className="font-mono text-xs uppercase text-white/40">{label}</span>
      <span className="break-all text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

async function ensureDemand(): Promise<Demand> {
  let demands = (await fetchJson("/api/wishes/demands")) as Demand[];
  const existing = demands.find((demand) => demand.status === "MATCHED" && demand.matching);
  if (existing) {
    return existing;
  }

  const runId = crypto.randomUUID().slice(0, 8);
  for (let index = 1; index <= 10; index += 1) {
    await postJson("/api/wishes", {
      userId: `user:negotiation:${runId}:${index}`,
      artistName: "Neon Harbor",
      genre: "rock",
      city: "shanghai",
      date: "2026-07-17",
      depositAmount: 20
    });
  }

  demands = (await fetchJson("/api/wishes/demands")) as Demand[];
  const created = demands.find((demand) => demand.status === "MATCHED" && demand.matching);
  if (!created) {
    throw new Error("Demand creation failed");
  }
  return created;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new Error(body.error ?? `GET ${url} failed`);
  }
  return response.json();
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const payload = await readErrorBody(response);
    throw new Error(payload.error ?? `POST ${url} failed`);
  }
  return response.json();
}

async function readErrorBody(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return { error: text };
  }
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
