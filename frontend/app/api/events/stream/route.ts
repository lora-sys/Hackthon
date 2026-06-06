import { NextResponse } from "next/server";

const eventTypes = [
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
] as const;

export async function GET() {
  const encoder = new TextEncoder();
  let index = 0;
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      interval = setInterval(() => {
        const type = eventTypes[index % eventTypes.length] ?? "agent.heartbeat";
        const payload = {
          time: new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }),
          type,
          agent: `live:${String((index % 57) + 1).padStart(3, "0")}`,
          detail: `SSE event delivered in ${index % 2 === 0 ? "<1s" : "1s"}`
        };

        controller.enqueue(encoder.encode(`event: message\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        index += 1;
      }, 1_000);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream"
    }
  });
}
