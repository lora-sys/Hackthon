"use client";

import Link from "next/link";
import { useLanguage } from "../components/language-provider";
import { WalletConnectButton } from "../components/wallet-connect-button";

const flow = ["Wish", "Demand", "Match", "Negotiate", "Confirm", "Settle", "Live Show"];

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <main className="wl-landing min-h-screen bg-[#03030a] text-white">
      <section className="relative min-h-screen overflow-hidden px-7 py-7">
        <img
          alt="WishLive underground live show"
          className="absolute inset-0 h-full w-full object-cover opacity-64"
          src="/image/landing page -1.webp"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03030a] via-[#050615]/78 to-[#050615]/22" />
        <div className="absolute inset-x-7 top-7 bottom-7 rounded-[18px] border border-[#8b5cf6]" />

        <div className="relative z-10 mx-auto flex max-w-[1540px] items-center justify-between px-8 pt-5">
          <Link className="text-3xl font-black tracking-tight" href="/">
            WishLive
          </Link>
          <nav className="hidden items-center gap-11 text-sm font-black text-white/74 lg:flex">
            <Link className="border-b-2 border-[#d49aff] pb-2 text-white" href="/">
              {t("首页", "Home")}
            </Link>
            <Link href="/wish-pool">{t("许愿", "Wishes")}</Link>
            <Link href="/dashboard">{t("探索演出", "Explore")}</Link>
            <Link href="/my-agent">Agent</Link>
            <Link href="/topology">{t("拓扑", "Topology")}</Link>
          </nav>
          <WalletConnectButton />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1540px] gap-8 px-8 pb-12 pt-36">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-black uppercase tracking-[0.42em] text-[#52e7ff]">
              {t("现场音乐智能体市场", "Live Music Agent Marketplace")}
            </p>
            <h1 className="mt-8 text-6xl font-black leading-[0.96] tracking-tight sm:text-8xl">
              WishLive
            </h1>
            <p className="mt-5 text-3xl font-black text-[#e9d5ff]">
              {t("每一场演出，都始于每一份期待", "Every live show begins with a wish")}
            </p>
            <div className="mt-12 max-w-3xl border-y border-white/10 bg-[#09111f]/52 p-8 backdrop-blur">
              <p className="mb-7 text-2xl font-black text-white/86">{t("请选择现在的角色？", "Choose your role")}</p>
              <div className="flex flex-wrap gap-5">
                <RoleLink href="/create-agent?role=audience" primary label={t("观众", "Audience")} sub="Audience" />
                <RoleLink href="/create-agent?role=musician" label={t("乐手", "Musician")} sub="Musician" />
                <RoleLink href="/create-agent?role=venue" label={t("场地", "Venue")} sub="Venue" />
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-5">
              <Link className="wl-primary inline-flex items-center justify-center" href="/wish-pool">
                {t("许愿一场演出 →", "Wish for a show →")}
              </Link>
              <Link className="wl-pill" href="/dashboard">
                {t("打开控制台", "Open Dashboard")}
              </Link>
            </div>
            <p className="mt-10 font-mono text-sm font-black text-white/76">
              {t("演示目录包含 57 个 Agent · 在线状态请查看控制台", "Demo registry: 57 agents · check the dashboard for live status")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] gap-16 px-7 py-24">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.36em] text-[#d49aff]">
            {t("01 / 从许愿到现场", "01 / From Wish To Live Show")}
          </p>
          <h2 className="mt-7 text-4xl font-black tracking-tight md:text-6xl">
            {t("一个观众的期待，如何被 Agent 协作变成真实演出", "From an audience wish to a live show through agent collaboration")}
          </h2>
          <p className="mt-4 max-w-5xl text-lg font-semibold leading-8 text-white/55">
            {t("WishLive 聚合观众需求，再由撮合、协商和结算 Agent 推进演出流程。", "WishLive aggregates audience demand, then coordinates matching, negotiation and settlement agents.")}
          </p>
        </div>

        <div className="grid gap-10">
          <div className="grid grid-cols-7 items-center gap-2">
            {flow.map((item, index) => (
              <div className="grid gap-4 text-center" key={item}>
                <div
                  className={
                    index === flow.length - 1
                      ? "mx-auto h-7 w-7 rounded-full bg-[#45f5a5] shadow-[0_0_30px_rgba(69,245,165,0.75)]"
                      : "mx-auto h-7 w-7 rounded-full bg-[#d49aff] shadow-[0_0_30px_rgba(212,154,255,0.62)]"
                  }
                />
                <span className="font-mono text-xs font-black uppercase tracking-[0.24em] text-white/78">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-9 lg:grid-cols-[1.1fr_0.72fr]">
            <div className="wl-card p-9">
              <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-[#d49aff]">
                {t("事件驱动的演出市场", "Event-driven marketplace")}
              </p>
              <p className="mt-8 text-2xl font-black md:text-3xl">
                wish.created → demand.created → matching.completed → deal.created
              </p>
              <p className="mt-14 text-base font-semibold leading-8 text-white/56">
                {t("流程通过 Redis Streams 传递事件，并保留工作流与智能体追踪信息。", "Workflow events travel through Redis Streams with workflow and agent tracing context.")}
              </p>
            </div>
            <figure className="wl-image-card min-h-[260px]">
              <img alt="Selected band" className="h-full w-full object-cover" src="/image/landing page -2.webp" />
              <figcaption>{t("音乐现场", "Live music")}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#05050d] px-7 py-24">
        <div className="mx-auto grid max-w-[1380px] gap-12">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.36em] text-[#d49aff]">
              {t("02 / 智能体市场", "02 / Agent Marketplace")}
            </p>
            <h2 className="mt-7 text-5xl font-black md:text-7xl">{t("57 个演示智能体", "57 Demo Agents")}</h2>
            <p className="mt-4 text-lg font-semibold text-white/58">
              {t("每个角色都有自己的 Agent，通过 A2A 消息推进流程。以下数字为演示样例。", "Each role owns an agent communicating through A2A messages. Figures below are illustrative.")}
            </p>
          </div>
          <div className="grid gap-9 lg:grid-cols-[1fr_0.52fr]">
            <div className="wl-card min-h-[520px] p-8">
              <div className="relative h-full min-h-[460px]">
                {["Audience ×10", "Musician ×15", "Venue ×10", "Business ×9", "Management ×3", "WishMaker Agent"].map(
                  (label, index) => (
                    <div
                      className="absolute rounded-full border border-white/20 bg-[#d49aff] px-4 py-2 text-sm font-black shadow-[0_0_30px_rgba(212,154,255,0.55)]"
                      key={label}
                      style={{
                        left: `${[13, 69, 12, 69, 47, 44][index]}%`,
                        top: `${[52, 48, 76, 77, 18, 58][index]}%`
                      }}
                    >
                      {label}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="wl-card p-9">
              <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-[#d49aff]">
                {t("演示数据 · 非实时状态", "Demo data · not live status")}
              </p>
              <p className="mt-12 text-7xl font-black">57</p>
              <p className="mt-2 text-lg font-semibold text-white/48">{t("预置智能体", "seeded agents")}</p>
              <div className="mt-11 grid gap-6">
                <MiniMetric label={t("任务样例", "Example tasks")} value="128" />
                <MiniMetric label={t("协商样例", "Example negotiations")} value="23" tone="orange" />
                <MiniMetric label={t("目标网络", "Target network")} value="Sepolia" tone="purple" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] gap-16 px-7 py-24">
        <div className="grid gap-9 lg:grid-cols-[0.55fr_1fr]">
          <figure className="wl-image-card min-h-[430px]">
            <img alt="Negotiation musician" className="h-full w-full object-cover" src="/image/landing page-3.webp" />
            <figcaption>{t("舞台准备", "Stage preparation")}</figcaption>
          </figure>
          <div className="wl-card p-9">
            <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-[#d49aff]">
              {t("03 / 协商流程示例", "03 / Negotiation example")}
            </p>
            <h2 className="mt-7 text-4xl font-black md:text-6xl">{t("让 Agent 协助演出协商", "Let agents coordinate show negotiations")}</h2>
            <div className="mt-10 grid gap-6">
              <AgentLine color="orange" title="Venue Agent #7" body="capacity: 200 / fee: 5000 / split: 20%" />
              <AgentLine color="green" title="Musician Agent #3" body="demand score: 92 / expected revenue: 6200" />
              <AgentLine color="cyan" title="Negotiation Agent" body="counter(split=25%) → accept(split=22%)" />
            </div>
            <p className="mt-10 text-4xl font-black">DEAL.CREATED</p>
          </div>
        </div>

        <div className="wl-card p-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-[#d49aff]">
                {t("事件流示例", "Example event stream")}
              </p>
              <div className="mt-8 grid gap-6 text-lg font-semibold text-white/78">
                <p>14:32:21 wish.created</p>
                <p>14:32:24 demand.created</p>
                <p>14:32:29 matching.completed</p>
                <p>14:32:33 negotiation.started</p>
                <p className="text-[#45f5a5]">14:32:51 escrow.created</p>
                <p className="text-[#45f5a5]">14:32:56 ticket.minted</p>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-[#d49aff]">
                {t("区块链数据示例（非实时）", "Illustrative blockchain data (not live)")}
              </p>
              <div className="mt-8 grid grid-cols-3 gap-5">
                <MiniMetric label="Escrow" value="57" />
                <MiniMetric label="TicketNFT" value="128" />
                <MiniMetric label="Chain" value="11155111" />
              </div>
              <figure className="wl-image-card mt-10 min-h-[220px]">
                <img alt="Reserved band" className="h-full w-full object-cover" src="/image/landing page-4.webp" />
                <figcaption>{t("乐队现场", "Live band")}</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] gap-24 px-7 pb-24 pt-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.7fr] lg:items-start">
          <h2 className="text-5xl font-black leading-[1.08] text-white/70 md:text-7xl">
            {t("传统票务", "Traditional Ticketing")}
            <br />
            {t("售卖已有演出", "Sells Existing Shows")}
            <br />
            <span className="text-white">WishLive</span>
            <br />
            <span className="text-white">{t("创造新的演出", "Creates New Shows")}</span>
          </h2>
          <figure className="wl-image-card min-h-[360px]">
            <img alt="Final CTA musician" className="h-full w-full object-cover" src="/image/landing page-5.webp" />
            <figcaption>{t("音乐人的舞台", "A musician's stage")}</figcaption>
          </figure>
        </div>
        <div className="wl-card p-12">
          <h2 className="text-5xl font-black">{t("创建许愿", "Create a Wish")}</h2>
          <p className="mt-4 text-2xl font-black text-[#d49aff]">{t("让智能体协作打造演出", "Let Agents Build The Show")}</p>
          <p className="mt-8 max-w-3xl text-lg font-semibold leading-8 text-white/54">
            {t("连接观众期待、音乐人档期和场地资源。", "Connect audience wishes, musician availability and venue resources.")}
          </p>
          <div className="mt-10 flex flex-wrap gap-6">
            <Link className="wl-primary inline-flex items-center justify-center" href="/wish-pool">
              {t("创建许愿", "Create Wish")}
            </Link>
            <Link className="wl-pill" href="/dashboard">
              {t("打开控制台", "Open Dashboard")}
            </Link>
            <WalletConnectButton />
          </div>
        </div>
      </section>
    </main>
  );
}

function RoleLink({
  href,
  label,
  primary = false,
  sub
}: {
  href: string;
  label: string;
  primary?: boolean;
  sub: string;
}) {
  return (
    <Link
      className={
        primary
          ? "min-w-36 rounded-full bg-[#d49aff] px-10 py-5 text-center text-[#2b123c]"
          : "min-w-36 rounded-full border border-white/18 bg-[#0d1323]/82 px-10 py-5 text-center text-white"
      }
      href={href}
    >
      <span className="block text-base font-black">{label}</span>
      <span className="mt-1 block font-mono text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {sub}
      </span>
    </Link>
  );
}

function MiniMetric({ label, tone = "cyan", value }: { label: string; tone?: "cyan" | "orange" | "purple"; value: string }) {
  const color = tone === "orange" ? "text-[#ff974a]" : tone === "purple" ? "text-[#d49aff]" : "text-[#52e7ff]";
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#080914] p-5">
      <div className="text-xs font-black text-white/42">{label}</div>
      <div className={`mt-3 text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function AgentLine({ body, color, title }: { body: string; color: "orange" | "green" | "cyan"; title: string }) {
  const textColor = color === "orange" ? "text-[#ff974a]" : color === "green" ? "text-[#45f5a5]" : "text-[#52e7ff]";
  return (
    <div className="wl-agent-message">
      <div className={`text-xl font-black ${textColor}`}>{title}</div>
      <div className="mt-2 text-base font-semibold text-white/58">{body}</div>
    </div>
  );
}
