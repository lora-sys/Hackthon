"use client";

import Link from "next/link";
import { useLanguage } from "../language-provider";
import type { ReactNode } from "react";
import { WalletConnectButton } from "../wallet-connect-button";

const navItems = [
  ["Overview", "/"],
  ["Wishes", "/wish-pool"],
  ["My wishes", "/my-wishes"],
  ["Matches", "/demand-pool/latest"],
  ["Agents", "/my-agent"],
  ["Chain", "/dashboard"]
] as const;

export function WishLiveShell({
  children,
  section,
  active = "Overview",
  online = 57,
  showWallet = false
}: {
  children: ReactNode;
  section: string;
  active?: string;
  online?: number;
  showWallet?: boolean;
}) {
  const { t } = useLanguage();
  const labels: Record<string, string> = { Overview: "首页", Wishes: "创建许愿", "My wishes": "我的许愿", Matches: "撮合", Agents: "智能体", Chain: "链上状态", Audience: "观众" };
  return (
    <main className="wl-grid min-h-screen bg-[#05050a] text-white">
      <aside className="wl-sidebar">
        <Link className="block" href="/">
          <div className="text-4xl font-black tracking-tight">WishLive</div>
          <div className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-[#d9a5ff]">
            {t(labels[section] ?? section, section)}
          </div>
        </Link>
        <nav className="mt-16 grid gap-5">
          {navItems.map(([label, href]) => (
            <Link
              className={label === active ? "wl-nav-item wl-nav-active" : "wl-nav-item"}
              href={href}
              key={label}
            >
              {t(labels[label] ?? label, label)}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="wl-workspace min-w-0 flex-1 px-5 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
          {showWallet && <WalletConnectButton compact />}
          <span className="wl-online-pill">{t("演示目录", "Demo registry")} · {online} Agents</span>
        </div>
        {children}
      </section>
    </main>
  );
}

export function DemoImage({
  alt,
  caption,
  className = "",
  src
}: {
  alt: string;
  caption: string;
  className?: string;
  src: string;
}) {
  return (
    <figure className={`wl-image-card ${className}`}>
      <img alt={alt} className="h-full w-full object-cover" src={src} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function StatTile({
  label,
  tone = "purple",
  value
}: {
  label: string;
  tone?: "purple" | "cyan" | "green" | "orange";
  value: string | number;
}) {
  return (
    <div className="wl-stat">
      <div>{label}</div>
      <strong className={`wl-stat-${tone}`}>{value}</strong>
    </div>
  );
}
