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

export const AgentRecordSchema = z.object({
  card: AgentCardSchema,
  status: AgentStatusSchema,
  registeredAt: z.number().int().positive(),
  lastHeartbeatAt: z.number().int().positive().nullable()
});

export const RegistryRegisterResponseSchema = z.object({
  agentId: z.string().min(1),
  status: AgentStatusSchema
});

export const RegistryHeartbeatRequestSchema = z.object({
  agentId: z.string().min(1)
});

export const RegistryHeartbeatResponseSchema = z.object({
  status: AgentStatusSchema,
  timestamp: z.number().int().positive()
});

export const RegistrySearchRequestSchema = z.object({
  genre: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  type: AgentTypeSchema.optional()
});

export const RegistryListRequestSchema = z.object({
  status: AgentStatusSchema.optional(),
  type: AgentTypeSchema.optional()
});

export const RegistryOnlineCountSchema = z.object({
  count: z.number().int().nonnegative(),
  byType: z.record(AgentTypeSchema, z.number().int().nonnegative())
});

export const WishStatusSchema = z.enum(["ACTIVE", "FULFILLED", "WITHDRAWN"]);

export const WishCreateRequestSchema = z.object({
  userId: z.string().min(1),
  artistName: z.string().min(1),
  genre: z.string().min(1),
  city: z.string().min(1),
  date: z.string().min(1),
  depositAmount: z.number().nonnegative().default(0)
});

export const WishSchema = z.object({
  wishId: z.string().min(1),
  userId: z.string().min(1),
  artistName: z.string().min(1),
  genre: z.string().min(1),
  city: z.string().min(1),
  preferredDate: z.string().min(1),
  depositAmount: z.number().nonnegative(),
  status: WishStatusSchema,
  createdAt: z.number().int().positive()
});

export const DemandStatusSchema = z.enum(["COLLECTING", "MATCHING", "MATCHED"]);

export const MatchCandidateSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().min(1),
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
  factors: z.object({
    genre: z.number().min(0).max(40),
    location: z.number().min(0).max(30),
    availability: z.number().min(0).max(20),
    reputation: z.number().min(0).max(10)
  })
});

export const MatchingResultSchema = z.object({
  demandId: z.string().min(1),
  musicians: z.array(MatchCandidateSchema),
  venues: z.array(MatchCandidateSchema),
  createdAt: z.number().int().positive()
});

export const DemandSchema = z.object({
  demandId: z.string().min(1),
  artistName: z.string().min(1),
  genre: z.string().min(1),
  city: z.string().min(1),
  preferredDate: z.string().min(1),
  wishCount: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  status: DemandStatusSchema,
  wishIds: z.array(z.string().min(1)),
  matching: MatchingResultSchema.nullable(),
  createdAt: z.number().int().positive()
});

export const WishCreateResponseSchema = z.object({
  wishId: z.string().min(1),
  demand: DemandSchema.nullable(),
  matching: MatchingResultSchema.nullable()
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
export type AgentRecord = z.infer<typeof AgentRecordSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type A2AMessage = z.infer<typeof A2AMessageSchema>;
export type RegistryListRequest = z.infer<typeof RegistryListRequestSchema>;
export type RegistrySearchRequest = z.infer<typeof RegistrySearchRequestSchema>;
export type Wish = z.infer<typeof WishSchema>;
export type WishCreateRequest = z.infer<typeof WishCreateRequestSchema>;
export type Demand = z.infer<typeof DemandSchema>;
export type MatchingResult = z.infer<typeof MatchingResultSchema>;
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;
