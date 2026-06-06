"use client";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { AgentCard } from "@wishlive/shared";
import { buildTopology } from "../../lib/dashboard-data";

export function AgentTopology({ agents }: { agents: AgentCard[] }) {
  const { nodes, edges } = buildTopology(agents);

  return (
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
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={28} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
