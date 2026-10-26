"use client";

import { useWalletAccount } from "../app/providers";
import { useLanguage } from "./language-provider";

export function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const { address, connect, disconnect, isConnected, isPending } = useWalletAccount();
  const className = (compact ? "wl-pill wl-pill-small" : "wl-wallet-button") + " whitespace-nowrap shrink-0";

  if (isConnected) {
    return (
      <button className={className} onClick={() => disconnect()} type="button">
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <button
      className={className}
      disabled={isPending}
      onClick={() => void connect()}
      type="button"
    >
      {isPending ? t("连接中…", "Connecting...") : t("连接钱包", "Connect Wallet")}
    </button>
  );
}

function shortAddress(address?: string) {
  if (!address) {
    return "Connected";
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
