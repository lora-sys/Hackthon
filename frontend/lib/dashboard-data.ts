import type { AgentCard, AgentType, ContractStatus, EventEnvelope } from "@wishlive/shared";
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
  id: string;
  time: string;
  type: string;
  agent: string;
  detail: string;
  stream?: string;
};

export type StreamEventPayload = {
  stream: string;
  event: EventEnvelope;
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
  agents
    .filter((agent) => agent.managerAgentId)
    .forEach((agent) => {
      edges.push(flowEdge(agent.managerAgentId as string, agent.agent_id, agentTypeColor[agent.type]));
    });

  return { nodes, edges };
}

export function formatStreamEvent(payload: StreamEventPayload): DashboardEvent {
  const event = payload.event;
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return {
    id: event.id,
    stream: payload.stream,
    time,
    type: event.type,
    agent: event.source.replace("agent:", ""),
    detail: eventDetail(event)
  };
}

export function metricCards({
  onlineCount,
  events,
  contracts
}: {
  onlineCount: number;
  events: DashboardEvent[];
  contracts: ContractStatus | null;
}) {
  const activeTasks = events.filter((event) => event.stream === "agent.task" || event.stream === "agent.runtime").length;
  const negotiations = events.filter((event) => event.stream === "negotiation.events").length;
  const txCount = contracts?.txs.length ?? events.filter((event) => event.stream === "contract.events").length;
  return [
    { label: "Online Agents", value: String(onlineCount), tone: "text-emerald-300" },
    { label: "Active Tasks", value: String(activeTasks), tone: "text-sky-300" },
    { label: "Negotiations", value: String(negotiations), tone: "text-orange-300" },
    { label: "On-chain Tx", value: String(txCount), tone: "text-[#ddb7ff]" }
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

function eventDetail(event: EventEnvelope) {
  const parts = Object.entries(event.data)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${key}:${String(value)}`);

  return parts.length > 0 ? parts.join(" · ") : "Event processed";
}
