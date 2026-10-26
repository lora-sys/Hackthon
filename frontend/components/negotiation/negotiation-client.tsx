"use client";

import type { Deal, Negotiation } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { DemoImage, WishLiveShell } from "../demo/wishlive-shell";
import { useLanguage } from "../language-provider";
import { formatStreamEvent, type DashboardEvent, type StreamEventPayload } from "../../lib/dashboard-data";

type RunState = {
  negotiation: Negotiation | null;
  deal: Deal | null;
};

export function NegotiationClient({ negotiationId }: { negotiationId: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<RunState>({
    negotiation: null,
    deal: null
  });
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshNegotiation();
    void refreshEvents().catch(() => setError("暂时无法加载记录 / Unable to load activity"));
  }, [negotiationId]);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (message) => {
      const event = formatStreamEvent(JSON.parse(message.data) as StreamEventPayload);
      if (
        event.detail.includes(negotiationId) ||
        ["agent.task", "agent.runtime", "negotiation.events", "show.events"].includes(event.stream ?? "")
      ) {
        setEvents((current) => uniqueEvents([event, ...current]).slice(0, 28));
      }
    };

    return () => {
      source.close();
    };
  }, [negotiationId]);

  async function refreshEvents() {
    const history = ((await fetchJson("/api/events/history")) as StreamEventPayload[])
      .filter((entry) => ["agent.task", "agent.runtime", "negotiation.events", "show.events"].includes(entry.stream))
      .map(formatStreamEvent);
    setEvents(uniqueEvents(history).slice(0, 28));
  }

  async function refreshNegotiation() {
    try {
      const nextNegotiation = (await fetchJson(
        `/api/negotiation/${encodeURIComponent(negotiationId)}`
      )) as Negotiation;
      setState({
        negotiation: nextNegotiation,
        deal: nextNegotiation.deal
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Negotiation loading failed");
    }
  }

  const proposals = state.negotiation?.proposals ?? [];
  const showRoute = state.deal ? `/show-confirmed/${encodeURIComponent(state.deal.dealId)}` : "#";
  const runtimeEvents = useMemo(
    () => events.filter((event) => event.stream === "agent.runtime" || event.stream === "agent.task").slice(0, 8),
    [events]
  );

  return (
    <WishLiveShell active="Matches" online={57} section="A2A Room">
      <div className="grid gap-9">
        <header>
          <h1 className="text-6xl font-black leading-none tracking-tight md:text-7xl">{t("演出协商", "Negotiation Room")}</h1>
          <p className="mt-4 text-2xl font-bold text-white/48">
            {t("查看报价与还价，达成条款后进入人工确认。", "Review offers and counteroffers before human confirmation.")}
          </p>
        </header>

        {error && <p className="font-bold text-red-200">{error}</p>}

        <div className="grid gap-12 xl:grid-cols-[0.72fr_1fr]">
          <DemoImage
            alt="Musician live"
            caption={t("现场演出示意", "Illustrative live photo")}
            className="min-h-[650px]"
            src="/image/Negotiation Room.webp"
          />

          <section className="wl-card p-12">
            <h2 className="text-5xl font-black">{t("协商记录", "Negotiation history")}</h2>
            <div className="mt-10 grid gap-7">
              {proposals.map((proposal, index) => (
                <div className="wl-agent-message" key={proposal.proposalId}>
                  <h3 className={index % 2 === 0 ? "text-2xl font-black text-[#ff974a]" : "text-2xl font-black text-[#45f5a5]"}>
                    {proposal.senderAgentId.includes("venue") ? t("场地智能体", "Venue Agent") : t("乐手智能体", "Musician Agent")}
                  </h3>
                  <p className="mt-2 text-lg font-bold text-white/55">
                    {proposal.type === "INITIAL" ? t("报价", "Offer") : t("还价", "Counteroffer")}: {t("场地费用", "Venue fee")} {proposal.terms.venueFee.toLocaleString()} / {t("分成比例", "Split")} {proposal.terms.splitPercentage}% · {proposal.decision === "ACCEPTED" ? t("已接受", "Accepted") : proposal.decision === "REJECTED" ? t("已拒绝", "Rejected") : t("待处理", "Pending")}
                  </p>
                </div>
              ))}

              <div className="wl-agent-message">
                <h3 className="text-2xl font-black text-[#52e7ff]">{t("协商智能体", "Negotiation Agent")}</h3>
                <p className="mt-2 text-lg font-bold text-white/55">
                  {state.deal ? t("条款已达成，订单已创建", "Terms accepted; deal created") : t("正在协调报价与还价", "Routing offers and counteroffers")}
                </p>
              </div>

              <div className="wl-agent-message">
                <h3 className="text-2xl font-black text-[#d49aff]">{t("演出确认智能体", "ShowConfirm Agent")}</h3>
                <p className="mt-2 text-lg font-bold text-white/55">
                  {state.deal ? t("等待人工确认，尚未结算", "Awaiting human confirmation; not settled") : t("等待达成条款", "Awaiting a deal")}
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              {state.deal && <a className="wl-primary inline-flex items-center justify-center" href={showRoute}>
                {t("查看待确认订单", "Review pending deal")}
              </a>}
              <button className="wl-pill" onClick={() => void refreshNegotiation()} type="button">
                {t("刷新协商", "Refresh negotiation")}
              </button>
            </div>
          </section>
        </div>

        <details className="wl-card p-8">
          <summary className="cursor-pointer font-bold">{t("高级：智能体运行记录", "Advanced: agent runtime trace")}</summary>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {runtimeEvents.map((event) => (
              <div className="wl-agent-message" key={event.id}>
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-xs font-black text-[#d49aff]">{event.type}</p>
                  <p className="font-mono text-xs text-white/34">{event.stream}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-white/58">{event.detail}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </WishLiveShell>
  );
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new Error(body.error ?? `GET ${url} failed`);
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
