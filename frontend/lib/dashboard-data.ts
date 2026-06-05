import type { AgentCard, AgentType } from "@wishlive/shared";
import type { Edge, Node } from "@xyflow/react";

export const agentTypeColor: Record<AgentType, string> = {
  audience: "#a78bfa",
  musician: "#6ee7b7",
  venue: "#fb923c",
  manager: "#60a5fa",
  business: "#22d3ee",
  infrastructure: "#cbd5e1"
};

export const agentTypeLabel: Record<AgentType, string> = {
  audience: "Audience",
  musician: "Musician",
  venue: "Venue",
  manager: "Manager",
  business: "Business",
  infrastructure: "Infra"
};

export type DashboardEvent = {
  time: string;
  type: string;
  agent: string;
  detail: string;
};

export function buildTopology(agents: AgentCard[]) {
  const grouped = groupAgents(agents);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const centers: Record<AgentType, { x: number; y: number }> = {
    business: { x: 0, y: 0 },
    audience: { x: -430, y: -120 },
    musician: { x: 430, y: -120 },
    venue: { x: 430, y: 180 },
    manager: { x: -430, y: 180 },
    infrastructure: { x: 0, y: 280 }
  };

  for (const type of Object.keys(grouped) as AgentType[]) {
    const list = grouped[type];
    const center = centers[type];
    list.forEach((agent, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(list.length, 1);
      const radius = type === "business" ? 135 : 85;
      nodes.push({
        id: agent.agent_id,
        type: "default",
        position: {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius
        },
        data: {
          label: shortAgentLabel(agent)
        },
        style: {
          width: 118,
          border: `1px solid ${agentTypeColor[type]}88`,
          borderRadius: 8,
          background: `${agentTypeColor[type]}22`,
          boxShadow: `0 0 18px ${agentTypeColor[type]}44`,
          color: "#f8fafc",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace"
        }
      });
    });
  }

  const business = grouped.business;
  for (let index = 0; index < business.length - 1; index += 1) {
    const source = business[index];
    const target = business[index + 1];
    if (source && target) {
      edges.push(flowEdge(source.agent_id, target.agent_id, "#22d3ee"));
    }
  }

  connectCluster(edges, grouped.audience, business[2]?.agent_id, "#a78bfa");
  connectCluster(edges, grouped.musician, business[4]?.agent_id, "#6ee7b7");
  connectCluster(edges, grouped.venue, business[5]?.agent_id, "#fb923c");
  connectCluster(edges, grouped.manager, business[0]?.agent_id, "#60a5fa");
  connectCluster(edges, grouped.infrastructure, business[6]?.agent_id, "#cbd5e1");

  return { nodes, edges };
}

export function buildEventStream(agents: AgentCard[]): DashboardEvent[] {
  const eventTypes = [
    "agent.registered",
    "agent.heartbeat",
    "wish.created",
    "demand.created",
    "matching.completed",
    "negotiation.started",
    "proposal.sent",
    "counterproposal.sent",
    "deal.created",
    "show.confirmed",
    "escrow.created",
    "ticket.minted"
  ];

  return agents.slice(0, 24).map((agent, index) => ({
    time: `14:${String(32 + Math.floor(index / 2)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
    type: eventTypes[index % eventTypes.length] ?? "agent.heartbeat",
    agent: agent.agent_id.replace("agent:", ""),
    detail: eventDetail(index)
  }));
}

export function metricCards(onlineCount: number) {
  return [
    { label: "Online Agents", value: String(onlineCount), tone: "text-emerald-300" },
    { label: "Active Tasks", value: "128", tone: "text-sky-300" },
    { label: "Negotiations", value: "23", tone: "text-orange-300" },
    { label: "On-chain Tx", value: "15,687", tone: "text-[#ddb7ff]" }
  ] as const;
}

function groupAgents(agents: AgentCard[]) {
  return agents.reduce<Record<AgentType, AgentCard[]>>(
    (groups, agent) => {
      groups[agent.type].push(agent);
      return groups;
    },
    {
      audience: [],
      musician: [],
      venue: [],
      manager: [],
      business: [],
      infrastructure: []
    }
  );
}

function shortAgentLabel(agent: AgentCard) {
  const label = agent.metadata.name;
  if (typeof label === "string") {
    return label.replace(" Agent", "");
  }
  return agent.agent_id;
}

function flowEdge(source: string, target: string, color: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    animated: true,
    style: { stroke: color, strokeWidth: 1.5 }
  };
}

function connectCluster(edges: Edge[], agents: AgentCard[], target: string | undefined, color: string) {
  if (!target) {
    return;
  }

  agents.slice(0, 5).forEach((agent) => {
    edges.push(flowEdge(agent.agent_id, target, color));
  });
}

function eventDetail(index: number) {
  const details = [
    "Agent card indexed",
    "Heartbeat accepted",
    "Wish submitted",
    "Demand threshold reached",
    "Top 3 candidates ranked",
    "Session opened",
    "Venue fee proposed",
    "Revenue split countered",
    "Deal pending confirmation",
    "Human confirmed",
    "Escrow created",
    "Ticket NFT minted"
  ];
  return details[index % details.length] ?? "Event processed";
}
