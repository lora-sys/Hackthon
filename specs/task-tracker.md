# WishLive Task Tracker

Status values: `TODO`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE`.

| ID | Phase | Task | Status | DependsOn | TestGate | Evidence |
|---|---|---|---|---|---|---|
| P1-01 | Infra | Add Postgres, Redis, Hardhat local Docker stack | REVIEW | None | Docker services healthy | PR #1 |
| P1-02 | Infra | Add env template and Docker runbook | REVIEW | P1-01 | Docs describe setup, health, logs, reset | PR #1 |
| P1-03 | Infra | Validate local infrastructure | REVIEW | P1-01 | compose config, ps, pg_isready, redis ping, eth_chainId | PR #1 |
| P2-01 | Specs | Add specs directory rules | IN_PROGRESS | P1 | README includes status and evidence rules | This PR |
| P2-02 | Specs | Add staged roadmap | IN_PROGRESS | P2-01 | 8 phases with measurable gates | This PR |
| P2-03 | Specs | Add acceptance matrix | IN_PROGRESS | P2-02 | Matrix has one row per phase | This PR |
| P3-01 | Scaffold | Create frontend/backend/contracts/shared scaffold | REVIEW | P2 | lint/typecheck/test/build pass | Phase 3 PR |
| P3-02 | Scaffold | Add shared Zod schemas | REVIEW | P3-01 | schema smoke tests pass | Phase 3 PR |
| P3-03 | Scaffold | Browser smoke test homepage | REVIEW | P3-01 | no critical console errors | `/tmp/wishlive-phase3-home.png` |
| P4-01 | Runtime | Implement AgentCard and BaseAgent lifecycle | REVIEW | P3 | unit and integration tests pass | Phase 4 PR |
| P4-02 | Registry | Implement register/search/heartbeat/list APIs | REVIEW | P4-01 | Registry API tests pass | Phase 4 PR |
| P4-03 | Registry | Seed 57+ agents with heartbeat events | REVIEW | P4-02 | online count >= 57 | Browser snapshot of `/api/agents/online`; Redis `agent.lifecycle` evidence |
| P5-01 | Dashboard | Build Live Dashboard primary screen | REVIEW | P4 | browser screenshot evidence | `/tmp/wishlive-phase5-dashboard.png` |
| P5-02 | Topology | Build React Flow topology with 57+ nodes | REVIEW | P5-01 | node count >= 57 in browser | `/tmp/wishlive-phase5-topology-mobile.png` |
| P5-03 | Dashboard | Add metrics, event stream, negotiation, blockchain panels | REVIEW | P5-01 | 20 events and latency < 2s | Browser snapshot shows 24 event rows; SSE curl emits 1s cadence |
| P6-01 | Wish | Implement Wish Pool and wish APIs | REVIEW | P5 | API and browser flow pass | `/api/wishes`, `/wish-pool`, Browser screenshot `/tmp/wishlive-phase6-wish-pool.png` |
| P6-02 | Demand | Implement Demand Pool threshold aggregation | REVIEW | P6-01 | 10 wishes create 1 demand | Browser shows `10/10 wishes`; `/api/wishes/demands` returns 1 `MATCHED` demand; Redis `demand.events` XLEN=2 |
| P6-03 | Matching | Implement Top 3 matching formula | REVIEW | P6-02 | formula unit tests pass | Browser shows musician Top 3 + venue Top 3; API returns 3/3 candidates; Redis `matching.events` XLEN=2; formula unit test passed |
| P7-01 | Negotiation | Implement A2A proposal/counter/accept/reject | REVIEW | P6 | Redis event chain visible | Backend test emits `a2a.proposal`, `a2a.counter_proposal`, `a2a.accept`, `deal.created`; Browser `/negotiation/demo` shows proposal/counter timeline; Redis `agent.task=3`, `negotiation.events=5` |
| P7-02 | Settlement | Implement ShowConfirm and settlement service | REVIEW | P7-01 | release blocked before confirmation | Backend test rejects unconfirmed escrow, then confirm emits `show.confirmed`, `escrow.created`, `ticket.minted`; Browser shows `SETTLED`, escrow id, ticket id; Redis `show.events=1`, `settlement.events=2` |
| P7-03 | Contracts | Implement AgentProfile, Escrow, TicketNFT | REVIEW | P7-02 | Hardhat tests pass | `hardhat test` reports 6 passing; `deploy:local` deployed AgentProfile, Escrow, TicketNFT on chain 31337 |
| P8-01 | A2A Data | Upgrade 57 seed AgentCards with A2A discovery fields, skills, manager ownership, prompts, reputation, and real musician/venue metadata | REVIEW | P7 | 57 cards have A2A fields; 15 musicians and 10 venues discoverable by manager | Backend registry tests passed |
| P8-02 | Discovery | Extend Registry as manager-backed A2A discovery server | REVIEW | P8-01 | `a2a.discovery.started`, `manager.search.performed`, `a2a.discovery.result` emitted; rock/shanghai/date returns Top 3/Top 3 | Backend workflow tests; Browser dashboard shows discovery events |
| P8-03 | Runtime | Add AI-first AgentRuntimeService with simulated fallback | REVIEW | P8-02 | key agents emit `agent.thought`, `agent.tool_call`, `agent.tool_result`, `agent.message`; fallback marked `simulated` when AI config is absent | Backend runtime tests passed; Redis history shows `agent.runtime=30` |
| P8-04 | Journey | Replace demo-button-first path with audience role -> AgentCard -> Wish Pool -> automatic negotiation | REVIEW | P8-03 | Browser from `/` to `/wish-pool` creates 10-agent cohort and opens `/negotiation/[id]` with agent-agent chat | Browser verified `DEAL_CREATED`, tool calls, A2A messages |
| P8-05 | Personal Monitor | Add `/my-agent` and richer Dashboard/Topology agent details | REVIEW | P8-03 | Dashboard/Topology show 57 nodes, runtime/discovery events, node details; My Agent shows card, inbox, reputation | Browser verified `/dashboard`, `/topology`, `/my-agent`; screenshot `/tmp/wishlive-phase8-dashboard.png` |
| P8-06 | Concierge | Implement global Concierge assistant on every page | DONE | P8-05 | answers workflow status from live events/sessions | Browser Concierge answered the live state: flow settled, no active negotiation, `ticket:1` minted, tx `0x1dac...0708fb`; `/api/concierge/chat` returned 200 and emitted `concierge.message` |
| P8-07 | Observability | Integrate AI SDK telemetry and Langfuse/OpenTelemetry status | DONE | P8-06 | trace metadata includes workflow_id/agent_id/conversation_id | Runtime and Concierge use AI SDK `generateText`/`streamText`; Redis history shows `agent.runtime=30`; runtime sessions include `workflow_id`, `agent_id`, `conversation_id`, `model`, `mode`, and Langfuse status |
| P8-08 | Chain Integration | Wire AgentProfile/Escrow/TicketNFT to Hardhat localnet | DONE | P8-07 | localnet writes return tx hashes and UI shows chain status | `eth_chainId=0x7a69`; `/api/contracts/status` returned chainId `31337` and AgentProfile/Escrow/TicketNFT addresses; Human Confirm created escrow `0x7d1b...b0fb`, released `0xaf06...b1f`, minted TicketNFT `0x1dac...08fb`; browser UI showed `SETTLED`, `escrow:*`, `ticket:1`, and contract events |
| P8-09 | Final Demo | Validate 5-minute end-to-end demo script | DONE | P8-08 | browser E2E passes with final script | Browser validated `/`, `/create-agent`, `/wish-pool`, `/negotiation/[id]`, `/dashboard`, `/topology`, `/my-agent`, and Concierge; API 10 wishes returned `negotiation:1246d5bb-4889-4077-a910-6443ef0e2ce0`; dashboard showed 57 online agents, 33 active tasks, 5 negotiation events, 6 on-chain tx; `pnpm lint/typecheck/test/build` passed |
