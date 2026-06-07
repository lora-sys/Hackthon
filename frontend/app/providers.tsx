"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type WalletContextValue = {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isPending: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);
const demoWallet = "0x970882409f38a3bfde74248f8736496359e7e59d" as const;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("wishlive:wallet");
    if (stored?.startsWith("0x")) {
      setAddress(stored as `0x${string}`);
    }
  }, []);

  const wallet = useMemo<WalletContextValue>(
    () => ({
      address,
      isConnected: Boolean(address),
      isPending,
      async connect() {
        setIsPending(true);
        try {
          const ethereum = getEthereum();
          if (!ethereum) {
            window.localStorage.setItem("wishlive:wallet", demoWallet);
            setAddress(demoWallet);
            return;
          }
          const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
          const next = accounts[0] as `0x${string}` | undefined;
          if (next) {
            window.localStorage.setItem("wishlive:wallet", next);
            setAddress(next);
          }
        } finally {
          setIsPending(false);
        }
      },
      disconnect() {
        window.localStorage.removeItem("wishlive:wallet");
        setAddress(undefined);
      }
    }),
    [address, isPending]
  );

  return (
    <WalletContext.Provider value={wallet}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WalletContext.Provider>
  );
}

export function useWalletAccount() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWalletAccount must be used inside Providers");
  }
  return value;
}

function getEthereum() {
  return (window as Window & { ethereum?: { request: (input: { method: string }) => Promise<unknown> } }).ethereum;
}
