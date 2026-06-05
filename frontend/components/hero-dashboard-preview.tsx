"use client";

import { Card, CardContent, Chip } from "@heroui/react";
import { demoFlow, demoMetrics } from "../lib/demo";

export function HeroDashboardPreview() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border border-white/10 bg-[#201f22]/80">
        <CardContent className="gap-5 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase text-[#adc6ff]">
              Agent Topology
            </p>
            <Chip className="border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
              live
            </Chip>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {demoFlow.map((agent, index) => (
              <div
                className="rounded-lg border border-[#ddb7ff]/20 bg-white/[0.03] p-3 text-center"
                key={agent}
              >
                <div className="mx-auto mb-2 size-2 rounded-full bg-[#ddb7ff]" />
                <p className="text-xs text-white/70">{agent}</p>
                <p className="font-mono text-[10px] text-white/35">
                  step {index + 1}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {demoMetrics.map((metric) => (
          <Card className="border border-white/10 bg-[#201f22]/80" key={metric.label}>
            <CardContent className="p-5">
              <p className="font-mono text-xs uppercase text-white/45">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#ddb7ff]">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
