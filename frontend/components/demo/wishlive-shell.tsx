import Link from "next/link";
import type { ReactNode } from "react";
import { WalletConnectButton } from "../wallet-connect-button";

const navItems = [
  ["Overview", "/"],
  ["Wishes", "/wish-pool"],
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
  return (
    <main className="wl-grid min-h-screen bg-[#05050a] text-white">
      <aside className="wl-sidebar">
        <Link className="block" href="/">
          <div className="text-4xl font-black tracking-tight">WishLive</div>
          <div className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-[#d9a5ff]">
            {section}
          </div>
        </Link>
        <nav className="mt-16 grid gap-5">
          {navItems.map(([label, href]) => (
            <Link
              className={label === active ? "wl-nav-item wl-nav-active" : "wl-nav-item"}
              href={href}
              key={label}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1 px-6 py-12 lg:px-14">
        <div className="mb-12 flex items-center justify-end gap-4">
          {showWallet && <WalletConnectButton compact />}
          <span className="wl-online-pill">● {online} Agents Online</span>
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
