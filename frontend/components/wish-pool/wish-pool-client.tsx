"use client";

import type { Demand, Wish } from "@wishlive/shared";
import { WishCreateRequestSchema } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { useWalletAccount } from "../../app/providers";
import { DemoImage, StatTile, WishLiveShell } from "../demo/wishlive-shell";
import { useLanguage } from "../language-provider";
import { matchingReadiness } from "../../lib/matching-readiness";
import Link from "next/link";
import { wishProgress } from "../../lib/wish-progress";

type WishFormValues = {
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
  nextRoute?: string;
};

const defaultWish: WishFormValues = {
  artistName: "Neon Harbor",
  genre: "rock",
  city: "shanghai",
  date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  depositAmount: 20
};

export function WishPoolClient({ historyOnly = false }: { historyOnly?: boolean }) {
  const { t } = useLanguage();
  const { address, isConnected } = useWalletAccount();
  const [values, setValues] = useState(defaultWish);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [status, setStatus] = useState("Audience Agent is ready.");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefilled, setPrefilled] = useState(false);
  const ownerId = address ? `wallet:${address}` : guestId;
  const myWishes = wishes.filter((wish) => wish.userId === ownerId).sort((a, b) => b.createdAt - a.createdAt);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wishlive.guest-id");
      const id = stored || `guest:${crypto.randomUUID()}`;
      localStorage.setItem("wishlive.guest-id", id);
      setGuestId(id);
    } catch {
      setError("无法保存访客标识，请允许本地存储 / Enable browser storage to track guest wishes");
    }
    const query = new URLSearchParams(window.location.search);
    if (query.get("copy") === "1") {
      setValues((current) => ({ ...current, artistName: query.get("artist") || current.artistName, city: query.get("city") || current.city, genre: query.get("genre") || current.genre, date: query.get("date") || current.date, depositAmount: Number(query.get("budget")) || current.depositAmount }));
      setPrefilled(true);
    }
    void refresh().catch(() => setError("Unable to load wishes / 暂时无法加载许愿")).finally(() => setLoading(false));
  }, []);

  const activeWishes = useMemo(
    () => wishes.filter((wish) => wish.genre === values.genre.toLowerCase() && wish.city === values.city.toLowerCase()),
    [wishes, values.city, values.genre]
  );

  async function refresh() {
    const [wishesResponse, demandsResponse] = await Promise.all([
      fetch("/api/wishes", { cache: "no-store", signal: AbortSignal.timeout(10000) }),
      fetch("/api/wishes/demands", { cache: "no-store", signal: AbortSignal.timeout(10000) })
    ]);
    if (!wishesResponse.ok || !demandsResponse.ok) throw new Error("Unable to load wishes");
    setWishes((await wishesResponse.json()) as Wish[]);
    setDemands((await demandsResponse.json()) as Demand[]);
  }

  async function submitWish() {
    setSubmitting(true);
    setError(null);
    setStatus("");
    try {
      if (!values.date || values.date <= new Date().toISOString().slice(0, 10)) {
        throw new Error(t("请选择未来的演出日期", "Choose a future show date"));
      }
      if (!ownerId) throw new Error(t("访客标识尚未就绪", "Guest identity is not ready"));
      const latest = await postWish({ ...values, userId: ownerId });
      window.location.href = `/my-wishes#${encodeURIComponent(latest.wishId)}`;
    } catch (nextError) {
      setError(nextError instanceof DOMException && nextError.name === "TimeoutError"
        ? t("请求超时，请先查看许愿记录再重试。", "Request timed out. Check your wishes before retrying.")
        : nextError instanceof Error ? nextError.message : t("提交失败", "Submission failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WishLiveShell active={historyOnly ? "My wishes" : "Wishes"} online={57} section="Audience" showWallet>
      <div className="grid gap-9">
        <header>
          <h1 className="text-6xl font-black leading-none tracking-tight md:text-7xl">{historyOnly ? t("我的许愿", "My wishes") : t("创建许愿", "Create Wish")}</h1>
          <p className="mt-4 text-2xl font-bold text-white/48">{historyOnly ? t("查看真实进度，决定下一步。", "Track your progress and choose your next step.") : t("你想在现场看到谁？", "Who do you want to see live?")}</p>
          <Link className="wl-pill mt-4" href={historyOnly ? "/wish-pool" : "/my-wishes"}>{historyOnly ? t("创建新许愿", "Create a wish") : t("查看我的许愿", "View my wishes")}</Link>
        </header>

        {!historyOnly && <div className="wl-wish-layout grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <DemoImage
            alt="WishLive band"
            caption={t("让期待成为现场", "Turn a wish into a live show")}
            className="min-h-[520px]"
            src="/image/Create Wish.webp"
          />

          <section className="wl-card p-12">
            <h2 className="text-5xl font-black">{t("许下你的期待", "Create a Wish")}</h2>
            <p className="mt-4 text-base text-white/65">{t("每次提交一条许愿，同风格、城市、日期达到 10 条后开始撮合。预算仅用于意向登记，不会扣款。", "Matching starts at 10 wishes with the same genre, city and date. Budget records interest only; no payment is taken.")}</p>
            {prefilled && <p role="status" className="mt-4 text-amber-200">{t("已复制原条件。提交会新增许愿，不会修改或退出原需求池。", "Preferences copied. Submitting creates a new wish; the original wish and pool remain unchanged.")}</p>}
            <div className="wl-wish-fields mt-5 grid gap-2">
              <label htmlFor="wish-artist">{t("艺人", "Artist")}</label>
              <input
                id="wish-artist"
                aria-label={t("艺人", "Artist")}
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, artistName: event.target.value }))}
                placeholder={t("艺人", "Artist")}
                value={values.artistName}
              />
              <label htmlFor="wish-city">{t("城市", "City")}</label>
              <input
                id="wish-city"
                aria-label={t("城市", "City")}
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, city: event.target.value }))}
                placeholder={t("城市", "City")}
                value={values.city}
              />
              <label htmlFor="wish-genre">{t("风格", "Genre")}</label>
              <input
                id="wish-genre"
                aria-label={t("风格", "Genre")}
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, genre: event.target.value }))}
                placeholder={t("风格", "Genre")}
                value={values.genre}
              />
              <label htmlFor="wish-budget">{t("预算", "Budget")}</label>
              <input
                id="wish-budget"
                aria-label={t("预算", "Budget")}
                min={1}
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, depositAmount: Number(event.target.value) }))}
                placeholder={t("预算", "Budget")}
                type="number"
                value={values.depositAmount}
              />
              <label htmlFor="wish-date">{t("期望日期", "Preferred date")}</label>
              <input
                id="wish-date"
                aria-label={t("期望日期", "Preferred date")}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
                type="date"
                value={values.date}
              />
            </div>

            <div className="mt-10 grid gap-4">
              <button className="wl-primary" disabled={submitting || !ownerId} onClick={() => void submitWish()} type="button">
                {submitting ? t("正在提交…", "Submitting...") : t("提交许愿", "Create Wish")}
              </button>
              <p className="text-sm font-bold text-white/48">
                {t("所有者", "Owner")}: {isConnected ? address : t("演示访客（未连接钱包）", "Demo guest (wallet not connected)")} · {status === "Audience Agent is ready." ? t("准备就绪", "Ready") : status}
              </p>
              {error && <p role="alert" className="text-sm font-bold text-red-200">{error}</p>}
            </div>
          </section>
        </div>}

        {historyOnly && <section className="grid gap-5" aria-label={t("许愿记录", "Wish records")}>
          <p className="text-sm text-white/65">{t("访客记录按本浏览器区分，钱包记录按当前地址筛选；这不是身份验证。记录目前存于服务内存，重启可能丢失。旧版共享演示访客记录不自动归属到你。", "Guest records belong to this browser; wallet records are filtered by address, not authenticated. Server restarts may lose records. Legacy shared demo records are not assigned to you.")}</p>
          <button className="wl-pill justify-self-start" disabled={loading} onClick={() => { setLoading(true); setError(null); void refresh().catch(() => setError(t("刷新失败，请重试", "Refresh failed. Please retry."))).finally(() => setLoading(false)); }}>{t("刷新进度", "Refresh progress")}</button>
          {error && <p role="alert" className="text-red-200">{error}</p>}
          {loading ? <p role="status">{t("正在加载记录…", "Loading wishes…")}</p> : !error && myWishes.length === 0 ? <div className="wl-card p-6"><h2>{t("还没有属于你的许愿", "No wishes yet")}</h2><p className="mt-3 text-white/65">{t("创建第一条许愿，之后可在这里查看进度。", "Create your first wish, then track it here.")}</p></div> : myWishes.map((wish) => {
            const progress = wishProgress(wish, wishes, demands);
            const copy = new URLSearchParams({ copy: "1", artist: wish.artistName, genre: wish.genre, city: wish.city, date: wish.preferredDate, budget: String(wish.depositAmount) });
            return <article id={wish.wishId} key={wish.wishId} className="wl-card p-6" style={{ overflowWrap: "anywhere" }}>
              <div className="flex flex-wrap justify-between gap-3"><h2>{wish.artistName}</h2><span className="text-[#d49aff]">{progress.stage === "withdrawn" ? t("已撤回", "Withdrawn") : progress.stage === "collecting" ? t("需求聚合中", "Collecting wishes") : progress.stage === "ready" ? t("候选齐备，待协商", "Candidates ready") : t("等待合适候选", "Awaiting candidates")}</span></div>
              <p className="mt-3 text-white/70">{wish.city} · {wish.genre} · {wish.preferredDate} · {t("意向预算", "Budget intent")}: {wish.depositAmount}</p>
              <p className="mt-4">{t("同风格、城市和日期已汇集", "Wishes with the same genre, city and date")}: {progress.count}/{progress.threshold}</p>
              <progress className="mt-3 w-full accent-purple-400" aria-label={t("需求聚合进度", "Demand collection progress")} max={progress.threshold} value={Math.min(progress.count, progress.threshold)} />
              <p className="mt-3 text-white/65">{progress.stage === "collecting" ? t("等待更多许愿加入；尚未开始协商。", "Waiting for more wishes; negotiation has not started.") : progress.stage === "waiting" ? t("暂未找到完整的乐手和场地组合；可查看结果，或复制条件创建新许愿。", "No complete musician/venue combination. Review results or copy preferences into a new wish.") : progress.stage === "ready" ? t("候选不等于演出确认，请进入需求页查看后续状态。", "Candidates do not mean a confirmed show. Open the demand page for details.") : t("此许愿不再参与聚合。", "This wish no longer participates in collection.")}</p>
              <div className="mt-5 flex flex-wrap gap-3">{progress.demand && <Link className="wl-primary" href={`/demand-pool/${encodeURIComponent(progress.demand.demandId)}`}>{t("查看需求与候选", "Review demand and candidates")}</Link>}<Link className="wl-pill" href={`/wish-pool?${copy}`}>{t("复制条件创建新许愿", "Copy into a new wish")}</Link></div>
            </article>;
          })}
        </section>}

        {!historyOnly && <div className="grid gap-7 md:grid-cols-4">
          <StatTile label={t("活跃许愿", "Active Wishes")} value={activeWishes.length} />
          <StatTile label={t("需求池", "Demand Pools")} tone="cyan" value={demands.length} />
          <StatTile tone="green" label={t("候选齐备", "Ready to negotiate")} value={demands.filter((demand) => matchingReadiness(demand.matching).ready).length} />
          <StatTile tone="orange" label={t("等待候选", "Awaiting candidates")} value={demands.filter((demand) => !matchingReadiness(demand.matching).ready).length} />
        </div>}
      </div>
    </WishLiveShell>
  );
}

async function postWish(values: WishFormValues & { userId: string }) {
  const payload = WishCreateRequestSchema.parse(values);
  const response = await fetch("/api/wishes", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 503) throw new Error("事件服务不可用，请稍后重试 / Event service unavailable. Please retry later.");
    const body = await readErrorBody(response);
    throw new Error(body.error ?? "Wish submission failed");
  }

  return (await response.json()) as WishCreateResponse;
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
