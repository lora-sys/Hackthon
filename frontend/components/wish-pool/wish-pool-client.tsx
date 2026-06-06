"use client";

import { Button } from "@heroui/react";
import type { AgentCard, Deal, Demand, Negotiation, Wish } from "@wishlive/shared";
import { WishCreateRequestSchema } from "@wishlive/shared";
import type { InputHTMLAttributes } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { formatStreamEvent, type DashboardEvent, type StreamEventPayload } from "../../lib/dashboard-data";

type WishFormValues = {
  userId: string;
  artistName: string;
  genre: string;
  city: string;
  date: string;
  depositAmount: number;
};

type WishCreateResponse = {
  wishId: string;
  demand: Demand | null;
  matching: Demand["matching"];
};

const defaultWish: WishFormValues = {
  userId: "user:audience:demo",
  artistName: "Neon Harbor",
  genre: "rock",
  city: "shanghai",
  date: "2026-07-17",
  depositAmount: 20
};

export function WishPoolClient() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [autoNegotiation, setAutoNegotiation] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<WishFormValues>({
    defaultValues: defaultWish
  });

  async function refresh() {
    const [wishesResponse, demandsResponse, eventsResponse] = await Promise.all([
      fetch("/api/wishes", { cache: "no-store" }),
      fetch("/api/wishes/demands", { cache: "no-store" }),
      fetch("/api/events/history", { cache: "no-store" })
    ]);
    setWishes((await wishesResponse.json()) as Wish[]);
    setDemands((await demandsResponse.json()) as Demand[]);
    setEvents(
      uniqueEvents(
        ((await eventsResponse.json()) as StreamEventPayload[])
          .filter(isWishWorkflowStream)
          .map(formatStreamEvent)
      ).slice(0, 18)
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (message) => {
      const event = formatStreamEvent(JSON.parse(message.data) as StreamEventPayload);
      if (
        event.stream === "wish.events" ||
        event.stream === "demand.events" ||
        event.stream === "matching.events" ||
        event.stream === "agent.runtime" ||
        event.stream === "a2a.discovery"
      ) {
        setEvents((current) => uniqueEvents([event, ...current]).slice(0, 18));
        void refresh();
      }
    };

    return () => {
      source.close();
    };
  }, []);

  const activeCohort = useMemo(() => {
    const newest = demands[0];
    if (newest) {
      return newest;
    }

    const active = wishes.filter(
      (wish) =>
        wish.genre === defaultWish.genre &&
        wish.city === defaultWish.city &&
        wish.status === "ACTIVE"
    );
    return {
      demandId: "collecting",
      artistName: defaultWish.artistName,
      genre: defaultWish.genre,
      city: defaultWish.city,
      preferredDate: defaultWish.date,
      wishCount: active.length,
      threshold: 10,
      status: "COLLECTING",
      wishIds: active.map((wish) => wish.wishId),
      matching: null,
      createdAt: Date.now()
    } satisfies Demand;
  }, [demands, wishes]);

  const progress = Math.min(100, Math.round((activeCohort.wishCount / activeCohort.threshold) * 100));

  async function submitWish(values: WishFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await postWish(values);
      if (result.demand?.matching) {
        const negotiationId = await startAgentNegotiation(result.demand);
        setAutoNegotiation(negotiationId);
        window.location.href = `/negotiation/${encodeURIComponent(negotiationId)}`;
        return;
      }
      reset(values);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Wish submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function seedTenWishes() {
    setSeeding(true);
    setError(null);
    try {
      const runId = crypto.randomUUID().slice(0, 8);
      for (let index = 1; index <= 10; index += 1) {
        const result = await postWish({
          ...defaultWish,
          userId: `user:audience:${runId}:${index}`
        });
        if (result.demand?.matching) {
          const negotiationId = await startAgentNegotiation(result.demand);
          setAutoNegotiation(negotiationId);
          window.location.href = `/negotiation/${encodeURIComponent(negotiationId)}`;
          return;
        }
      }
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Seed flow failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07080d] px-5 py-6 text-white lg:px-8">
      <section className="mx-auto grid max-w-[1500px] gap-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#22d3ee]">
              Wish Pool Agent Console
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              Wish → Demand → Matching
            </h1>
          </div>
          <Button
            className="rounded-lg bg-[#ddb7ff] px-5 py-3 font-bold text-[#22003f]"
            isDisabled={seeding}
            onPress={() => void seedTenWishes()}
          >
            {seeding ? "Creating cohort..." : "Create 10-Agent Cohort"}
          </Button>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              Audience Wish
            </h2>
            <form className="mt-5 grid gap-4" onSubmit={handleSubmit(submitWish)}>
              <Field label="User ID" {...register("userId")} />
              <Field label="Artist" {...register("artistName")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Genre" {...register("genre")} />
                <Field label="City" {...register("city")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred Date" type="date" {...register("date")} />
                <Field
                  label="Deposit"
                  type="number"
                  {...register("depositAmount", { valueAsNumber: true })}
                />
              </div>
              {error && (
                <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </p>
              )}
              {autoNegotiation && (
                <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                  A2A negotiation created: {autoNegotiation}
                </p>
              )}
              <Button
                className="rounded-lg bg-[#22d3ee] px-4 py-3 font-bold text-[#041015]"
                isDisabled={submitting}
                type="submit"
              >
                {submitting ? "Submitting..." : "Submit Wish"}
              </Button>
            </form>
          </section>

          <section className="grid gap-5">
            <div className="rounded-lg border border-[#ddb7ff]/20 bg-[#11131b] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                    Demand Pool
                  </h2>
                  <p className="mt-2 text-2xl font-black">
                    {activeCohort.wishCount}/{activeCohort.threshold} wishes
                  </p>
                </div>
                <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 font-mono text-xs text-emerald-200">
                  {activeCohort.status}
                </span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#ddb7ff]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm text-white/55">
                {activeCohort.genre} · {activeCohort.city} · {activeCohort.preferredDate}
              </p>
            </div>

            <MatchingPanel demand={activeCohort} />
          </section>
        </div>

        <AgentPipeline events={events} />

        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <WishList wishes={wishes} />
          <EventPanel events={events} />
        </div>
      </section>
    </main>
  );
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-2">
      <span className="font-mono text-xs uppercase text-white/45">{label}</span>
      <input
        className="h-11 rounded-lg border border-white/10 bg-[#07080d] px-3 text-sm text-white outline-none transition focus:border-[#ddb7ff]"
        {...inputProps}
      />
    </label>
  );
}

function MatchingPanel({ demand }: { demand: Demand }) {
  const matching = demand.matching;
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Matching Top 3
      </h2>
      {!matching ? (
        <p className="mt-4 text-sm text-white/55">Waiting for Demand Pool threshold.</p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <CandidateColumn title="Musicians" items={matching.musicians} />
          <CandidateColumn title="Venues" items={matching.venues} />
        </div>
      )}
    </section>
  );
}

