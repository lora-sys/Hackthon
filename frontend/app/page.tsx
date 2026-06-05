import { HeroDashboardPreview } from "../components/hero-dashboard-preview";
import { LandingActions } from "../components/landing-actions";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <span className="font-mono text-sm uppercase tracking-[0.2em] text-[#ddb7ff]">
          WishLive
        </span>
        <LandingActions />
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 pb-12 pt-20">
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

        <HeroDashboardPreview />
      </section>
    </main>
  );
}
