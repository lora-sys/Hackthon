import { z } from "zod";

export const AgentTypeSchema = z.enum([
  "audience",
  "musician",
  "venue",
  "manager",
  "business",
  "infrastructure"
]);

export const AgentStatusSchema = z.enum([
  "CREATED",
  "REGISTERED",
  "ONLINE",
  "BUSY",
  "WAITING_CONFIRMATION",
  "COMPLETED",
  "OFFLINE",
  "ERROR"
]);

export const AgentCardSchema = z.object({
  agent_id: z.string().min(1),
  did: z.string().min(1),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  type: AgentTypeSchema,
  skills: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)).default([]),
  reputation: z.number().min(0).max(100).default(0),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const EventEnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.number().int().positive(),
  data: z.record(z.string(), z.unknown()),
  metadata: z.object({
    traceId: z.string().min(1),
    spanId: z.string().min(1)
  })
});

export const A2AMessageTypeSchema = z.enum([
  "TASK",
  "EVENT",
  "PROPOSAL",
  "COUNTER_PROPOSAL",
  "ACCEPT",
  "REJECT",
  "INTERRUPT",
  "RESUME",
  "NOTIFICATION"
]);

export const A2AMessageSchema = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  conversationId: z.string().min(1),
  sender: z.string().min(1),
  receiver: z.string().min(1),
  type: A2AMessageTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string().datetime()
});

export type AgentCard = z.infer<typeof AgentCardSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type A2AMessage = z.infer<typeof A2AMessageSchema>;