function AgentPipeline({ events }: { events: DashboardEvent[] }) {
  const stages = [
    ["Audience", "wish.created"],
    ["WishMaker AI", "agent.tool_call"],
    ["DemandPool", "demand.created"],
    ["Manager Discovery", "a2a.discovery.result"],
    ["Matching", "matching.completed"]
  ];
  return (
    <section className="rounded-lg border border-[#22d3ee]/20 bg-[#11131b] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Agent Pipeline
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {stages.map(([label, type]) => {
          const active = events.some((event) => event.type === type);
          return (
            <div
              className={`rounded-lg border p-3 ${
                active ? "border-emerald-300/30 bg-emerald-300/10" : "border-white/10 bg-white/[0.03]"
              }`}
              key={type}
            >
              <p className="font-mono text-xs uppercase text-white/40">{label}</p>
              <p className={active ? "mt-2 text-sm text-emerald-200" : "mt-2 text-sm text-white/45"}>
                {active ? "active" : "waiting"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CandidateColumn({
  title,
  items
}: {
  title: string;
  items: NonNullable<Demand["matching"]>["musicians"];
}) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-xs uppercase text-[#22d3ee]">{title}</p>
      {items.map((item) => (
        <div className="rounded-lg border border-white/10 bg-[#11131b] p-3" key={item.agentId}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold">{item.name}</p>
            <span className="font-mono text-sm text-[#ddb7ff]">{item.score}</span>
          </div>
          <p className="mt-2 font-mono text-xs text-white/45">{item.reason}</p>
        </div>
      ))}
    </div>
  );
}

function WishList({ wishes }: { wishes: Wish[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Wish List
      </h2>
      <div className="mt-4 grid max-h-[360px] gap-3 overflow-auto">
        {wishes.slice(0, 18).map((wish) => (
          <div className="rounded-lg border border-white/10 bg-[#11131b] p-3" key={wish.wishId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{wish.artistName}</p>
              <span className="font-mono text-xs text-emerald-200">{wish.status}</span>
            </div>
            <p className="mt-2 text-sm text-white/55">
              {wish.genre} · {wish.city} · {wish.preferredDate}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EventPanel({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        Redis Event Chain
      </h2>
      <div className="mt-4 grid max-h-[360px] gap-2 overflow-auto">
        {events.map((event) => (
          <div className="rounded-lg border border-white/10 bg-[#11131b] p-3" key={event.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#ddb7ff]">{event.type}</span>
              <span className="font-mono text-xs text-white/35">{event.time}</span>
            </div>
            <p className="mt-1 text-sm text-white/60">{event.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function postWish(values: WishFormValues) {
  const payload = WishCreateRequestSchema.parse(values);
  const response = await fetch("/api/wishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new Error(body.error ?? "Wish submission failed");
  }

  return (await response.json()) as WishCreateResponse;
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

function isWishWorkflowStream(payload: StreamEventPayload) {
  return (
    payload.stream === "wish.events" ||
    payload.stream === "demand.events" ||
    payload.stream === "matching.events" ||
    payload.stream === "agent.runtime" ||
    payload.stream === "a2a.discovery"
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
