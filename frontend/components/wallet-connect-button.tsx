"use client";

import { useWalletAccount } from "../app/providers";

export function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const { address, connect, disconnect, isConnected, isPending } = useWalletAccount();
  const className = compact ? "wl-pill wl-pill-small" : "wl-wallet-button";

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
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

function shortAddress(address?: string) {
  if (!address) {
    return "Connected";
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
