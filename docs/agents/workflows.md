# Agent Workflows

> WishLive Runtime 主流程。Claude Code 生成 Agent 交互逻辑时，先读此文件。

---

## Workflow #1 — Wish → Show

```
Audience (submit_wish)
    │ wish.created
    ▼
WishMaker (process_wish → aggregate_wishes)
    │ wish.aggregated
    ▼
DemandPool (check_threshold → create_demand)
    │ demand.created
    ▼
Organizer (create_event)
    │ event.ready
    ▼
Matching Engine (find_musicians → find_venues → rank_candidates)
    │ matching.completed (Top 3)
    ▼
Negotiation Agent (create_negotiation)
    │
    ├──→ Musician Agent (check_availability → propose_offer)
    │        │ proposal.sent
    │        ▼
    │     Venue Agent (check_capacity → quote_price → counter_offer 可选)
    │        │ proposal.accepted / proposal.rejected
    │        ▼
    │     Negotiation Agent (detect: both accepted? → create_deal)
    │
    │ deal.created
    ▼
ShowConfirm Agent (notify_user → wait human)
    │ show.confirmed / show.rejected
    ▼
Settlement Agent (create_escrow → release_funds → mint_ticket)
    │ escrow.created → ticket.minted
    ▼
✅ Show Complete
```

---

## Concurrent Negotiation Detail

```
Matching Engine
    │
    ├── Track A: MusicianA ↔ VenueB        ← 深度协商（多轮提案/反提案）
    ├── Track B: MusicianC ↔ VenueA        ← 快速协商（maxSteps=2 → accept）
    └── Track C: MusicianE ↔ VenueD        ← 快速协商
             │
      Negotiation Agent (管理所有 Track)
             │
      任一 Track 双方 ACCEPT → deal.created
```

---

## Interrupt Points

| Point | 原因 | 恢复条件 |
|-------|------|---------|
| After deal.created | 等待用户确认 | 用户点击 Confirm / Reject |
| After escrow.created | 等待链上确认 | 交易确认回调 |
| Negotiation timeout | 5 分钟无响应 | Agent 重试 / 自动 REJECT |

---

## Error Recovery

```
matching.completed (empty)
    → Matching Engine retry with looser constraints
    → 仍失败 → FAILED event → Organizer cancels

negotiation timeout
    → Negotiation Agent emits rejection
    → Matching Engine picks next candidate
    → 无候选 → FAILED event

escrow creation failed
    → Settlement Agent retry (3x)
    → 仍失败 → FAILED event → refund
```

---

## Failed Workflow Cleanup

```
Workflow FAILED
    ↓
Organizer Agent: cancel_event
    ↓
Settlement Agent: refund deposits (if any)
    ↓
Notification to all participants
```
