"use client";

import type { Demand, Wish } from "@wishlive/shared";
import { WishCreateRequestSchema } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { useWalletAccount } from "../../app/providers";
import { DemoImage, StatTile, WishLiveShell } from "../demo/wishlive-shell";

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
  date: "2026-07-17",
  depositAmount: 20
};

export function WishPoolClient() {
  const { address, isConnected } = useWalletAccount();
  const [values, setValues] = useState(defaultWish);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [status, setStatus] = useState("Audience Agent is ready.");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  const activeWishes = useMemo(
    () => wishes.filter((wish) => wish.genre === values.genre.toLowerCase() && wish.city === values.city.toLowerCase()),
    [wishes, values.city, values.genre]
  );

  async function refresh() {
    const [wishesResponse, demandsResponse] = await Promise.all([
      fetch("/api/wishes", { cache: "no-store" }),
      fetch("/api/wishes/demands", { cache: "no-store" })
    ]);
    setWishes((await wishesResponse.json()) as Wish[]);
    setDemands((await demandsResponse.json()) as Demand[]);
  }

  async function submitWish() {
    setSubmitting(true);
    setError(null);
    setStatus("Audience Agent submitted wish.created.");
    try {
      const runId = crypto.randomUUID().slice(0, 8);
      let latest: WishCreateResponse | null = null;
      for (let index = 0; index < 10; index += 1) {
        latest = await postWish({
          ...values,
          userId:
            index === 0
              ? `wallet:${address ?? "demo-wallet"}`
              : `agent:audience:cohort:${runId}:${index}`
        });
        setStatus(
          index < 9
            ? `WishMaker Agent aggregated ${index + 1}/10 wishes.`
            : "DemandPool threshold reached. Matching Agent is discovering agents."
        );
      }
      await refresh();
      const route = latest?.nextRoute ?? (latest?.demand ? `/demand-pool/${encodeURIComponent(latest.demand.demandId)}` : "/demand-pool/latest");
      window.location.href = route;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Wish submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WishLiveShell active="Wishes" online={57} section="Audience" showWallet>
      <div className="grid gap-9">
        <header>
          <h1 className="text-6xl font-black leading-none tracking-tight md:text-7xl">Create Wish</h1>
          <p className="mt-4 text-2xl font-bold text-white/48">Who do you want to see live?</p>
        </header>

        <div className="grid gap-12 xl:grid-cols-[1.15fr_0.82fr]">
          <DemoImage
            alt="WishLive band"
            caption="Hero band photo"
            className="min-h-[520px]"
            src="/image/Create Wish.webp"
          />

          <section className="wl-card p-12">
            <h2 className="text-5xl font-black">Create a Wish</h2>
            <p className="mt-4 text-xl font-bold text-white/50">Turn a music dream into a market signal.</p>
            <div className="mt-10 grid gap-6">
              <input
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, artistName: event.target.value }))}
                placeholder="Artist / Genre"
                value={values.artistName}
              />
              <input
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, city: event.target.value }))}
                placeholder="City"
                value={values.city}
              />
              <input
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, genre: event.target.value }))}
                placeholder="Genre"
                value={values.genre}
              />
              <input
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, depositAmount: Number(event.target.value) }))}
                placeholder="Budget"
                type="number"
                value={values.depositAmount}
              />
              <input
                className="wl-input"
                onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
                type="date"
                value={values.date}
              />
            </div>

            <div className="mt-10 grid gap-4">
              <button className="wl-primary" disabled={submitting} onClick={() => void submitWish()} type="button">
                {submitting ? "Agents Building Demand..." : "Create Wish"}
              </button>
              <p className="text-sm font-bold text-white/48">
                Owner: {isConnected ? address : "demo wallet fallback"} · {status}
              </p>
              {error && <p className="text-sm font-bold text-red-200">{error}</p>}
            </div>
          </section>
        </div>

        <div className="grid gap-7 md:grid-cols-4">
          <StatTile label="Active Wishes" value={activeWishes.length} />
          <StatTile label="Demand Pools" tone="cyan" value={demands.length} />
          <StatTile tone="green" label="Matches" value={demands.filter((demand) => Boolean(demand.matching)).length} />
          <StatTile tone="orange" label="Confirming" value={demands.filter((demand) => demand.status === "MATCHED").length} />
        </div>
      </div>
    </WishLiveShell>
  );
}

async function postWish(values: WishFormValues & { userId: string }) {
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
