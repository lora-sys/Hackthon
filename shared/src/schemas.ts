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

export const AgentSkillDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  examples: z.array(z.string().min(1)).default([])
});

export const AgentInterfaceSchema = z.object({
  url: z.string().min(1),
  protocol_binding: z.string().min(1).default("Redis+JSON"),
  protocol_version: z.string().min(1).default("1.0"),
  tenant: z.string().min(1).default("wishlive")
});

export const AgentCapabilitiesSchema = z.object({
  streaming: z.boolean().default(true),
  push_notifications: z.boolean().default(false),
  tool_calls: z.boolean().default(true),
  a2a_discovery: z.boolean().default(true)
});

export const ReputationBreakdownSchema = z.object({
  completedDeals: z.number().int().nonnegative().default(0),
  failures: z.number().int().nonnegative().default(0),
  complaints: z.number().int().nonnegative().default(0),
  responseTimeScore: z.number().min(0).max(100).default(70),
  fulfillmentRate: z.number().min(0).max(1).default(0.9),
  score: z.number().min(0).max(100).default(70)
});

export const AgentCardSchema = z.object({
  agent_id: z.string().min(1),
  did: z.string().min(1),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  type: AgentTypeSchema,
  skills: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)).default([]),
  reputation: z.number().min(0).max(100).default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  supported_interfaces: z.array(AgentInterfaceSchema).default([]),
  capabilities: AgentCapabilitiesSchema.optional(),
  default_input_modes: z.array(z.string().min(1)).default(["application/json", "text/plain"]),
  default_output_modes: z.array(z.string().min(1)).default(["application/json", "text/plain"]),
  skill_details: z.array(AgentSkillDetailSchema).default([]),
  managerAgentId: z.string().min(1).optional(),
  listenStreams: z.array(z.string().min(1)).default([]),
  emitEvents: z.array(z.string().min(1)).default([]),
  systemPrompt: z.string().min(1).optional(),
  reputationBreakdown: ReputationBreakdownSchema.optional()
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
  type: AgentTypeSchema.optional(),
  skill: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  managerAgentId: z.string().min(1).optional(),
  availability: z.string().min(1).optional(),
  date: z.string().min(1).optional()
});

export const A2ADiscoveryRequestSchema = RegistrySearchRequestSchema.extend({
  requesterAgentId: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  limit: z.number().int().positive().max(25).default(10)
});

export const A2ADiscoveryResultSchema = z.object({
  managerAgentId: z.string().min(1),
  query: A2ADiscoveryRequestSchema,
  agents: z.array(AgentCardSchema),
  createdAt: z.number().int().positive()
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

export const AgentRuntimeModeSchema = z.enum(["real", "simulated"]);

export const AgentToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.number().int().positive(),
  completedAt: z.number().int().positive().optional()
});

export const AgentSessionMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["system", "user", "assistant", "tool"]),
  agentId: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.number().int().positive(),
  simulated: z.boolean().default(false)
});

export const AgentSessionSchema = z.object({
  sessionId: z.string().min(1),
  workflowId: z.string().min(1),
  conversationId: z.string().min(1),
  agentId: z.string().min(1),
  mode: AgentRuntimeModeSchema,
  status: z.enum(["CREATED", "RUNNING", "COMPLETED", "ERROR"]),
  messages: z.array(AgentSessionMessageSchema),
  toolCalls: z.array(AgentToolCallSchema),
  telemetry: z.object({
    workflow_id: z.string().min(1),
    agent_id: z.string().min(1),
    conversation_id: z.string().min(1),
    model: z.string().min(1),
    trace_id: z.string().min(1),
    langfuse_enabled: z.boolean().default(false),
    langfuse_trace_url: z.string().min(1).nullable().default(null)
  }),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive()
});

export const RuntimeSessionListRequestSchema = z.object({
  agentId: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional()
});

export const ShowScheduleSchema = z.object({
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1)
});

export const ProposalTermsSchema = z.object({
  venueFee: z.number().nonnegative(),
  splitPercentage: z.number().min(0).max(100),
  schedule: ShowScheduleSchema
});

export const ProposalTypeSchema = z.enum(["INITIAL", "COUNTER"]);
export const ProposalDecisionSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);

export const ProposalSchema = z.object({
  proposalId: z.string().min(1),
  negotiationId: z.string().min(1),
  senderAgentId: z.string().min(1),
  receiverAgentId: z.string().min(1),
  type: ProposalTypeSchema,
  terms: ProposalTermsSchema,
  decision: ProposalDecisionSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.number().int().positive()
});

export const NegotiationStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "ACCEPTED",
  "REJECTED",
  "TIMEOUT",
  "DEAL_CREATED"
]);

export const DealStatusSchema = z.enum([
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "REJECTED",
  "SETTLED",
  "FAILED"
]);

export const DealSchema = z.object({
  dealId: z.string().min(1),
  negotiationId: z.string().min(1),
  proposalId: z.string().min(1),
  demandId: z.string().min(1),
  musicianAgentId: z.string().min(1),
  venueAgentId: z.string().min(1),
  terms: ProposalTermsSchema,
  status: DealStatusSchema,
  escrowId: z.string().min(1).nullable(),
  ticketId: z.string().min(1).nullable(),
  createdAt: z.number().int().positive(),
  confirmedAt: z.number().int().positive().nullable()
});

