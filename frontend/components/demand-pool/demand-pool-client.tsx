"use client";

import type { AgentCard, Deal, Demand, Negotiation } from "@wishlive/shared";
import { useEffect, useState } from "react";
import { DemoImage, WishLiveShell } from "../demo/wishlive-shell";

type DemandPayload = {
  demand: Demand;
  musicianCards: AgentCard[];
  venueCards: AgentCard[];
  analysis: {
    demandScore: number;
    probability: number;
    completed: string[];
  };
};

export function DemandPoolClient({ demandId }: { demandId: string }) {
  const [payload, setPayload] = useState<DemandPayload | null>(null);
  const [status, setStatus] = useState("Loading demand pool.");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void loadDemand();
  }, [demandId]);

  async function loadDemand() {
    setError(null);
    try {
      const response = await fetch(`/api/demands/${encodeURIComponent(demandId)}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? "Demand not found");
      }
      setPayload((await response.json()) as DemandPayload);
      setStatus("Matching Agent found candidates through manager discovery.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Demand loading failed");
    }
  }

  async function startNegotiation() {
    if (!payload?.demand.matching) {
      return;
    }
    setRunning(true);
    setError(null);
    setStatus("Negotiation Agent is opening A2A room.");
    try {
      const negotiationId = await startAgentNegotiation(payload.demand);
      window.location.href = `/negotiation/${encodeURIComponent(negotiationId)}`;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "A2A negotiation failed");
    } finally {
      setRunning(false);
    }
  }

  const demand = payload?.demand;

  return (
    <WishLiveShell active="Matches" online={57} section="Market">
      <div className="grid gap-9">
        <header>
          <h1 className="text-6xl font-black leading-none tracking-tight md:text-7xl">Demand Pool</h1>
          <p className="mt-4 text-2xl font-bold text-white/48">
            Aggregated audience wishes become bookable demand.
          </p>
        </header>

        <div className="grid gap-12 xl:grid-cols-[0.9fr_1fr]">
          <DemoImage
            alt="Demand pool guitarist"
            caption="Demand Pool photo"
            className="min-h-[520px]"
            src="/image/Demand Pool.webp"
          />

          <section className="wl-card p-12">
            <h2 className="text-5xl font-black">
              {demand ? `${titleCase(demand.genre)} in ${titleCase(demand.city)}` : "Loading Demand"}
            </h2>
            <p className="mt-6 text-3xl font-black text-[#d49aff]">
              {demand?.wishCount ?? 0} wishes joined
            </p>
            <p className="mt-8 text-xl font-bold text-white/50">Demand Score</p>
            <p className="mt-5 text-8xl font-black text-[#45f5a5]">{payload?.analysis.demandScore ?? "--"}</p>
            <p className="mt-8 text-base font-bold text-white/45">
              {status}
            </p>
            {error && <p className="mt-4 text-sm font-bold text-red-200">{error}</p>}
            <button
              className="wl-primary mt-10"
              disabled={running || !demand?.matching}
              onClick={() => void startNegotiation()}
              type="button"
            >
              {running ? "Opening A2A Room..." : "Enter A2A Negotiation"}
            </button>
          </section>
        </div>

        <section className="wl-card max-w-5xl p-12">
          <h2 className="text-4xl font-black">Agent Analysis</h2>
          <div className="mt-9 grid gap-7 text-2xl font-bold text-white/54">
            {(payload?.analysis.completed ?? ["Audience clustering pending"]).map((entry) => (
              <p key={entry}>{entry}</p>
            ))}
            <p className="text-[#45f5a5]">Probability of show: {payload?.analysis.probability ?? 0}%</p>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <CandidateList title="Top 3 Musician Agents" candidates={demand?.matching?.musicians ?? []} cards={payload?.musicianCards ?? []} />
          <CandidateList title="Top 3 Venue Agents" candidates={demand?.matching?.venues ?? []} cards={payload?.venueCards ?? []} />
        </div>
      </div>
    </WishLiveShell>
  );
}

function CandidateList({
  cards,
  candidates,
  title
}: {
  cards: AgentCard[];
  candidates: NonNullable<Demand["matching"]>["musicians"];
  title: string;
}) {
  return (
    <section className="wl-card p-7">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-6 grid gap-4">
        {candidates.map((candidate) => {
          const card = cards.find((entry) => entry.agent_id === candidate.agentId);
          return (
            <div className="wl-agent-message" key={candidate.agentId}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-black text-[#45f5a5]">{candidate.name}</p>
                  <p className="mt-2 text-sm font-semibold text-white/48">{card?.description ?? candidate.reason}</p>
                </div>
                <strong className="text-3xl text-[#d49aff]">{candidate.score}</strong>
              </div>
              <p className="mt-3 font-mono text-xs text-white/42">
                {candidate.agentId} · {candidate.reason}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

async function startAgentNegotiation(demand: Demand) {
  const musicianId = demand.matching?.musicians[0]?.agentId;
  const venueId = demand.matching?.venues[0]?.agentId;
  if (!musicianId || !venueId) {
    throw new Error("Matching candidates are required before negotiation");
  }

  const [musician, venue] = await Promise.all([
    fetchJson(`/api/registry/${encodeURIComponent(musicianId)}`) as Promise<AgentCard>,
    fetchJson(`/api/registry/${encodeURIComponent(venueId)}`) as Promise<AgentCard>
  ]);
  const venueFee = Number(venue.metadata.baseFee ?? 5_000);
  const musicianSplit = Number(musician.metadata.splitPreference ?? 25);
  const venueSplit = Number(venue.metadata.splitPreference ?? 22);
  const initialTerms = {
    venueFee,
    splitPercentage: musicianSplit,
    schedule: {
      date: demand.preferredDate,
      startTime: "19:00",
      endTime: "22:00"
    }
  };

  const negotiation = (await postJson("/api/negotiation", {
    demandId: demand.demandId,
    musicianId,
    venueId
  })) as Negotiation;
  const proposal = (await postJson(`/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}/proposal`, {
    from: musicianId,
    to: venueId,
    terms: initialTerms
  })) as { proposalId: string };
  const counter = (await postJson(`/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}/counter`, {
    proposalId: proposal.proposalId,
    from: venueId,
    newTerms: {
      ...initialTerms,
      venueFee,
      splitPercentage: venueSplit
    }
  })) as { proposalId: string };
  await postJson(`/api/negotiation/${encodeURIComponent(negotiation.negotiationId)}/accept`, {
    proposalId: counter.proposalId,
    from: musicianId
  }) as { deal: Deal };

  return negotiation.negotiationId;
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

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
