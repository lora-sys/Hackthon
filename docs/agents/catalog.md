# Agent Catalog

> Claude Code 生成 Agent 时，先查此清单。

---

## 个体层（~35）

### Audience Agent

| 属性 | 值 |
|------|-----|
| **type** | individual |
| **skills** | `submit_wish`, `withdraw_wish`, `confirm_show` |
| **listens** | —（用户触发） |
| **emits** | `wish.created`, `wish.withdrawn` |
| **count** | 10 |

### Musician Agent

| 属性 | 值 |
|------|-----|
| **type** | individual |
| **skills** | `check_availability`, `propose_offer`, `counter_offer`, `accept_offer`, `reject_offer` |
| **listens** | `negotiation.started`, `proposal.sent` |
| **emits** | `proposal.sent`, `counterproposal.sent`, `proposal.accepted`, `proposal.rejected` |
| **tags** | genre: rock/pop/jazz, city: shanghai/beijing/shenzhen |
| **count** | 15 |

### Venue Agent

| 属性 | 值 |
|------|-----|
| **type** | individual |
| **skills** | `check_capacity`, `quote_price`, `counter_offer`, `accept_offer`, `reject_offer` |
| **listens** | `negotiation.started`, `proposal.sent` |
| **emits** | `proposal.sent`, `counterproposal.sent`, `proposal.accepted`, `proposal.rejected` |
| **tags** | city: shanghai/beijing/shenzhen, capacity: 200/500/1000 |
| **count** | 10 |

---

## 管理层（3）

### Musician Manager

| 属性 | 值 |
|------|-----|
| **type** | manager |
| **skills** | `manage_musicians`, `sync_musician_status` |
| **listens** | `agent.registered`, `agent.offline` |
| **emits** | `musician.synced` |

### Venue Manager

| 属性 | 值 |
|------|-----|
| **type** | manager |
| **skills** | `manage_venues`, `sync_venue_status` |
| **listens** | `agent.registered`, `agent.offline` |
| **emits** | `venue.synced` |

### Organizer Agent

| 属性 | 值 |
|------|-----|
| **type** | manager |
| **skills** | `create_event`, `cancel_event`, `notify_participants` |
| **listens** | `demand.created`, `human_cancelled` |
| **emits** | `event.ready`, `event.cancelled` |

---

## 核心业务层（9）

### Onboarding Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `guide_wallet_connect`, `guide_agent_creation`, `complete_onboarding` |
| **listens** | `user.registered` |
| **emits** | `onboarding.completed`, `onboarding.failed` |

### Concierge Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `explain_status`, `search_musician_info`, `explain_failure`, `suggest_next_step` |
| **listens** | all events |
| **emits** | 自然语言回复 |

### WishMaker Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `process_wish`, `aggregate_wishes`, `publish_wish_event` |
| **listens** | `wish.created` |
| **emits** | `wish.aggregated` |

### Demand Pool Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `create_demand`, `check_threshold`, `merge_demands` |
| **listens** | `wish.aggregated` |
| **emits** | `demand.created` |

### Matching Engine Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `find_musicians`, `find_venues`, `rank_candidates` |
| **listens** | `demand.created` |
| **emits** | `matching.completed` |
| **scoring** | Genre 40% + Location 30% + Availability 20% + Reputation 10% |

### Negotiation Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `create_negotiation`, `route_proposal`, `detect_timeout` |
| **listens** | `matching.completed` |
| **emits** | `proposal.sent`, `proposal.accepted`, `proposal.rejected`, `deal.created` |

### Settlement Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `create_escrow`, `release_funds`, `mint_ticket` |
| **listens** | `deal.created` |
| **emits** | `escrow.created`, `ticket.minted` |

### ShowConfirm Agent

| 属性 | 值 |
|------|-----|
| **type** | business |
| **skills** | `notify_user`, `confirm_show`, `trigger_settlement` |
| **listens** | `deal.created` |
| **emits** | `show.confirmed`, `show.rejected` |
