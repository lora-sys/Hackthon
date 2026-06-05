# Runtime Rules

> 参考：OpenCode Runtime Philosophy — https://deepwiki.com/opencode-ai/opencode
> Vercel AI SDK — https://ai-sdk.dev/docs/agents

---

## 核心原则

```
WishLive Runtime = OpenCode Philosophy
                 + Vercel AI SDK
                 + WishLive Business Logic Only
```

## Do Not Build

| 不要做 | 原因 | 替代方案 |
|--------|------|---------|
| 自定义 LLM 循环 | AI SDK ToolLoopAgent 已实现 | `ToolLoopAgent` |
| 自定义工具框架 | AI SDK `tool()` 已提供 | `import { tool } from "ai"` |
| 自定义记忆系统 | OpenCode 模式 + AI SDK Custom Tool + Redis/PostgreSQL | `memoryTool({ action: "store", ... })` |
| 自定义会话管理 | OpenCode Session 模式 + AI SDK session | AI SDK session |
| 自定义流式协议 | SSE 标准协议 | `createStreamableValue()` |
| 自定义事件总线 | OpenCode Event 模式 + Redis Streams | Redis XADD/XREADGROUP |

## Must Use

| 必须用 | 版本/用法 |
|--------|---------|
| Vercel AI SDK | `ToolLoopAgent` + `generateText` + `streamText` |
| AI SDK Workflow Patterns | Sequential / Parallel / Routing |
| AI SDK Telemetry | `experimental_telemetry: { isEnabled: true }` |
| Redis Streams | `XADD` / `XREADGROUP` — 所有 Agent 通信 |
| SSE | 前后端流式通信 |
| MCP | 外部服务集成（Registry MCP / Settlement MCP） |

## Service Boundaries

| Service | 代码位置 | 依赖 |
|---------|---------|------|
| Registry | `backend/src/services/registry/` | PostgreSQL, Redis |
| Workflow | `backend/src/services/workflow/` | AI SDK Workflow Patterns |
| Negotiation | `backend/src/services/negotiation/` | Redis Streams |
| Settlement | `backend/src/services/settlement/` | Hardhat |
| Event | `backend/src/services/event/` | Redis Streams |
| Concierge | `backend/src/services/concierge/` | AI SDK, Redis |

## Data Flow Rules

```
User → Frontend → API (REST/SSE)
                      ↓
             Registry / Workflow / Negotiation / Settlement
                      ↓
            Redis Streams (Agent ↔ Agent)
                      ↓
            PostgreSQL / Blockchain
```

- 禁止直接访问数据库 — 必须通过 API 或事件总线
- 禁止直接调用智能合约 — 必须通过 Settlement Service
- 禁止绕过 Human Confirmation — 必须经过 ShowConfirm Agent
