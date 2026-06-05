# Backend Endpoints

> Claude Code 开发 API 时，先查此清单。禁止添加未在列的端点。

---

## Registry

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/registry/register` | 注册 Agent | AgentCard | `{ agentId, status }` |
| POST | `/api/registry/heartbeat` | 发送心跳 | `{ agentId }` | `{ status, timestamp }` |
| POST | `/api/registry/search` | 搜索 Agent | `{ genre?, city?, capacity?, type? }` | `AgentCard[]` |
| GET | `/api/registry/{agentId}` | 获取 Agent Card | — | AgentCard |
| GET | `/api/agents` | 列出全部 Agent | `{ status?, type? }` | `AgentCard[]` |
| GET | `/api/agents/online` | 在线 Agent 计数 | — | `{ count, byType }` |

---

## Workflow

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/workflows` | 创建流程 | `{ type, context }` | `{ workflowId, status }` |
| GET | `/api/workflows` | 流程列表 | `{ status? }` | `Workflow[]` |
| GET | `/api/workflows/{id}` | 流程详情 | — | Workflow |
| POST | `/api/workflows/{id}/interrupt` | 中断流程 | — | `{ status }` |
| POST | `/api/workflows/{id}/resume` | 恢复流程 | — | `{ status }` |

---

## Negotiation

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/negotiation` | 创建协商 | `{ demandId, musicianId, venueId }` | `{ negotiationId }` |
| GET | `/api/negotiation` | 协商列表 | `{ agentId?, status? }` | `Negotiation[]` |
| GET | `/api/negotiation/{id}` | 协商详情 | — | Negotiation |
| POST | `/api/negotiation/{id}/proposal` | 发送提案 | `{ from, to, terms }` | `{ proposalId }` |
| POST | `/api/negotiation/{id}/counter` | 反提案 | `{ proposalId, from, newTerms }` | `{ proposalId }` |
| POST | `/api/negotiation/{id}/accept` | 接受 | `{ proposalId, from }` | `{ status }` |
| POST | `/api/negotiation/{id}/reject` | 拒绝 | `{ proposalId, from, reason }` | `{ status }` |

---

## Settlement

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/settlement/escrow` | 创建托管 | `{ dealId, payees, shares }` | `{ escrowId, txHash }` |
| POST | `/api/settlement/release` | 释放资金 | `{ escrowId, signature }` | `{ txHash }` |
| POST | `/api/settlement/mint-ticket` | 铸造门票 | `{ dealId, to }` | `{ tokenId, txHash }` |
| GET | `/api/settlement/escrow/{id}` | 查询托管 | — | Escrow |

---

## Wishes

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/wishes` | 提交心愿 | `{ userId, artistName, genre, city, date }` | `{ wishId }` |
| GET | `/api/wishes` | 心愿列表 | `{ userId?, status? }` | `Wish[]` |
| POST | `/api/wishes/{id}/withdraw` | 撤回心愿 | — | `{ status }` |
| GET | `/api/wishes/demands` | 需求列表 | — | `Demand[]` |

---

## Events / SSE

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/api/events/stream` | SSE 事件流 | `text/event-stream` |
| GET | `/api/events/history` | 历史事件 | `Event[]` |

---

## Deals

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/deals` | 交易列表 | `{ status? }` | `Deal[]` |
| GET | `/api/deals/{id}` | 交易详情 | — | Deal |
| POST | `/api/deals/{id}/confirm` | 人工确认 | `{ signature }` | `{ status }` |
| POST | `/api/deals/{id}/reject` | 人工拒绝 | `{ reason }` | `{ status }` |
