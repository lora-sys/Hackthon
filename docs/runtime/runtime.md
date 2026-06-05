# Runtime Architecture

> 参考：OpenCode [Runtime](https://deepwiki.com/opencode-ai/opencode) · Vercel AI SDK [Agents](https://ai-sdk.dev/docs/agents) · [Workflows](https://ai-sdk.dev/docs/agents/workflows)

---

## 核心公式

```
WishLive Runtime = OpenCode 架构模式      ← Card / Session / Tools / Memory / Events 结构
                 + Vercel AI SDK 实现     ← ToolLoopAgent / tool() / streamText / Telemetry
                 + WishLive 业务逻辑      ← 只写 Demand / Matching / Negotiation / Settlement
```

不要自建 Runtime 基础设施。架构模式抄 OpenCode 的，工具/流式/可观测用 Vercel AI SDK 的，只写业务层。

---

## 总览

```
Agent ←→ Agent : Redis Streams
Frontend ←→ Runtime : SSE
External → Runtime : MCP Tools
```

---

## Agent Manager [OpenCode 模式]

负责 Agent 实例的生命周期管理。OpenCode 的 Agent 管理模式。

| 方法 | 说明 |
|------|------|
| `spawn(card)` | 根据 AgentCard 实例化 Agent |
| `register(id)` | 注册到 Registry |
| `heartbeat(id)` | 发送心跳 |
| `kill(id)` | 销毁 Agent 实例 |
| `list()` | 列出所有活跃 Agent |

---

## Session Layer [OpenCode 模式 / Vercel AI SDK 实现]

OpenCode 的 Session 概念，每个 Agent 一个会话上下文。
底层使用 AI SDK 的 session 管理。

```
Session
├── id              — 会话 ID (UUID)
├── agentId         — 所属 Agent
├── conversationId  — A2A 协商 ID
├── context         — 当前上下文 (prompt + memory)
└── ttl             — 过期时间 (Redis TTL)
```

---

## Tool Layer [OpenCode 概念 / Vercel AI SDK 实现]

OpenCode 定义了 Tool 作为 Agent 的能力单元。
WishLive 使用 Vercel AI SDK 的 `tool()` 来定义和执行。

```typescript
const checkAvailability = tool({
  description: "检查音乐人档期",
  parameters: z.object({ date: z.string() }),
  execute: async ({ date }) => {
    // 执行业务逻辑
    return { available: true, slots: ["18:00", "20:00"] };
  },
});
```

---

## Memory Layer [OpenCode 模式 / AI SDK Custom Tool 实现]

OpenCode 的 Memory 模式：Agent 可以 store / recall / search / forget。
WishLive 使用 AI SDK 的 Custom Tool 模式 + Redis/PostgreSQL 存储。

| 操作 | 实现 |
|------|------|
| `store(key, value)` | Redis SET / AI SDK tool |
| `recall(key)` | Redis GET / AI SDK tool |
| `search(query)` | PostgreSQL 全文检索 / AI SDK tool |
| `forget(key)` | Redis DEL / AI SDK tool |

---

## Event Layer [OpenCode 模式 / Redis Streams 实现]

OpenCode 的 Event 模式：Agent 通过事件总线通信。
WishLive 使用 Redis Streams 作为传输层。

```
Stream: agent.task         → 点对点 A2A 消息
Stream: agent.lifecycle    → Agent 生命周期
Stream: wish.events        → 心愿事件
Stream: demand.events      → 需求事件
Stream: negotiation.events → 协商事件
Stream: settlement.events  → 结算事件
Stream: concierge.events   → 用户通知
```

---

## MCP Layer [OpenCode 模式]

OpenCode 使用 MCP 集成外部服务。WishLive 同样使用 MCP。

| MCP Server | 用途 |
|-----------|------|
| Registry MCP | Agent 注册/搜索/心跳 |
| Settlement MCP | 区块链交易 |
| Concierge MCP | 用户查询/引导 |

---

## Observability Layer [Vercel AI SDK 实现]

AI SDK 内置 Telemetry，通过 OpenTelemetry 导出到 Langfuse。

```
AI SDK Telemetry → OpenTelemetry → Langfuse
Redis Streams    → Dashboard
```

---

## 一句话总结

| 层 | 架构来自 | 实现来自 | OpenCode 对应 |
|----|---------|---------|-------------|
| Agent Manager | OpenCode | 自建（业务逻辑） | `internal/app` |
| Session | OpenCode | Vercel AI SDK + PostgreSQL | `internal/session` |
| Tool | OpenCode | Vercel AI SDK `tool()` | `internal/llm/tools` |
| Memory | OpenCode | AI SDK Custom Tool | (OpenCode 内建在 agent) |
| Event | OpenCode | Redis Streams | `internal/pubsub` |
| MCP | OpenCode | MCP SDK | `internal/lsp` |
| Observability | — | Vercel AI SDK Telemetry + Langfuse | `internal/logging` |

> 完整映射表 → [docs/opencode/opencode-mapping.md](docs/opencode/opencode-mapping.md)
