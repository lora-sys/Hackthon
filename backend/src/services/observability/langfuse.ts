import { LangfuseSpanProcessor } from "@langfuse/otel";
import { setLangfuseTracerProvider } from "@langfuse/tracing";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

type LangfuseState = {
  enabled: boolean;
  configured: boolean;
  host: string | null;
  error: string | null;
};

declare global {
  var __wishliveLangfuseState: LangfuseState | undefined;
}

export function ensureLangfuse() {
  if (globalThis.__wishliveLangfuseState) {
    return globalThis.__wishliveLangfuseState;
  }

  const host = process.env.LANGFUSE_HOST ?? process.env.LANGFUSE_BASE_URL ?? null;
  const configured = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
  if (!configured) {
    globalThis.__wishliveLangfuseState = {
      enabled: false,
      configured: false,
      host,
      error: "LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY missing"
    };
    return globalThis.__wishliveLangfuseState;
  }

  try {
    const provider = new NodeTracerProvider({
      spanProcessors: [new LangfuseSpanProcessor()]
    });
    provider.register();
    setLangfuseTracerProvider(provider);
    globalThis.__wishliveLangfuseState = {
      enabled: true,
      configured: true,
      host,
      error: null
    };
  } catch (error) {
    globalThis.__wishliveLangfuseState = {
      enabled: false,
      configured: true,
      host,
      error: error instanceof Error ? error.message : "Langfuse setup failed"
    };
  }

  return globalThis.__wishliveLangfuseState;
}

export function langfuseTraceUrl(traceId: string) {
  const state = ensureLangfuse();
  if (!state.enabled || !state.host) {
    return null;
  }
  return `${state.host.replace(/\/$/, "")}/project/default/traces/${encodeURIComponent(traceId)}`;
}
