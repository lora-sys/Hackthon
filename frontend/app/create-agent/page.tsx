"use client";

import { Button } from "@heroui/react";
import type { AgentCard, AgentType } from "@wishlive/shared";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const roleDefaults: Record<AgentType, Pick<AgentCard, "skills" | "tags" | "metadata">> = {
  audience: {
    skills: ["submit_wish", "withdraw_wish", "confirm_show"],
    tags: ["role:audience", "city:shanghai"],
    metadata: { city: "shanghai", preferredGenres: ["rock", "pop"] }
  },
  musician: {
    skills: ["check_availability", "propose_offer", "counter_offer", "accept_offer"],
    tags: ["role:musician", "genre:rock", "city:shanghai"],
    metadata: {
      genre: "rock",
      city: "shanghai",
      availabilityCalendar: ["2026-07-17", "2026-07-18"],
      minFee: 2400,
      splitPreference: 25,
      managerAgentId: "agent:manager:001"
    }
  },
  venue: {
    skills: ["check_capacity", "quote_price", "counter_offer", "accept_offer"],
    tags: ["role:venue", "city:shanghai", "capacity:500"],
    metadata: {
      city: "shanghai",
      capacity: 500,
      baseFee: 4800,
      availableDates: ["2026-07-17", "2026-07-18"],
      splitPreference: 22,
      managerAgentId: "agent:manager:002"
    }
  },
  manager: {
    skills: ["manage_musicians", "manage_venues"],
    tags: ["layer:manager"],
    metadata: { discoveryScope: "local-roster" }
  },
  business: {
    skills: ["discover_agents", "rank_candidates"],
    tags: ["layer:business"],
    metadata: { workflowRole: "matching" }
  },
  infrastructure: {
    skills: ["observe", "report_status"],
    tags: ["layer:infrastructure"],
    metadata: { service: "a2a-discovery" }
  }
};

export default function CreateAgentPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#07080d] px-5 py-6 text-white">Loading AgentCard...</main>}>
      <CreateAgentContent />
    </Suspense>
  );
}

function CreateAgentContent() {
  const searchParams = useSearchParams();
  const initialRole = parseRole(searchParams.get("role"));
  const [role, setRole] = useState<AgentType>(initialRole);
  const [registered, setRegistered] = useState<{ agentId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const card = useMemo(() => buildCard(role), [role]);

  async function registerAgent() {
    setError(null);
    setRegistered(null);
    const response = await fetch("/api/registry/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card)
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Agent registration failed");
      return;
    }
    setRegistered((await response.json()) as { agentId: string; status: string });
  }

  return (
    <main className="min-h-screen bg-[#07080d] px-5 py-6 text-white lg:px-8">
      <section className="mx-auto grid max-w-[1450px] gap-5">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#22d3ee]">
            Create Agent
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">
            AgentCard + A2A endpoint
          </h1>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              Role
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["audience", "musician", "venue", "manager"] as AgentType[]).map((item) => (
                <button
                  className={`rounded-lg border px-4 py-4 text-left transition ${
                    role === item
                      ? "border-[#22d3ee] bg-[#22d3ee]/15"
                      : "border-white/10 bg-[#11131b]"
                  }`}
                  key={item}
                  onClick={() => setRole(item)}
                  type="button"
                >
                  <span className="font-mono text-xs uppercase text-white/45">{item}</span>
                  <p className="mt-2 font-bold text-white">{buildCard(item).name}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 rounded-lg border border-white/10 bg-[#11131b] p-4">
              <Info label="A2A endpoint" value={card.supported_interfaces[0]?.url ?? "not set"} />
              <Info label="Skills" value={card.skills.join(", ")} />
              <Info label="Reputation" value={String(card.reputation)} />
              <Info label="AgentProfile" value="localnet pending anchor" />
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                {error}
              </p>
            )}
            {registered && (
              <p className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                {registered.agentId} · {registered.status}
              </p>
            )}

            <Button
              className="mt-5 rounded-lg bg-[#ddb7ff] px-5 py-3 font-bold text-[#22003f]"
              onPress={() => void registerAgent()}
            >
              Register AgentCard
            </Button>
          </section>

          <section className="rounded-lg border border-[#ddb7ff]/20 bg-[#11131b] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              Card JSON
            </h2>
            <pre className="mt-4 max-h-[660px] overflow-auto rounded-lg border border-white/10 bg-[#07080d] p-4 text-xs leading-6 text-white/72">
              {JSON.stringify(card, null, 2)}
            </pre>
          </section>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase text-white/40">{label}</p>
      <p className="mt-1 break-all text-sm text-white/75">{value}</p>
    </div>
  );
}

function parseRole(value: string | null): AgentType {
  if (value === "musician" || value === "venue" || value === "manager") {
    return value;
  }
  return "audience";
}

function buildCard(role: AgentType): AgentCard {
  const defaults = roleDefaults[role];
  const agentId = `agent:${role}:local-${cryptoSafeId()}`;
  return {
    agent_id: agentId,
    did: `did:wishlive:${role}:local`,
    wallet: "0x000000000000000000000000000000000000dEaD",
    type: role,
    name: `Local ${role} Agent`,
    description: `Local ${role} AgentCard for WishLive A2A discovery.`,
    skills: defaults.skills,
    skill_details: defaults.skills.map((entry) => ({
      id: entry,
      name: entry.replaceAll("_", " "),
      description: `${entry} tool`,
      tags: [role],
      examples: [`${entry} call`]
    })),
    tags: defaults.tags,
    reputation: 70,
    reputationBreakdown: {
      completedDeals: 0,
      failures: 0,
      complaints: 0,
      responseTimeScore: 70,
      fulfillmentRate: 0.9,
      score: 70
    },
    supported_interfaces: [
      {
        url: `redis://agent.task/${agentId}`,
        protocol_binding: "Redis+JSON",
        protocol_version: "1.0",
        tenant: "wishlive"
      }
    ],
    capabilities: {
      streaming: true,
      push_notifications: false,
      tool_calls: true,
      a2a_discovery: true
    },
    default_input_modes: ["application/json", "text/plain"],
    default_output_modes: ["application/json", "text/plain"],
    managerAgentId: role === "musician" ? "agent:manager:001" : role === "venue" ? "agent:manager:002" : undefined,
    listenStreams: ["agent.task", "wish.events", "negotiation.events"],
    emitEvents: ["agent.message", "agent.tool_call"],
    systemPrompt: `You are a local ${role} agent. Use tools and emit Redis events.`,
    metadata: defaults.metadata
  };
}

function cryptoSafeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return "demo";
}
