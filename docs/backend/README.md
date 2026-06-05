# Backend Architecture

## Tech Stack

| 层 | 技术 | 用途 |
|----|------|------|
| 运行时 | Node.js 20+ | 服务端运行 |
| 框架 | Vercel AI SDK | ToolLoopAgent + Telemetry + Workflow Patterns |
| 事件总线 | Redis Streams | Agent 通信 / 事件广播 |
| 数据库 | PostgreSQL + Redis | 持久化 + 缓存 |
| 可观测性 | OpenTelemetry → Langfuse | Trace + Token / Cost 分析 |

## Services

### Registry Service (Port 3001)

Agent 注册、发现、心跳。

| 端点 | 说明 |
|------|------|
| `POST /registry/register` | 注册 Agent（携带 Agent Card） |
| `POST /registry/heartbeat` | Agent 心跳（30s 间隔） |
| `POST /registry/search` | 搜索 Agent（genre/city/capacity） |
| `GET /registry/{agentId}` | 获取 Agent Card |

### Workflow Service

业务流程编排，基于 AI SDK Workflow Patterns。

| 方法 | 说明 |
|------|------|
| `createWorkflow(type)` | 创建流程实例（Demand→Matching→Negotiation→Settlement） |
| `executeStep(workflowId, step)` | 执行流程步骤 |
| `interrupt(workflowId)` | 中断流程（等待人工确认） |
| `resume(workflowId)` | 恢复流程（人工确认后） |

### Negotiation Service

Agent 间协商管理。

| 方法 | 说明 |
|------|------|
| `createProposal(negotiationId, from, to, terms)` | 创建提案 |
| `counterProposal(proposalId, newTerms)` | 反提案 |
| `acceptProposal(proposalId)` | 接受提案 |
| `rejectProposal(proposalId, reason)` | 拒绝提案 |
| `createDeal(negotiationId)` | 生成交易 |

### Event Service

基于 Redis Streams 的事件发布/订阅。

| Stream | 事件 | 消费者 |
|--------|------|--------|
| `agent.lifecycle` | registered, online, heartbeat, offline, error | Registry |
| `wish.events` | created, withdrawn | Demand Pool Agent |
| `demand.events` | created, threshold_reached | Matching Agent |
| `negotiation.events` | started, proposal.sent, accepted, deal.created | Negotiation Agent |
| `settlement.events` | escrow.created, ticket.minted | Settlement Agent |

## Service Communication

```
Registry Service ──→ Redis Streams ──→ Workflow Service
                                           │
                                    Negotiation Service
                                           │
                                    Settlement Service
                                           │
                                    Event Service → Dashboard
```

## API Ports

| Service | Port |
|---------|------|
| Registry | 3001 |
| Settlement | 3003 |
| Concierge | 3004 |
| A2A | Redis Streams（非 HTTP） |
