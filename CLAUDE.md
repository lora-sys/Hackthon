# WishLive

Agent Native Marketplace for Live Music Events

Audience → Demand Discovery → Matching → Negotiation → Human Confirmation → Blockchain Settlement

---

## Core Principles

### Human Confirms
Humans always own the final decision.

### Agent Negotiates
Agents discover, evaluate, negotiate, and coordinate.

### Blockchain Executes
Financial settlement and trust are executed on-chain.

---

## Core Business Flow

```
Audience Wish → Demand Aggregation → Matching Engine → Agent Negotiation
→ Deal Creation → Human Confirmation → Settlement → Ticket NFT
```

## Agent Runtime Architecture

```
WishLive Runtime ≈ OpenCode Runtime Philosophy
                 + Vercel AI SDK Runtime
                 + WishLive Business Logic
```

参考：https://deepwiki.com/opencode-ai/opencode

**Rules:**

- **OpenCode Architecture** — Use OpenCode pattern: Card → Session → Tools → Memory → Events
- **Vercel AI SDK Agent Runtime** — `ToolLoopAgent`, `generateText`, `streamText`
- **Workflow SDK** — orchestration patterns
- **Redis Streams** — agent communication & event bus
- **SSE** — frontend streaming
- **OpenTelemetry** — tracing
- **Langfuse** — observability & trace viewer

**Never build:**
- Custom LLM loops
- Custom tool frameworks
- Custom memory systems
- Custom streaming protocols

**Build only:**
- Demand Engine
- Matching Engine
- Negotiation Engine
- Reputation Engine
- Settlement Engine

> 完整 OpenCode 映射 → [docs/opencode/opencode-mapping.md](docs/opencode/opencode-mapping.md)
>
> 每个 WishLive 组件都能在 OpenCode `internal/` 包中找到对应的架构模式。

---

## Technical Principles

- **TypeScript First** — Entire stack must use TypeScript.
- **Event Driven** — All important actions emit events.
- **Observable** — Every agent action must be visible.
- **Protocol First** — Protocols before implementations.

---

## Coding Rules

- No over-engineering
- Prefer simplicity
- Deliver demo first
- Avoid premature optimization
- Protocol consistency is mandatory

---
## 开发流程
每次运行前 运行 scripts/start.sh 设置环境变量和检查，安装依赖，编译合约,运行hardhat 节点，迁移数据库，持久化数据，启动docker服务。

---

## Development Habit

> 每次 session 结束时必须增量更新 `memory/context.md`，追加：
> 1. Session Log 新行（日期、目标、状态）
> 2. 本次完成项清单
> 3. 新决策（D#）或新问题（B#）记录
> 4. 更新待办清单状态
>
> 禁止覆盖已有记录 —— 历史是调试的锚点。

---

## Success Criteria

Judges must see:

- 57+ Agents Online
- Agent Discovery & Agent Negotiation
- Blockchain Settlement (Escrow + Ticket NFT)
- Real Event Flow (Wish → Demand → Matching → Deal → Confirm)
- Real-Time Topology Dashboard

---

## Test Commands

```bash
# 端到端测试
/skills playwright cli
使用playwright cli skills 使用 playwright cli 打开浏览器，测试所有环节，确保流程通畅。，打开真实浏览器，前端测试UI， 等，后端测试api，agent, 日志，数据质量，提示词，工具调用等。，合约测试，确保智能合约正确执行。
# 质量门禁
npm run lint       # 代码风格
npm run build      # 编译
npm run type-check # 类型检查
```

---

## 新功能开发流程

加载 skill → 自动在 `hackthon/specs/feature-xxx/` 创建 PRD→PLAN→TASK→CHECK→ANALYZE→IMPLEMENT 文件:

```
/skills:development-workflow
```

完成后执行质量门禁 → PR → 合并 → 更新 CHANGELOG.md。

---
## Must

### 数据流（事件的唯一性）
- 所有数据必须通过事件总线传递，禁止硬编码数据欺骗
- 所有 Agent 行为必须通过事件总线触发，禁止直接调用内部方法
- 所有 API / 数据库 / 合约调用必须通过事件总线调度

### 演示红线（不可绕过）
- 必须经过 Human Confirmation 才能释放资金
- 必须经过 Escrow 才能处理资金流转
- 必须铸造 Ticket NFT 才算完整流程

### 开发纪律
- 卡住时先拷问我，每次一问带推荐答案，达成共识再继续
- 每次商讨结束必须增量更新 `memory/context.md`
- 需要帮忙立刻停下来问
---

## Quick Links

| 需要什么 | 去读 |
|---------|------|
| OpenCode 映射（架构蓝图） | [docs/opencode/opencode-mapping.md](docs/opencode/opencode-mapping.md) |
| **产品层** | |
| 前端页面清单 | [docs/frontend/pages.md](docs/frontend/pages.md) |
| 前端技术栈（已冻结） | [docs/frontend/tech-stack.md](docs/frontend/tech-stack.md) |
| 后端服务清单 | [docs/backend/services.md](docs/backend/services.md) |
| API 端点定义 | [docs/backend/endpoints.md](docs/backend/endpoints.md) |
| Agent 目录（技能/事件/IO） | [docs/agents/catalog.md](docs/agents/catalog.md) |
| Agent 工作流 | [docs/agents/workflows.md](docs/agents/workflows.md) |
| 智能合约定义（已冻结） | [docs/contracts/contracts.md](docs/contracts/contracts.md) |
| 合约开发任务 | [docs/contracts/tasks.md](docs/contracts/tasks.md) |
| 共享 UI 组件 | [docs/ui/components.md](docs/ui/components.md) |
| **架构层** | |
| 14 种 Agent 定义 | [AGENTS.md](AGENTS.md) |
| ADR 架构决策 | [DECISIONS.md](DECISIONS.md) |
| 运行时架构 | [docs/runtime/runtime.md](docs/runtime/runtime.md) |
| 运行时规则 | [docs/development/](docs/development/) |
| 协议规范 | [docs/protocols/](docs/protocols/) |
| 数据库结构 | [database/schema.md](database/schema.md) |
| 事件清单 | [redis/topics.md](redis/topics.md) |
| API 接口定义 | [api/](api/) |
| 可观测性 | [docs/observability/](docs/observability/) |
| 设计风格 | [DESIGN.md](DESIGN.md) |
| 任务里程碑 | [TASKS.md](TASKS.md) |
| 开始新功能 | `/skills:development-workflow` |
