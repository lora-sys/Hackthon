"use client";

import { Button } from "@heroui/react";

export function LandingActions() {
  return (
    <div className="flex gap-3">
      <Button className="rounded-lg border border-[#adc6ff]/30 bg-white/5 px-4 py-2 text-sm text-[#adc6ff]">
        Dashboard
      </Button>
      <Button className="rounded-lg bg-[#ddb7ff] px-4 py-2 text-sm font-semibold text-[#2c0051]">
        Create Agent
      </Button>
    </div>
  );
}
