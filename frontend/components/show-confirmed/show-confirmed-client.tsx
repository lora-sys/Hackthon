"use client";

import type { Deal } from "@wishlive/shared";
import { useEffect, useState } from "react";
import { useWalletAccount } from "../../app/providers";
import { DemoImage, WishLiveShell } from "../demo/wishlive-shell";
import { useLanguage } from "../language-provider";

type SettlementResult = {
  status: string;
  deal: Deal;
  escrow: {
    escrowId: string;
    txHash: string;
    status: string;
  };
  releaseTxHash: string;
  ticket: {
    tokenId: string;
    txHash: string;
    ownerWallet: string;
  };
};

type ContractStatus = {
  chainId: number;
  mode: string;
  counts: {
    escrows: number;
    tickets: number;
    tx: number;
  };
  latestTx: string | null;
};

export function ShowConfirmedClient({ dealId }: { dealId: string }) {
  const { t } = useLanguage();
  const { address } = useWalletAccount();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [contracts, setContracts] = useState<ContractStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void refresh();
  }, [dealId]);

  async function refresh() {
    setError(null);
    try {
      const [dealResponse, contractsResponse] = await Promise.all([
        fetch(`/api/deals/${encodeURIComponent(dealId)}`, { cache: "no-store" }),
        fetch("/api/contracts/status", { cache: "no-store" })
      ]);
      if (!dealResponse.ok) {
        const body = await dealResponse.json() as { error?: string };
        throw new Error(body.error ?? "Deal not found");
      }
      setDeal((await dealResponse.json()) as Deal);
      setContracts((await contractsResponse.json()) as ContractStatus);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Show confirmation loading failed");
    }
  }

  async function confirmShow() {
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/show-confirm/${encodeURIComponent(dealId)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: `wallet:${address ?? "demo-wallet"}:local-human-confirmation`
        })
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? "Confirmation failed");
      }
      const result = (await response.json()) as SettlementResult;
      setSettlement(result);
      setDeal(result.deal);
      await refreshContracts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Show confirmation failed");
    } finally {
      setConfirming(false);
    }
  }

  async function refreshContracts() {
    const response = await fetch("/api/contracts/status", { cache: "no-store" });
    setContracts((await response.json()) as ContractStatus);
  }

  const settledDeal = settlement?.deal ?? deal;
  const tickets = settlement?.ticket || settledDeal?.ticketId ? t("已有票据记录（待链上验证）", "Ticket record exists (verification required)") : t("未铸造", "Not minted");

  return (
    <WishLiveShell active="Chain" online={57} section="Settlement" showWallet>
      <div className="grid gap-9">
        <header>
          <h1 className="text-6xl font-black leading-none tracking-tight md:text-7xl">{t("演出确认", "Show confirmation")}</h1>
          <p className="mt-4 text-xl font-bold text-white/48">
            {t("结算暂未启用，未扣款或铸票。", "Settlement is not enabled. No funds sent or tickets minted.")}
          </p>
        </header>

        {error && <p className="font-bold text-red-200">{error}</p>}

        <div className="grid gap-10 xl:grid-cols-[1fr_0.48fr]">
          <DemoImage
            alt="Confirmed venue"
            caption={t("场地示意图，非确认凭证", "Illustrative venue, not confirmation")}
            className="min-h-[500px]"
            src="/image/Show Confirmed.webp"
          />

          <section className="wl-card p-9">
            <h2 className="text-4xl font-black">{t("订单状态", "Deal status")}: {settledDeal?.status === "PENDING_CONFIRMATION" ? t("待人工确认", "Pending confirmation") : settledDeal?.status ?? t("加载中", "Loading")}</h2>
            <div className="mt-10 grid gap-8 text-lg font-black">
              <Info label={t("场地标识", "Venue ID")} value={settledDeal?.venueAgentId ?? t("待确认", "Pending")} />
              <Info label={t("日期", "Date")} value={settledDeal?.terms.schedule.date ?? "—"} />
              <Info label={t("容量", "Capacity")} value={t("未验证", "Not verified")} />
              <Info label={t("票据", "Tickets")} value={tickets} />
              <Info label={t("网络", "Network")} value={contracts ? `${contracts.chainId === 11155111 ? "Sepolia" : "Hardhat"} ${contracts.chainId}` : "—"} />
            </div>
            <button
              className="wl-primary mt-10 w-full"
              disabled
              onClick={() => void confirmShow()}
              type="button"
            >
              {confirming ? t("处理中", "Processing") : t("结算暂未启用", "Settlement not enabled")}
            </button>
          </section>
        </div>

        <section className="wl-card max-w-4xl p-10">
          <h2 className="text-4xl font-black">Trust Layer</h2>
          <p className="mt-8 text-2xl font-black text-[#45f5a5]">
            {t("只有真实交易验证成功后才会显示结算完成。", "Settlement completes only after successful transaction verification.")}
          </p>
          <div className="mt-8 grid gap-4 text-sm font-semibold text-white/55">
            <p>Deal: {settledDeal?.dealId ?? dealId}</p>
            <p>Escrow: {settlement?.escrow.escrowId ?? settledDeal?.escrowId ?? "waiting for human confirmation"}</p>
            <p>Escrow status: {settlement?.escrow.txHash ?? (settledDeal?.escrowId ? "created" : "not yet created")}</p>
            <p>Release status: {settlement?.releaseTxHash ?? (settledDeal?.ticketId ? "released" : "not yet released")}</p>
            <p>Ticket: {settlement?.ticket.tokenId ?? settledDeal?.ticketId ?? "not yet minted"}</p>
            <p>Latest Sepolia tx: {contracts?.latestTx ?? "none"}</p>
          </div>
        </section>
      </div>
    </WishLiveShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-4">
      <span className="text-sm text-white/42">{label}</span>
      <span>{value}</span>
    </div>
  );
}
