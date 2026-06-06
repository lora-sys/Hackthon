# WishLive Staged Roadmap

## Product Frame

WishLive is an Agent Native Marketplace for live show creation. The demo is not
a normal ticketing app. It is an A2A multi-agent orchestration system with a
real-time topology dashboard and blockchain-backed settlement.

## Demo Spine

The main judge-facing screen is the Live Dashboard:

- Agent Topology with 57+ online agents
- Real-time metrics
- Redis event stream
- Negotiation panel
- Blockchain status for AgentProfile, Escrow, TicketNFT, and transactions

The main business run is:

```text
Audience -> Onboarding -> Concierge -> WishMaker -> Demand Pool
-> Matching -> Negotiation -> Musician -> Venue -> ShowConfirm
-> Settlement -> Hardhat
```

## Frozen Technology Stack

- Frontend: Next.js 15 App Router, TypeScript, HeroUI, shadcn/ui, Tailwind CSS v4
- Frontend state: Zustand, TanStack Query, React Hook Form, Zod
- Visualization: React Flow for topology, Recharts for metrics
- AI: Vercel AI SDK, ToolLoopAgent, AI SDK UI, AI Elements
- Agent communication: Redis Streams and A2A message envelopes
- Persistence: PostgreSQL
- Blockchain: Hardhat Localnet, AgentProfile, Escrow, TicketNFT only
- Observability: Redis Streams for business events, AI SDK telemetry and Langfuse
- QA: unit/integration tests plus browser testing for UI phases

## Phase 1 - Infra

Goal: local infrastructure is stable.

Build items:

- PostgreSQL
- Redis
- Hardhat Localnet
- `.env.example`
- helper scripts and Docker runbook

Test gate:

- `docker compose config`
- 3/3 services healthy
- Postgres `pg_isready`
- Redis `PING`
- Hardhat `eth_chainId = 0x7a69`

Status: `REVIEW` in PR `#1`.

## Phase 2 - Specs And Roadmap

Goal: create a delivery system that can drive phased implementation.

Build items:

- specs index
- staged roadmap
- task tracker
- acceptance matrix

Test gate:

- specs cover 8 phases
- every phase has a measurable gate
- Dashboard and Topology are named as primary demo surfaces

Status: `IN_PROGRESS`.

## Phase 3 - App Scaffold

Goal: create a typed app shell without business runtime.

Build items:

- Next.js 15 frontend scaffold
- TypeScript backend scaffold
- Hardhat contracts scaffold
- shared Zod schemas
- lint, typecheck, test, build scripts

Test gate:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- browser opens local homepage with no critical console errors

Status: `REVIEW`.

## Phase 4 - Agent Runtime And Registry

Goal: make agents visible, searchable, and alive.

Build items:

- AgentCard schema
- BaseAgent lifecycle
- Registry register/search/heartbeat/list APIs
- Redis lifecycle events
- 57+ seed agents

Test gate:

- `/api/agents/online` returns `count >= 57`
- Registry integration tests pass
- Redis contains register and heartbeat lifecycle events

Status: `REVIEW`.

## Phase 5 - Live Topology Dashboard

Goal: build the judge-facing monitoring screen.

Build items:

- `/dashboard`
- `/topology`
- React Flow topology with 57+ nodes
- metrics cards
- event stream
- negotiation panel
- blockchain status panel

Test gate:

- browser screenshot shows 57+ topology nodes
- SSE event-to-UI latency is less than 2 seconds
- event stream shows at least 20 events
- desktop and mobile screenshots are recorded

Status: `REVIEW`.

## Phase 6 - Wish, Demand, Matching

Goal: implement the demand creation and candidate matching flow.

Build items:

- Wish Pool
- WishMaker
- Demand Pool with `MIN_THRESHOLD = 10`
- Matching formula: Genre 40%, Location 30%, Availability 20%, Reputation 10%

Test gate:

- browser submits 10 wishes and creates 1 demand
- matching returns musician Top 3 and venue Top 3
- scoring unit tests have zero formula drift

Status: `TODO`.

## Phase 7 - Negotiation And Settlement

Goal: complete the agent negotiation and blockchain settlement loop.

Build items:

- proposal, counter, accept, reject
- deal creation
- ShowConfirm human confirmation
- AgentProfile, Escrow, TicketNFT

Test gate:

- Redis contains the complete negotiation event chain
- release is blocked before human confirmation
- confirmation creates escrow and mints ticket
- Hardhat tests pass

Status: `TODO`.

## Phase 8 - Concierge, Observability, Demo

Goal: polish the end-to-end story for demo.

Build items:

- Concierge floating assistant
- AI SDK telemetry
- Langfuse integration
- 5-minute demo script

Test gate:

- Langfuse trace is searchable by `workflow_id`
- Concierge explains current workflow status
- browser end-to-end demo passes

Status: `TODO`.
