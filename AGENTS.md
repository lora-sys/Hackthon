# AGENTS.md

# Agent Topology

WishLive consists of the following agent categories.

---

# 个体层 — 用户 Agent

## Audience Agent

Responsibilities

* Submit wishes
* Track progress
* Confirm participation

Inputs

* User actions

Outputs

* wish.created

Skills

* submit_wish
* withdraw_wish
* confirm_show

Events

* wish.created
* wish.withdrawn

---

## Musician Agent

Responsibilities

* Represent musician interests
* Check availability
* Negotiate terms

Inputs

* proposal (from Negotiation Agent)

Outputs

* counter_proposal
* proposal.accepted
* proposal.rejected

Skills

* check_availability
* propose_offer
* counter_offer
* accept_offer
* reject_offer

Events

* negotiation.started
* proposal.sent
* counterproposal.sent
* proposal.accepted
* proposal.rejected

---

## Venue Agent

Responsibilities

* Represent venue interests
* Quote venue pricing
* Negotiate revenue share

Inputs

* proposal (from Negotiation Agent)

Outputs

* counter_proposal
* proposal.accepted

Skills

* check_capacity
* quote_price
* counter_offer
* accept_offer
* reject_offer

Events

* negotiation.started
* proposal.sent
* counterproposal.sent
* proposal.accepted
* proposal.rejected

---

# 管理层 — 管理 Agent

## Musician Manager

Responsibilities

* Manage musician agent registrations
* Track musician availability status
* Sync musician data to Registry

Inputs

* agent.registered
* agent.offline

Outputs

* musician.synced

Skills

* manage_musicians
* sync_musician_status

Events

* musician.status_changed

---

## Venue Manager

Responsibilities

* Manage venue agent registrations
* Track venue capacity and status
* Sync venue data to Registry

Inputs

* agent.registered
* agent.offline

Outputs

* venue.synced

Skills

* manage_venues
* sync_venue_status

Events

* venue.status_changed

---

## Organizer Agent

Responsibilities

* Entry point for event creation
* Coordinate between demand and matching
* Cancel events on failure

Inputs

* demand.created
* human_cancelled

Outputs

* event.ready

Skills

* create_event
* cancel_event
* notify_participants

Events

* event.ready
* event.cancelled

---

# 核心业务层 — 业务 Agent

## Onboarding Agent

Responsibilities

* Guide first-time users
* Connect wallet → create agent → complete onboarding
* Show tutorial steps

Inputs

* user.registered

Outputs

* onboarding.completed

Skills

* guide_wallet_connect
* guide_agent_creation
* complete_onboarding

Events

* onboarding.completed
* onboarding.failed

---

## Concierge Agent

Responsibilities

* Floating AI assistant on every page
* Explain system status using live data
* Answer user questions (musician info, event status, etc.)
* Suggest next step

Inputs

* All events (for status context)
* User queries (natural language)

Outputs

* Human-readable explanations

Skills

* explain_status
* search_musician_info
* explain_failure
* suggest_next_step

---

## WishMaker Agent

Responsibilities

* Process wish submissions
* Aggregate wishes by genre/city/date
* Publish wish events

Inputs

* wish.created (from Audience Agent)

Outputs

* wish.aggregated

Skills

* process_wish
* aggregate_wishes
* publish_wish_event

Events

* wish.aggregated

---

## Demand Pool Agent

Responsibilities

* Listen for aggregated wishes
* Detect demand threshold (MIN_THRESHOLD=10)
* Create demand cohorts

Inputs

* wish.aggregated

Outputs

* demand.created

Skills

* create_demand
* check_threshold
* merge_demands

Events

* demand.created
* demand.threshold_reached

---

## Matching Engine Agent

Responsibilities

* Search Registry for musicians and venues
* Score candidates using formula (Genre 40% + Location 30% + Availability 20% + Reputation 10%)
* Return Top 3 candidates

Inputs

* demand.created

Outputs

* matching.completed

Skills

* find_musicians
* find_venues
* rank_candidates

Events

* matching.started
* matching.completed

---

## Negotiation Agent

Responsibilities

* Create and manage negotiation sessions
* Route proposals between musician and venue agents
* Detect acceptance, rejection, or timeout

Inputs

* matching.completed

Outputs

* deal.created

Skills

* create_negotiation
* route_proposal
* detect_timeout

Events

* negotiation.started
* proposal.sent
* counterproposal.sent
* proposal.accepted
* proposal.rejected
* deal.created

---

## Settlement Agent

Responsibilities

* Create escrow contract
* Release funds on human confirmation
* Mint ticket NFT

Inputs

* deal.created

Outputs

* escrow.created

Skills

* create_escrow
* release_funds
* mint_ticket

Events

* escrow.created
* ticket.minted

---

## ShowConfirm Agent

Responsibilities

* Notify user of deal terms
* Wait for human confirmation
* Trigger escrow release on confirmation

Inputs

* deal.created

Outputs

* show.confirmed

Skills

* notify_user
* confirm_show
* trigger_settlement

Events

* show.confirmed
* show.rejected

---

# Agent Lifecycle

```
                ┌────────────────────────────┐
                │                            ↓
CREATED → REGISTERED → ONLINE → BUSY → WAITING_CONFIRMATION → COMPLETED
                ↑         ↑       │                        ↓
                │         └── ERROR ←───────────────────────┘
                └─────────────┘
                              ↓
                         OFFLINE
```

States:
- CREATED: Agent 实例化完成
- REGISTERED: 已注册到 Registry
- ONLINE: 有心跳，可被搜索
- BUSY: 正在执行任务
- WAITING_CONFIRMATION: 等待人工确认
- COMPLETED: 任务完成
- OFFLINE: 离线
- ERROR: 错误（任何状态都可能进入，从 ERROR 可重试回 REGISTERED）

---

# Agent Communication

Agents communicate using:

* A2A Messages — direct agent-to-agent messaging
* Redis Streams — event broadcasting (wish.events, demand.events, etc.)
* Registry Discovery — search and lookup agent cards

No direct database coupling between agents.

---

# Runtime Reference

Before implementing any agent, read:
https://deepwiki.com/opencode-ai/opencode

WishLive 的 Agent 结构直接抄 OpenCode 的架构模式，用 Vercel AI SDK 的工具实现。

## Agent Pattern [OpenCode 架构模式]

```
Agent
├── Card       — AgentCard (A2A 规范: name, description, skills, tags, wallet)
├── Session    — 会话管理 (AI SDK session)    ← OpenCode 模式
├── Tools      — AI SDK tool() 定义          ← OpenCode 概念 + Vercel 实现
├── Memory     — AI SDK Custom Tool          ← OpenCode 模式 + Vercel 实现
└── Events     — Redis Streams 发布/订阅     ← OpenCode 模式 + Redis 实现
```

> Card → Session → Tools → Memory → Events 这个结构是 OpenCode 定义的。WishLive 不做任何改造，直接用。
>
> 完整映射 → [docs/opencode/opencode-mapping.md](docs/opencode/opencode-mapping.md)

## Communication

```
Agent ←→ Agent  : Redis Streams (点对点 agent.task + 广播 wish.events 等)
Frontend ←→ Runtime : SSE (服务端推送事件到前端)
External Integration  : MCP Tools (标准协议扩展)
```