export const NegotiationSchema = z.object({
  negotiationId: z.string().min(1),
  demandId: z.string().min(1),
  musicianId: z.string().min(1),
  venueId: z.string().min(1),
  workflowId: z.string().min(1),
  conversationId: z.string().min(1),
  status: NegotiationStatusSchema,
  proposals: z.array(ProposalSchema),
  deal: DealSchema.nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive()
});

export const CreateNegotiationRequestSchema = z.object({
  demandId: z.string().min(1),
  musicianId: z.string().min(1),
  venueId: z.string().min(1)
});

export const SendProposalRequestSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  terms: ProposalTermsSchema
});

export const CounterProposalRequestSchema = z.object({
  proposalId: z.string().min(1),
  from: z.string().min(1),
  newTerms: ProposalTermsSchema
});

export const AcceptProposalRequestSchema = z.object({
  proposalId: z.string().min(1),
  from: z.string().min(1)
});

export const RejectProposalRequestSchema = z.object({
  proposalId: z.string().min(1),
  from: z.string().min(1),
  reason: z.string().min(1).optional()
});

export const EscrowStatusSchema = z.enum(["PENDING", "RELEASED", "REFUNDED"]);

export const EscrowRecordSchema = z.object({
  escrowId: z.string().min(1),
  dealId: z.string().min(1),
  payees: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)),
  shares: z.array(z.number().int().positive()),
  balance: z.number().nonnegative(),
  status: EscrowStatusSchema,
  txHash: z.string().min(1),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable().default(null),
  onchainEscrowId: z.string().min(1).nullable().default(null),
  createdAt: z.number().int().positive(),
  releasedAt: z.number().int().positive().nullable()
});

export const TicketRecordSchema = z.object({
  tokenId: z.string().min(1),
  dealId: z.string().min(1),
  ownerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  metadataUri: z.string().min(1),
  txHash: z.string().min(1),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable().default(null),
  createdAt: z.number().int().positive()
});

export const CreateEscrowRequestSchema = z.object({
  dealId: z.string().min(1),
  payees: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1),
  shares: z.array(z.number().int().positive()).min(1)
});

export const ReleaseEscrowRequestSchema = z.object({
  escrowId: z.string().min(1),
  signature: z.string().min(1)
});

export const MintTicketRequestSchema = z.object({
  dealId: z.string().min(1),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export const ConfirmDealRequestSchema = z.object({
  signature: z.string().min(1).default("local-human-confirmation")
});

export const RejectDealRequestSchema = z.object({
  reason: z.string().min(1).optional()
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

export const ContractAddressesSchema = z.object({
  AgentProfile: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
  Escrow: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
  TicketNFT: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable()
});

export const ContractTxRecordSchema = z.object({
  type: z.string().min(1),
  hash: z.string().min(1),
  contractName: z.string().min(1),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  createdAt: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const ContractStatusSchema = z.object({
  chainId: z.number().int().positive(),
  rpcUrl: z.string().min(1),
  healthy: z.boolean(),
  mode: z.enum(["localnet", "simulated"]),
  addresses: ContractAddressesSchema,
  latestTx: ContractTxRecordSchema.nullable(),
  txs: z.array(ContractTxRecordSchema),
  error: z.string().min(1).nullable().default(null)
});

export const RegisterAgentOnchainRequestSchema = z.object({
  agentId: z.string().min(1),
  did: z.string().min(1),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentCard: z.record(z.string(), z.unknown())
});

export const ConciergeChatRequestSchema = z.object({
  message: z.string().min(1),
  workflowId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional()
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
export type AgentSkillDetail = z.infer<typeof AgentSkillDetailSchema>;
export type ReputationBreakdown = z.infer<typeof ReputationBreakdownSchema>;
export type AgentRecord = z.infer<typeof AgentRecordSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type A2AMessage = z.infer<typeof A2AMessageSchema>;
export type RegistryListRequest = z.infer<typeof RegistryListRequestSchema>;
export type RegistrySearchRequest = z.infer<typeof RegistrySearchRequestSchema>;
export type A2ADiscoveryRequest = z.infer<typeof A2ADiscoveryRequestSchema>;
export type A2ADiscoveryResult = z.infer<typeof A2ADiscoveryResultSchema>;
export type Wish = z.infer<typeof WishSchema>;
export type WishCreateRequest = z.infer<typeof WishCreateRequestSchema>;
export type Demand = z.infer<typeof DemandSchema>;
export type MatchingResult = z.infer<typeof MatchingResultSchema>;
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;
export type AgentSession = z.infer<typeof AgentSessionSchema>;
export type AgentToolCall = z.infer<typeof AgentToolCallSchema>;
export type RuntimeSessionListRequest = z.infer<typeof RuntimeSessionListRequestSchema>;
export type ProposalTerms = z.infer<typeof ProposalTermsSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type Negotiation = z.infer<typeof NegotiationSchema>;
export type Deal = z.infer<typeof DealSchema>;
export type EscrowRecord = z.infer<typeof EscrowRecordSchema>;
export type TicketRecord = z.infer<typeof TicketRecordSchema>;
export type ContractStatus = z.infer<typeof ContractStatusSchema>;
export type ContractTxRecord = z.infer<typeof ContractTxRecordSchema>;
export type ConciergeChatRequest = z.infer<typeof ConciergeChatRequestSchema>;
