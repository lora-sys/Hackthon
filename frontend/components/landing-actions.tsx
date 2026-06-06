"use client";

import { Button } from "@heroui/react";
import Link from "next/link";

export function LandingActions() {
  return (
    <div className="flex gap-3">
      <Link href="/dashboard">
        <Button className="rounded-lg border border-[#adc6ff]/30 bg-white/5 px-4 py-2 text-sm text-[#adc6ff]">
          Dashboard
        </Button>
      </Link>
      <Link href="/wish-pool">
        <Button className="rounded-lg bg-[#ddb7ff] px-4 py-2 text-sm font-semibold text-[#2c0051]">
          Wish Pool
        </Button>
      </Link>
    </div>
  );
}
