# Agent Card

基于 A2A AgentCard 规范，适配 WishLive 场景。

## 完整结构

```json
{
  "agent_id": "agent:musician:001",
  "did": "did:wishlive:0x...",
  "wallet": "0x...",
  "type": "musician",
  "skills": ["check_availability", "propose_offer", "accept_offer"],
  "tags": ["genre:rock", "city:shanghai"],
  "reputation": 85,
  "metadata": {
    "city": "shanghai",
    "genre": "rock",
    "capacity": 500,
    "availability": "weekends",
    "splitPreference": 25
  }
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | ✅ | Agent 唯一标识 |
| `did` | string | ✅ | DID 标识 |
| `wallet` | string | ✅ | 钱包地址 |
| `type` | string | ✅ | 类型：audience / musician / venue / manager / business |
| `skills` | string[] | ✅ | 技能 ID 列表 |
| `tags` | string[] | - | 可搜索标签，如 `genre:rock`, `city:shanghai` |
| `reputation` | number | - | 声誉分 0-100 |
| `metadata` | object | - | 领域特定属性 |

## Metadata

| Field | Type | Used by |
|-------|------|---------|
| `city` | string | Matching Agent, Registry search |
| `genre` | string | Matching Agent, Registry search |
| `capacity` | number | Venue agents, Matching Agent |
| `availability` | string | Musician agents |
| `splitPreference` | number | Negotiation Agent |

## 数据来源

Agent Card 存储在：
1. **Registry** — 最新的 agent_card_json
2. **PostgreSQL** — `agent_cards` 表持久化
3. **区块链** — AgentCard hash 上链存证
