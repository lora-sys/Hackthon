import type { AgentSession, RuntimeSessionListRequest } from "@wishlive/shared";

declare global {
  var __wishliveRuntimeSessions: AgentSession[] | undefined;
}

export function addRuntimeSession(session: AgentSession) {
  const sessions = getRuntimeSessions();
  sessions.unshift(session);
  if (sessions.length > 200) {
    sessions.length = 200;
  }
}

export function listRuntimeSessions(input: RuntimeSessionListRequest = {}) {
  return getRuntimeSessions().filter(
    (session) =>
      (!input.agentId || session.agentId === input.agentId) &&
      (!input.workflowId || session.workflowId === input.workflowId) &&
      (!input.conversationId || session.conversationId === input.conversationId)
  );
}

export function resetRuntimeSessionsForTests() {
  globalThis.__wishliveRuntimeSessions = [];
}

function getRuntimeSessions() {
  globalThis.__wishliveRuntimeSessions ??= [];
  return globalThis.__wishliveRuntimeSessions;
}
