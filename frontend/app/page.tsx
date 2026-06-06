import { LandingActions } from "../components/landing-actions";
import Link from "next/link";

const roles = [
  {
    label: "Audience",
    agent: "Audience Agent",
    href: "/create-agent?role=audience",
    tone: "border-violet-300/25 bg-violet-300/10 text-violet-100"
  },
  {
    label: "Musician",
    agent: "Musician Agent",
    href: "/create-agent?role=musician",
    tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
  },
  {
    label: "Venue",
    agent: "Venue Agent",
    href: "/create-agent?role=venue",
    tone: "border-orange-300/25 bg-orange-300/10 text-orange-100"
  },
  {
    label: "Operator",
    agent: "Dashboard",
    href: "/dashboard",
    tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
  }
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <span className="font-mono text-sm uppercase tracking-[0.2em] text-[#ddb7ff]">
          WishLive
        </span>
        <LandingActions />
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 pb-12 pt-16">
        <div className="max-w-4xl">
          <p className="font-mono text-sm uppercase text-[#adc6ff]">
            Agent Native Marketplace
          </p>
          <h1 className="mt-5 text-5xl font-black leading-tight text-white sm:text-7xl">
            Turn audience demand into live shows through A2A agents.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            WishLive coordinates audience wishes, musician availability, venue
            capacity, negotiation, human confirmation, escrow, and ticket NFT
            minting through a visible multi-agent workflow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {roles.map((role) => (
            <Link
              className={`rounded-lg border p-5 transition hover:-translate-y-1 hover:border-white/35 ${role.tone}`}
              href={role.href}
              key={role.label}
            >
              <p className="font-mono text-xs uppercase text-white/45">{role.label}</p>
              <h2 className="mt-3 text-2xl font-black text-white">{role.agent}</h2>
              <p className="mt-4 text-sm leading-6 text-white/62">
                Create or inspect an AgentCard, then enter the live A2A workflow.
              </p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <Link
            className="rounded-lg border border-[#22d3ee]/25 bg-[#22d3ee]/10 p-6 transition hover:border-[#22d3ee]/70"
            href="/wish-pool"
          >
            <p className="font-mono text-xs uppercase text-[#22d3ee]">Primary Audience Flow</p>
            <h2 className="mt-3 text-3xl font-black text-white">
              Submit a wish and let agents discover, match, and negotiate.
            </h2>
          </Link>
          <Link
            className="rounded-lg border border-[#ddb7ff]/25 bg-[#ddb7ff]/10 p-6 transition hover:border-[#ddb7ff]/70"
            href="/my-agent"
          >
            <p className="font-mono text-xs uppercase text-[#ddb7ff]">My Agent</p>
            <h2 className="mt-3 text-3xl font-black text-white">
              Watch your AgentCard, inbox, tools, and reputation.
            </h2>
          </Link>
        </div>
      </section>
    </main>
  );
}
