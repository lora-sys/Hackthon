# WishLive Acceptance Matrix

Every phase must attach measurable evidence before it can be marked done.

| Phase | Required Result | Current Evidence | Status |
|---|---|---|---|
| Phase 1 - Infra | Docker stack has Postgres, Redis, Hardhat healthy | PR #1: compose config passed; 3 services healthy; Postgres accepting connections; Redis PONG; Hardhat `0x7a69`; bash syntax checks passed | REVIEW |
| Phase 2 - Specs | Specs cover 8 phases and make Dashboard/Topology the primary demo surface | This PR adds `README.md`, `00-roadmap.md`, `task-tracker.md`, and this matrix | IN_PROGRESS |
| Phase 3 - App Scaffold | lint, typecheck, test, build pass; browser homepage has no critical console errors | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` passed; browser opened `/` with no page errors; screenshot `/tmp/wishlive-phase3-home.png` | REVIEW |
| Phase 4 - Runtime And Registry | `/api/agents/online` returns `count >= 57`; Redis lifecycle events visible | `pnpm lint/typecheck/test/build` passed; `/api/agents/online` returned `count:57`; `/api/registry/search` returned venue candidates; `/api/registry/agent%3Amusician%3A001` returned a musician card; Redis `agent.lifecycle` contains `agent.registered` and `agent.heartbeat`; browser snapshot captured online count JSON | REVIEW |
| Phase 5 - Live Dashboard | Browser screenshot shows 57+ topology nodes; 20 events; SSE latency < 2s | `pnpm lint/typecheck/test/build` passed; Browser snapshot showed 57+ topology nodes, metrics, negotiation panel, 24 event rows, and blockchain status; screenshots `/tmp/wishlive-phase5-dashboard.png` and `/tmp/wishlive-phase5-topology-mobile.png`; `/api/events/stream` emitted 3 events in 4s with `<1s`/`1s` details | REVIEW |
| Phase 6 - Wish/Demand/Matching | Browser submits 10 wishes; one demand created; Top 3 musicians and venues returned | `pnpm lint/typecheck/test/build` passed; backend test submitted 10 wishes and created 1 matched demand; Browser `/wish-pool` shows `10/10 wishes`, `MATCHED`, musician Top 3, venue Top 3, and no new console errors after `2026-06-06T01:40:58.507Z`; screenshot `/tmp/wishlive-phase6-wish-pool.png`; `/api/wishes/demands` returned 1 demand with 3 musician and 3 venue candidates; Redis XLEN: `wish.events=20`, `demand.events=2`, `matching.events=2`; scoring formula test passed with zero drift | REVIEW |
| Phase 7 - Negotiation/Settlement | Full negotiation event chain; confirmation gates release; escrow and ticket txs created | `pnpm lint/test/build` passed; backend integration emits A2A proposal/counter/accept and deal events; unconfirmed escrow creation is blocked; Browser `/negotiation/demo` shows `SETTLED`, escrow id, ticket id, A2A event chain, and no new console errors after `2026-06-06T02:18:21.022Z`; screenshot `/tmp/wishlive-phase7-negotiation.png`; `/api/deals` returned 1 `SETTLED` deal; Redis XLEN: `agent.task=3`, `negotiation.events=5`, `show.events=1`, `settlement.events=2`; Hardhat tests 6 passing; `deploy:local` deployed AgentProfile `0x5fbdb2315678afecb367f032d93f642f64180aa3`, Escrow `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`, TicketNFT `0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0` on chain 31337 | REVIEW |
| Phase 8A - Agentic A2A Runtime | Seed data is real A2A AgentCard data; matching goes through manager discovery; key agents emit AI/tool/message events; browser journey opens agent-agent negotiation | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` passed; backend tests: 57 A2A cards, 15 musician + 10 venue manager discovery, Top 3/Top 3 matching, runtime simulated fallback; Browser verified `/`, `/create-agent`, `/wish-pool`, automatic `/negotiation/[id]`, `/dashboard`, `/topology`, `/my-agent`; Redis history includes `agent.runtime=30`, `a2a.discovery=12`; visible screenshot fallback `/tmp/wishlive-phase8-dashboard.png`; in-app Browser screenshot API timed out, so macOS screencapture was used after Browser validation | REVIEW |
| Phase 8B - Concierge/Observability | Langfuse trace searchable by `workflow_id`; Concierge explains workflow state; final 5-minute E2E demo passes | Pending | TODO |

## Evidence Rules

- Command outputs should be summarized in the PR body.
- Browser screenshots should use absolute paths in PR notes or final reports.
- Redis event evidence should include stream name, event type, and count.
- Blockchain evidence should include RPC result, tx hash, or Hardhat test output.
- Any failed gate must keep the phase status below `DONE`.
