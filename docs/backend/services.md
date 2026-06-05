# Backend Services

---

## Registry Service

**Port**: 3001

**Responsibility**:
- Agent 注册
- Agent 发现/搜索（按 genre / city / capacity）
- 心跳检测（30s 间隔，60s 超时 OFFLINE）
- Agent Card 存储与索引

**Endpoints**:
- `POST /registry/register`
- `POST /registry/heartbeat`
- `POST /registry/search`
- `GET /registry/{agentId}`

---

## Workflow Service

**Responsibility**:
- 业务流程编排（Demand → Matching → Negotiation → Settlement）
- Workflow 实例生命周期管理
- 中断（等待人工确认）/ 恢复

**Methods**:
- `createWorkflow(type, context)` — 创建流程
- `executeStep(workflowId, step)` — 执行步骤
- `interrupt(workflowId)` — 中断（Human-in-the-loop）
- `resume(workflowId)` — 恢复
- `getStatus(workflowId)` — 查询状态

**Implementation**: AI SDK Workflow Patterns

---

## Negotiation Service

**Responsibility**:
- 提案/反提案路由
- 协商会话管理
- 超时检测
- Deal 生成

**Methods**:
- `createNegotiation(demandId, musicianId, venueId)` — 创建协商
- `sendProposal(negotiationId, from, to, terms)` — 发送提案
- `counterProposal(negotiationId, proposalId, newTerms)` — 反提案
- `acceptProposal(proposalId)` — 接受
- `rejectProposal(proposalId, reason)` — 拒绝
- `createDeal(negotiationId)` — 生成交易

**Timeout**: 5 分钟无响应 → 自动拒绝

---

## Settlement Service

**Port**: 3003

**Responsibility**:
- Escrow 合约交互
- 资金释放（人工确认后）
- Ticket NFT 铸造

**Endpoints**:
- `POST /settlement/escrow` — 创建托管
- `POST /settlement/release` — 释放资金
- `POST /settlement/mint-ticket` — 铸造门票

---

## Event Service

**Responsibility**:
- Redis Streams 事件发布/订阅
- SSE 推送到前端 Dashboard

**Streams**: 见 `docs/protocols/events.md`

**Endpoints**:
- `GET /api/events/stream` — SSE 事件流

---

## Concierge Service

**Port**: 3004

**Responsibility**:
- AI 助手（自然语言问答）
- 系统状态查询
- 用户引导建议

**Implementation**: AI SDK `streamText` + SSE
