# WishLive Acceptance Matrix

Every phase must attach measurable evidence before it can be marked done.

| Phase | Required Result | Current Evidence | Status |
|---|---|---|---|
| Phase 1 - Infra | Docker stack has Postgres, Redis, Hardhat healthy | PR #1: compose config passed; 3 services healthy; Postgres accepting connections; Redis PONG; Hardhat `0x7a69`; bash syntax checks passed | REVIEW |
| Phase 2 - Specs | Specs cover 8 phases and make Dashboard/Topology the primary demo surface | This PR adds `README.md`, `00-roadmap.md`, `task-tracker.md`, and this matrix | IN_PROGRESS |
| Phase 3 - App Scaffold | lint, typecheck, test, build pass; browser homepage has no critical console errors | Pending | TODO |
| Phase 4 - Runtime And Registry | `/api/agents/online` returns `count >= 57`; Redis lifecycle events visible | Pending | TODO |
| Phase 5 - Live Dashboard | Browser screenshot shows 57+ topology nodes; 20 events; SSE latency < 2s | Pending | TODO |
| Phase 6 - Wish/Demand/Matching | Browser submits 10 wishes; one demand created; Top 3 musicians and venues returned | Pending | TODO |
| Phase 7 - Negotiation/Settlement | Full negotiation event chain; confirmation gates release; escrow and ticket txs created | Pending | TODO |
| Phase 8 - Concierge/Observability | Langfuse trace searchable by `workflow_id`; Concierge explains workflow state; E2E demo passes | Pending | TODO |

## Evidence Rules

- Command outputs should be summarized in the PR body.
- Browser screenshots should use absolute paths in PR notes or final reports.
- Redis event evidence should include stream name, event type, and count.
- Blockchain evidence should include RPC result, tx hash, or Hardhat test output.
- Any failed gate must keep the phase status below `DONE`.

