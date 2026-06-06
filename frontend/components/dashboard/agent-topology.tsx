"use client";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { AgentCard, AgentSession } from "@wishlive/shared";
import { useEffect, useMemo, useState } from "react";
import { buildTopology } from "../../lib/dashboard-data";

export function AgentTopology({ agents }: { agents: AgentCard[] }) {
  const { nodes, edges } = buildTopology(agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const selected = useMemo(
    () => agents.find((agent) => agent.agent_id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  useEffect(() => {
    if (!selected?.agent_id) {
      return;
    }
    let cancelled = false;
    fetch(`/api/runtime/sessions?agentId=${encodeURIComponent(selected.agent_id)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: AgentSession[]) => {
        if (!cancelled) {
          setSessions(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.agent_id]);

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_310px]">
      <div className="h-[460px] overflow-hidden rounded-lg border border-white/10 bg-[#07080d]">
        <ReactFlow
          colorMode="dark"
          edges={edges}
          fitView
          maxZoom={1.4}
          minZoom={0.35}
          nodes={nodes}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => setSelectedAgentId(node.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" gap={28} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <aside className="rounded-lg border border-white/10 bg-[#11131b] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
          Agent Session
        </h3>
        {selected ? (
          <div className="mt-4 grid gap-3 text-sm">
            <Detail label="Agent" value={selected.name ?? selected.agent_id} />
            <Detail label="Type" value={selected.type} />
            <Detail label="Manager" value={selected.managerAgentId ?? "self"} />
            <Detail label="A2A" value={selected.supported_interfaces[0]?.url ?? "missing"} />
            <Detail label="Skills" value={selected.skills.slice(0, 5).join(", ")} />
            <Detail label="Runtime" value={`${sessions.length} session(s)`} />
            {sessions[0] && (
              <>
                <Detail label="Last Mode" value={sessions[0].mode} />
                <Detail label="Last Tools" value={sessions[0].toolCalls.map((entry) => entry.name).join(", ") || "none"} />
                <Detail label="Last Message" value={sessions[0].messages[0]?.content ?? "none"} />
              </>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/50">Waiting for agent registry.</p>
        )}
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase text-white/35">{label}</p>
      <p className="mt-1 break-all text-white/75">{value}</p>
    </div>
  );
}
