"use client";

import type { AgentCard, Deal, Demand, Negotiation } from "@wishlive/shared";
import { useEffect, useState } from "react";
import { DemoImage, WishLiveShell } from "../demo/wishlive-shell";
import Link from "next/link";
import { useLanguage } from "../language-provider";
import { matchingReadiness } from "../../lib/matching-readiness";

type DemandPayload = {
  demand: Demand;
  musicianCards: AgentCard[];
  venueCards: AgentCard[];
  analysis: {
    demandScore: number | null;
    probability: number | null;
    completed: string[];
  };
};

export function DemandPoolClient({ demandId }: { demandId: string }) {
  const { t } = useLanguage();
  const [payload, setPayload] = useState<DemandPayload | null>(null);
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Demand loading failed");
    }
  }

  async function startNegotiation() {
    if (!payload || !matchingReadiness(payload.demand.matching).ready) {
      return;
    }
    setRunning(true);
    setError(null);
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
  const readiness = matchingReadiness(demand?.matching);

  return (
    <WishLiveShell active="Matches" online={57} section="Market">
      <div className="grid gap-9">
        <header>
          <h1 className="text-6xl font-black leading-none tracking-tight md:text-7xl">{t("需求池", "Demand Pool")}</h1>
          <p className="mt-4 text-2xl font-bold text-white/48">
            {t("汇集观众期待，寻找合适的乐手与场地。", "Gather audience wishes and find available musicians and venues.")}
          </p>
        </header>

        <div className="grid gap-12 xl:grid-cols-[0.9fr_1fr]">
          <DemoImage
            alt="Demand pool guitarist"
            caption={t("演出氛围示意", "Illustrative live music photo")}
            className="min-h-[520px]"
            src="/image/Demand Pool.webp"
          />

          <section className="wl-card p-12">
            <h2 className="text-5xl font-black">
              {demand ? `${titleCase(demand.genre)} · ${titleCase(demand.city)}` : t("正在加载需求", "Loading demand")}
            </h2>
            <p className="mt-6 text-3xl font-black text-[#d49aff]">
              {demand?.wishCount ?? 0} {t("条许愿已加入", "wishes joined")}
            </p>
            <p className="mt-8 text-xl font-bold text-white/70">{t("可用候选", "Available candidates")}</p>
            <p className="mt-5 text-2xl font-bold">{t("乐手", "Musicians")} {readiness.musicians} · {t("场地", "Venues")} {readiness.venues}</p>
            <p className="mt-8 text-base font-bold text-white/45">
              {running ? t("正在创建协商…", "Opening negotiation…") : !payload ? t("正在加载…", "Loading…") : readiness.ready ? t("已找到候选，可进入协商。", "Candidates found. Ready to negotiate.") : t("当前日期暂无完整候选组合，请调整日期或城市。", "No complete match for this date. Try another date or city.")}
            </p>
            {error && <p className="mt-4 text-sm font-bold text-red-200">{error}</p>}
            <button
              className="wl-primary mt-10"
              disabled={running || !readiness.ready}
              onClick={() => void startNegotiation()}
              type="button"
            >
              {running ? t("正在创建协商…", "Opening negotiation…") : t("进入协商", "Enter A2A Negotiation")}
            </button>
            {!readiness.ready && payload && <Link className="wl-pill mt-4" href="/wish-pool">{t("调整许愿条件", "Change wish preferences")}</Link>}
          </section>
        </div>

        <section className="wl-card max-w-5xl p-12">
          <h2 className="text-4xl font-black">{t("撮合进度", "Matching progress")}</h2>
          <div className="mt-9 grid gap-7 text-2xl font-bold text-white/54">
            <p>{t("需求已汇集", "Demand collected")}: {demand?.wishCount ?? 0}/{demand?.threshold ?? 10}</p>
            <p>{readiness.ready ? t("候选已找到，尚未确认演出", "Candidates found; show not confirmed") : t("等待合适档期，暂无成功概率预测", "Awaiting availability; no probability estimate")}</p>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <CandidateList title={t("乐手候选（最多 3 位）", "Musician candidates (up to 3)")} candidates={demand?.matching?.musicians ?? []} cards={payload?.musicianCards ?? []} />
          <CandidateList title={t("场地候选（最多 3 个）", "Venue candidates (up to 3)")} candidates={demand?.matching?.venues ?? []} cards={payload?.venueCards ?? []} />
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
