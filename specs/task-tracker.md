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
| P6-01 | Wish | Implement Wish Pool and wish APIs | TODO | P5 | API and browser flow pass | Pending |
| P6-02 | Demand | Implement Demand Pool threshold aggregation | TODO | P6-01 | 10 wishes create 1 demand | Pending |
| P6-03 | Matching | Implement Top 3 matching formula | TODO | P6-02 | formula unit tests pass | Pending |
| P7-01 | Negotiation | Implement A2A proposal/counter/accept/reject | TODO | P6 | Redis event chain visible | Pending |
| P7-02 | Settlement | Implement ShowConfirm and settlement service | TODO | P7-01 | release blocked before confirmation | Pending |
| P7-03 | Contracts | Implement AgentProfile, Escrow, TicketNFT | TODO | P7-02 | Hardhat tests pass | Pending |
| P8-01 | Concierge | Implement global Concierge assistant | TODO | P7 | answers workflow status | Pending |
| P8-02 | Observability | Integrate AI SDK telemetry and Langfuse | TODO | P8-01 | trace searchable by workflow_id | Pending |
| P8-03 | Demo | Validate 5-minute end-to-end demo | TODO | P8-02 | browser E2E passes | Pending |
