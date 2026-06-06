import { NextResponse } from "next/server";
import { RedisEventBus } from "@wishlive/backend";

const STREAMS = [
  "agent.lifecycle",
  "agent.task",
  "agent.runtime",
  "a2a.discovery",
  "wish.events",
  "demand.events",
  "matching.events",
  "negotiation.events",
  "settlement.events",
  "show.events"
];

export async function GET() {
  const encoder = new TextEncoder();
  const eventBus = new RedisEventBus();
  const sent = new Set<string>();
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      interval = setInterval(() => {
        eventBus
          .readRecent(STREAMS, 12)
          .then((entries) => {
            entries
              .reverse()
              .filter(({ event }) => !sent.has(event.id))
              .forEach(({ stream: eventStream, event }) => {
                sent.add(event.id);
                controller.enqueue(encoder.encode("event: message\n"));
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      stream: eventStream,
                      event
                    })}\n\n`
                  )
                );
              });
          })
          .catch((error: unknown) => {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({
                  message: error instanceof Error ? error.message : "SSE read failed"
                })}\n\n`
              )
            );
          });
      }, 1_000);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
      }
      void eventBus.close();
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
