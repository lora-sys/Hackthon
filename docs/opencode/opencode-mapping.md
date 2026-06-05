# OpenCode → WishLive Mapping

> 此文件定义 OpenCode 内部包到 WishLive 组件的直接映射。
> Claude Code 开发任何功能时，先查此表：找到 OpenCode 的对应模块，抄它的模式，再用 Vercel AI SDK 实现。

---

## 总映射表

| OpenCode (Go) | WishLive (TypeScript) | 关系 | 参考 |
|---------------|----------------------|------|------|
| **`internal/app`** | Agent Runtime (Vercel AI SDK) | 模式引用 | [opencode/1.2-architecture-overview](https://deepwiki.com/opencode-ai/opencode/1.2-architecture-overview) |
| **`internal/llm/agent`** | Vercel AI SDK `ToolLoopAgent` | ✅ 直接替代 | [AI SDK Agent](https://ai-sdk.dev/docs/agents) |
| **`internal/llm/provider`** | Vercel AI SDK providers | ✅ 直接替代 | [AI SDK Providers](https://ai-sdk.dev/providers) |
| **`internal/llm/tools`** | Vercel AI SDK `tool()` | ✅ 直接替代 | [AI SDK Tools](https://ai-sdk.dev/docs/tools) |
| **`internal/llm/prompt`** | AI SDK system prompt | 抄模式，换实现 | [opencode/3.4-prompt-generation](https://deepwiki.com/opencode-ai/opencode/3.4-prompt-generation) |
| **`internal/llm/models`** | AI SDK model definitions | 抄模式，换实现 | [AI SDK Models](https://ai-sdk.dev/providers) |
| **`internal/message`** | `docs/protocols/message.md` | 抄结构 | [opencode/5.1-chat-components](https://deepwiki.com/opencode-ai/opencode/5.1-chat-components) |
| **`internal/session` (in db/)** | AI SDK session + PostgreSQL | 抄结构，换存储 | [opencode/5.2-session-management](https://deepwiki.com/opencode-ai/opencode/5.2-session-management) |
| **`internal/db` (SQLite/SQLC)** | PostgreSQL + Drizzle/Prisma | 抄模式，换存储 | OpenCode `internal/db/` |
| **`internal/permission`** | Permission system (ShowConfirm) | 抄模式 | [opencode/7-security-and-permissions](https://deepwiki.com/opencode-ai/opencode/7-security-and-permissions) |
| **`internal/lsp`** | MCP Tools | 抄模式（LSP↔MCP 都是协议集成） | [opencode/8-language-server-protocol](https://deepwiki.com/opencode-ai/opencode/8-language-server-protocol) |
| **`internal/pubsub`** | Redis Streams | 抄模式，换实现 | OpenCode `internal/pubsub/` |
| **`internal/tui`** (Bubble Tea) | Next.js Web UI (AI Elements) | 抄模式，换渲染 | [opencode/4-terminal-ui-system](https://deepwiki.com/opencode-ai/opencode/4-terminal-ui-system) |
| **`internal/logging`** | OpenTelemetry → Langfuse | ✅ 直接替代 | [opencode/10-dependencies](https://deepwiki.com/opencode-ai/opencode/10-dependencies-and-utilities) |
| **`internal/history`** | Session history in DB | 抄模式 | OpenCode `internal/history/` |
| **`internal/config`** | Environment config (`.env`) | 抄模式 | OpenCode `internal/config/` |
| **`internal/diff`** | UI diff components | 抄模式 | OpenCode `internal/diff/` |

---

## 各模块详细映射

### 1. Agent 核心 — `internal/llm/agent` → Vercel AI SDK ToolLoopAgent

```
OpenCode Agent (Go)                    WishLive (TypeScript)
────────────────────                   ────────────────────
agent.Run(ctx, sessionID)          →   generateText({ model, tools, system })
agent.processEvent()               →   ToolLoopAgent 自动处理
  EventContent                     →   textPart
  EventToolUseStart                →   toolCall
  EventToolUseStop                 →   toolResult
  EventComplete                    →   finishReason
agent.TrackUsage()                 →   experimental_telemetry
agent.messages.Update()            →   appendResponseMessages()
```

📎 参考：https://ai-sdk.dev/docs/agents

---

### 2. 消息系统 — `internal/message` → `docs/protocols/message.md`

```
OpenCode Message (Go)                  WishLive Message (JSON)
────────────────────                   ──────────────────────
message.Message                    →   MessageEnvelope
  .Role                            →   type (TASK/EVENT/PROPOSAL/...)
  .Parts                           →   payload
    TextContent                    →   payload.text
    ImageURLContent                →   payload.image
    ToolCall                       →   payload.toolCall
    ToolResult                     →   payload.toolResult
    Finish                         →   payload.finish
message.CreateMessageParams       →   (消息构造参数)
message.Service                    →   Redis Streams XADD
```

📎 参考：https://deepwiki.com/opencode-ai/opencode/5.1-chat-components

---

### 3. 会话管理 — `internal/session` → AI SDK Session + PostgreSQL

```
OpenCode Session (Go)                 WishLive (TypeScript)
─────────────────────                ──────────────────────
session.Session                    →   { id, agentId, messages, ... }
  .ID                              →   workflowId (UUID)
  .Messages                        →   messages[]
  .CreatedAt / .UpdatedAt          →   created_at / updated_at
  .Title                           →   (自动标题生成)
  .TokenCount / .Cost              →   AI SDK telemetry
session.Service                    →   CRUD via PostgreSQL
  .Create()                        →   INSERT
  .Get()                           →   SELECT
  .Update()                        →   UPDATE
  .Delete()                        →   DELETE
Auto-compaction (summarization)    →   (暂不需要，hackathon 范围外)
Busy state                         →   agent status: BUSY
```

📎 参考：https://deepwiki.com/opencode-ai/opencode/5.2-session-management

---

### 4. 工具系统 — `internal/llm/tools` → Vercel AI SDK `tool()`

```
OpenCode Tools (Go)                    WishLive (TypeScript)
───────────────────                   ──────────────────────
BaseTool Interface                 →   tool({...})
  .Info (ToolInfo)                 →   { description, parameters }
  .Execute(ctx, ToolCall)          →   execute: async ({...}) => {...}
ToolCall / ToolResponse            →   AI SDK toolCall / toolResult
Permission gating                  →   ShowConfirm Agent
Read-before-write safety           →   (Event Sourcing 模式)
Modification time validation       →   (optimistic concurrency)
Diff generation                    →   (前端 diff 展示)
LSP integration                    →   MCP Tools (Registry MCP)
Error categories:
  Parameter errors                 →   z.object().parse() 失败
  Permission errors                →   ShowConfirm 拒绝
  Execution errors                 →   try/catch → 错误事件
```

📎 参考：https://deepwiki.com/opencode-ai/opencode/6-tool-system

---

### 5. 权限系统 — `internal/permission` → ShowConfirm Agent + Permission System

```
OpenCode Permission (Go)              WishLive (TypeScript)
─────────────────────                ──────────────────────
CreatePermissionRequest            →   { action, agentId, details }
Permission approval modes          →   Human Confirmation
  Allow (一次)                     →   用户点击 Confirm
  AllowForSession (整个会话)       →   "不再询问" 选项
  Deny                             →   用户点击 Reject
Permission gating on tools         →   Settlement 前必须人工确认
```

📎 参考：https://deepwiki.com/opencode-ai/opencode/7-security-and-permissions

---

### 6. 协议集成 — `internal/lsp` → MCP Tools

```
OpenCode LSP (Go)                      WishLive MCP (TypeScript)
───────────────                      ──────────────────────
LSP Client 管理                      MCP Client 管理
  .Start() / .Stop()                →   MCP transport 启动/停止
  .GetDiagnostics()                 →   MCP tool 调用
  File Watcher                      →   (不适用 Web 场景)
Go LSP → 代码诊断                   Registry MCP → Agent 搜索
TypeScript LSP → 代码诊断            Settlement MCP → 链上交易
                                    Concierge MCP → 用户查询
```

📎 参考：https://deepwiki.com/opencode-ai/opencode/8-language-server-protocol

---

### 7. PubSub 事件系统 — `internal/pubsub` → Redis Streams

```
OpenCode PubSub (Go)                   WishLive Redis Streams (TypeScript)
──────────────────                   ────────────────────────────────
pubsub.New[T]()                     →   Redis XADD / XREADGROUP
pubsub.Publish(event)               →   XADD stream * field value
pubsub.Subscribe()                  →   XREADGROUP GROUP group consumer
topic = "session.updated"           →   stream = "agent.lifecycle"
topic = "message.created"           →   stream = "wish.events"
```

---

### 8. 存储层 — `internal/db` (SQLite + SQLC) → PostgreSQL + Redis

```
OpenCode DB (Go)                       WishLive DB (TypeScript)
───────────────                      ──────────────────────
SQLite (嵌入式)                       PostgreSQL + Redis
SQLC (类型安全 SQL 生成)             Drizzle ORM / Prisma
Queries:
  sessions                          →   sessions 表
  messages                          →   events 表
  conversations                     →   conversations 表
  files                             →   (不适用)
```

---

## 一句话总结

| 你想做的事 | 去 OpenCode 看哪个模块 | 然后怎么做 |
|-----------|----------------------|-----------|
| 建 Agent | `internal/llm/agent` | 直接用 Vercel AI SDK `ToolLoopAgent` |
| 定义工具 | `internal/llm/tools` | 直接用 Vercel AI SDK `tool()` |
| 管理消息 | `internal/message` | 抄 Message 结构 → `docs/protocols/message.md` |
| 会话 | `internal/session` | 抄 Session 结构 → PostgreSQL 实现 |
| 权限 | `internal/permission` | 抄审批模式 → ShowConfirm Agent |
| 提示词 | `internal/llm/prompt` | 抄 prompt 生成模式 → AI SDK system |
| 事件通信 | `internal/pubsub` | Redis Streams 代替 |
| 外部集成 | `internal/lsp` | MCP 代替 LSP |
| 日志 | `internal/logging` | OpenTelemetry + Langfuse |
