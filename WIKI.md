# WishLive Wiki

> Agent Native Marketplace for Live Music Events
> 本文档是项目的 wiki 总入口，为 agent 开发提供全链路参考。

---

## 🗺️ 文档地图

```
docs/
├── product/                          ← 产品层 — 下一步开发什么
│   ├── frontend/pages.md            — 所有页面清单（purpose / widgets / data_sources）
│   ├── frontend/tech-stack.md       — 前端技术栈（已冻结，禁止引入未列依赖）
│   ├── backend/services.md          — 后端 5 个服务定义
│   ├── backend/endpoints.md         — 全部 REST 端点（含请求/响应）
│   ├── agents/catalog.md            — 14 种 Agent 的技能/事件/IO 清单
│   ├── agents/workflows.md          — Wish→Show 主流程 + 并发协商 + 错误恢复
│   ├── contracts/contracts.md       — 3 个合约已冻结（禁止新增）
│   ├── contracts/tasks.md           — 合约函数级任务 + 测试清单
│   └── ui/components.md             — 10 个共享 UI 组件（复用规则）
│
├── architecture/                     ← 架构层 — 系统怎么设计
│   ├── AGENTS.md                    — Agent 拓扑完整定义
│   ├── DECISIONS.md                 — 全部 ADR 架构决策
│   ├── CLAUDE.md                    — Claude Code 工作指令
│   └── runtime/runtime.md           — 运行时架构（Runtime / Session / Tool / MCP / Event / Observability）
│
├── database/                        ← 数据层
│   ├── erd.md                       — 实体关系图
│   └── schema.md                    — 全部表定义
│
├── redis/topics.md                  ← 事件总线（Redis Streams 主题）
│
├── api/                             ← 接口层
│   └── a2a.yaml                     — A2A 通信 OpenAPI 规范
│
├── opencode/                        ← OpenCode 映射层 — WishLive 的架构蓝图
│   └── opencode-mapping.md          — `internal/` 包逐个映射：agent/tools/message/session/...

├── protocols/                       ← 协议层
│   ├── message.md                   — 统一 Message Envelope
│   ├── events.md                    — 全链路事件定义
│   ├── skills.md                    — 技能 Schema + 注册表
│   └── agent-card.md                — Agent Card 规范
│
└── observability/                   ← 可观测层
    └── langfuse.md                  — OpenTelemetry → Langfuse 接入
```

> **角色指引**：
> 🗺️ 架构总蓝图 → [opencode-mapping.md](docs/opencode/opencode-mapping.md)
> 🖥️ 前端开发 → [pages.md](docs/frontend/pages.md) + [tech-stack.md](docs/frontend/tech-stack.md)
> 🔌 API 开发 → [endpoints.md](docs/backend/endpoints.md)
> 🤖 Agent 开发 → [catalog.md](docs/agents/catalog.md) + [workflows.md](docs/agents/workflows.md)
> ⛓️ 合约开发 → [contracts.md](docs/contracts/contracts.md)
> 🎨 UI 复用 → [components.md](docs/ui/components.md)

## 📋 项目概览

WishLive 是一个**Agent Native 市场**——观众发起心愿，自治 agent 全流程协调。

**核心流程：**
```
User Registration → Fill Agent Card → Register in Registry → Identity Onchain ✓
                                                                        ↓
Audience Wish → Demand Aggregation → Matching Engine → Agent Negotiation
→ Deal Creation → Human Confirmation → Settlement → Ticket NFT
```

**完整用户旅程：**
```
用户注册(三种角色) → 填写个人信息 → 生成 Agent Card JSON → AgentCard hash 上链存证
                                                                               ↓
在许愿池提交心愿(观众) / 接收协商提案(乐手/场地) → 参与协商 → 成交
                                                                               ↓
人工确认 → 资金托管 → 门票 NFT 铸造
```

**核心原则：**
- 🧑 **Human Confirms** — 人类始终拥有最终决策权
- 🤖 **Agent Negotiates** — Agent 负责发现、评估、协商、协调
- ⛓️ **Blockchain Executes** — 财务结算和信任在链上执行

---

## 🧬 Agent 拓扑

参见 [AGENTS.md](./AGENTS.md) 完整定义。

### Agent 类型

| Agent | 层 | 职责 | 输入事件 | 输出事件 |
|-------|-----|------|---------|---------|
| **Audience Agent** | 个体 | 提交心愿、跟踪进度、确认参与 | User actions | `wish.created` |
| **Musician Agent** | 个体 | 检查档期、协商条款 | `proposal` | `proposal.accepted` |
| **Venue Agent** | 个体 | 报价场地、协商分成 | `proposal` | `proposal.accepted` |
| **Musician Manager** | 管理 | 管理乐手注册/状态同步 | `agent.registered` | `musician.synced` |
| **Venue Manager** | 管理 | 管理场地注册/容量数据 | `agent.registered` | `venue.synced` |
| **Organizer Agent** | 管理 | 发起/取消活动 | `demand.created` | `event.ready` |
| **Onboarding Agent** | 业务 | 新手引导（钱包→Agent→上链） | `user.registered` | `onboarding.completed` |
| **Concierge Agent** | 业务 | 浮窗 AI 助手（查状态/查数据） | All events | 人类可读解释 |
| **WishMaker Agent** | 业务 | 许愿处理 | `wish.created` | `wish.aggregated` |
| **Demand Pool Agent** | 业务 | 需求聚合（阈值检测） | `wish.aggregated` | `demand.created` |
| **Matching Engine** | 业务 | 搜索评分（Top 3 候选） | `demand.created` | `matching.completed` |
| **Negotiation Agent** | 业务 | 协商编排 | `matching.completed` | `deal.created` |
| **Settlement Agent** | 业务 | 资金分账/托管 | `deal.created` | `escrow.created` |
| **ShowConfirm Agent** | 业务 | 演出确认/出票 | `deal.created` | `show.confirmed` |

### Agent 生命周期

```
CREATED → REGISTERED → ONLINE → BUSY → WAITING_CONFIRMATION → COMPLETED → OFFLINE → ERROR
```

### 57 Agents 运行机制

> 官方参考：Redis Streams [XADD / XREADGROUP](https://redis.io/docs/latest/develop/data-types/streams/) · A2A [Agent Card](https://a2a-protocol.org/latest/specification/#8-agent-discovery-the-agent-card) · A2A [Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/) · Anthropic [Agent Design](https://www.anthropic.com/research/building-effective-agents)

ADR-005 定义了 57 个 agent 的分配表。运行时的关键参数：

**心跳机制**
- 每个 ONLINE agent 每 `30s` 向 Registry 发一次心跳
- Registry 60s 无心跳则标记 OFFLINE（`ttl = 60`，基于 HeartbeatResponse 的 ttl 字段）

**Seed 数据**
所有 57 个 agent 的 Agent Card 数据通过 Docker 持久化到 PostgreSQL，系统启动时自动加载到 Registry。
数据包含真实姓名、技能、标签、声誉分。预存 Audience 心愿用于触发需求聚合。

**两类角色**

| 角色 | 类型 | 数量 | 做什么 |
|------|------|------|--------|
| **管理 Agent** | Demand / Matching / Settlement / Concierge | 10 | 驱动流程 — 搜索 Registry、编排 A2A 消息、协调个体 agent |
| **个体 Agent** | Audience x10, Musician x15, Venue x12, 补充 x10 | 47 | 注册在 Registry，持有 Agent Card（技能+标签），被管理 agent 通过 A2A 调度 |

**3 个深度协商 Agent**
MusicianA / VenueB / Settlement — 多轮 Proposal↔CounterProposal↔Accept 闭环。

**其余 54 个 Agent**
参与 A2A 通信，`maxSteps=2`（接收提案 → 执行技能 → accept/reject，不产生多轮反提案）。
消息流在 Dashboard 事件日志可见。

---

## 🏗️ 系统架构

参见 [ARCHITECTURE.md](./ARCHITECTURE.md) 完整分层。

```
Audience
    ↓
Frontend (Next.js 15)
    ↓
Agent Runtime (Vercel AI SDK)
    ↓
Registry (自建能力感知注册)
    ↓
A2A Communication
    ↓
Redis Event Bus (Streams)
    ↓
Blockchain Layer (Hardhat Localnet)
```

### 运行时层
- `BaseAgent` — 所有 agent 基类
- `Scheduler` — 任务调度
- `Memory` — agent 记忆与上下文
- `Skill Execution` — 技能调用
- `State Machine` — 生命周期状态机

### Registry 层
- 注册/心跳/搜索
- 支持按类型、标签、技能搜索
- 示例: `genre:rock`, `city:shanghai`, `capacity:500`

### A2A 通信层
消息类型: `TASK`, `EVENT`, `PROPOSAL`, `COUNTER_PROPOSAL`, `ACCEPT`, `REJECT`, `INTERRUPT`, `RESUME`

---

## 🗄️ 数据库

参见 [database/erd.md](./database/erd.md) 和 [database/schema.md](./database/schema.md)。

### 实体关系
```
users ──┐
        ├── agents
        └── wishes ──→ demand_members ──→ demands

demands ──→ negotiations ──┬── proposals
                            └── deals ──┬── blockchain_transactions
                                        └── tickets
```

### 核心表

| 表 | 关键字段 | 说明 |
|----|---------|------|
| `users` | id, wallet_address, nickname | 用户（观众/音乐人/场地方） |
| `agents` | user_id, agent_type, did, status, reputation_score, agent_card_json | Agent 注册信息 |
| `wishes` | user_id, artist_name, genre, city, preferred_date, deposit_amount | 观众心愿 |
| `demands` | title, city, genre, wish_count, threshold, status | 需求群组 |
| `negotiations` | demand_id, musician_agent_id, venue_agent_id, status | 协商记录 |
| `proposals` | negotiation_id, sender_agent_id, venue_fee, split_percentage | 提案 |
| `deals` | negotiation_id, deal_json, status | 成交合同 |
| `tickets` | deal_id, token_id, owner_wallet, metadata_uri | 门票 NFT |

---

## 📡 事件总线 (Redis Streams)

参见 [redis/topics.md](./redis/topics.md)。

### 事件主题全览

| 事件 | 触发时机 |
|------|---------|
| `agent.registered` | Agent 注册 |
| `agent.online` | Agent 上线 |
| `agent.offline` | Agent 下线 |
| `agent.error` | Agent 错误 |
| `wish.created` | 观众提交心愿 |
| `wish.withdrawn` | 观众撤回心愿 |
| `demand.created` | 需求聚合完成 |
| `demand.threshold_reached` | 达到阈值 |
| `matching.started` | 匹配开始 |
| `matching.completed` | 匹配完成 |
| `negotiation.started` | 协商开始 |
| `proposal.sent` | 提案发送 |
| `proposal.accepted` | 提案接受 |
| `deal.created` | 交易创建 |
| `escrow.created` | 托管创建 |
| `ticket.minted` | 门票铸造 |
| `concierge.notification` | 通知推送 |

---

## 🔌 API 接口

### Registry API (`POST`)
| 路径 | 说明 |
|------|------|
| `/registry/register` | 注册 Agent |
| `/registry/heartbeat` | Agent 心跳 |
| `/registry/search` | 搜索 Agent |
| `/registry/{agentId}` | 获取 Agent Card |
| `/registry/skills` | 搜索技能 |
| `/registry/tags` | 搜索标签 |

### A2A 通信 API
参见 [api/a2a.yaml](./api/a2a.yaml) — 定义 agent 间消息格式和通信协议。

### Settlement API
参见 [api/settlement.yaml](./api/settlement.yaml) — 区块链结算接口。

### Concierge API
参见 [api/concierge.yaml](./api/concierge.yaml) — 用户查询与说明接口。

---

## 📐 协议规范

参见 [docs/protocols/](./docs/protocols/) 目录。

| 协议 | 文件 | 内容 |
|------|------|------|
| A2A | [a2a.md](./docs/protocols/a2a.md) | Agent 间通信协议 |
| Agent Card | [agent-card.md](./docs/protocols/agent-card.md) | Agent 身份/技能/声誉卡片 |
| 事件 | [events.md](./docs/protocols/events.md) | 全链路事件清单 |
| 消息 | [message.md](./docs/protocols/message.md) | 统一 Message Envelope |
| 协商 | [negotiation.md](./docs/protocols/negotiation.md) | 协商流程和状态机 |
| 技能 | [skills.md](./docs/protocols/skills.md) | 技能 Schema + 注册表 |

---

## 💼 业务逻辑

参见 [docs/business/](./docs/business/) 目录。

### Demand 需求
- 心愿聚合 → 阈值检测 → 需求群组创建

### Matching 匹配
- 评分公式: Genre 40% + Location 30% + Availability 20% + Reputation 10%

### Reputation 声誉
- Agent 行为评分机制

---

## ⚙️ 技术栈

| 层 | 技术 | 选型决策 | 说明 |
|----|------|---------|------|
| **Agent 框架** | Vercel AI SDK `ToolLoopAgent` | ADR-001 | 思考→工具→循环模式 |
| **Agent UI** | Vercel AI Elements | ADR-012 | shadcn/ui 基座的 agent 组件库 |
| **网页聊天 UI** | AI SDK UI (`useChat`) | ADR-012 | Next.js 聊天界面 |
| **多平台 Bot** | Vercel Chat SDK | ADR-011 | Slack/Discord/Teams bot |
| **长流程编排** | AI SDK Workflow Patterns | ADR-009 | Sequential/Orchestrator/Parallel 模式 |
| **UI 组件** | HeroUI | ADR-013 | 基于 Tailwind v4 |
| **事件总线** | Redis Streams | ADR-002 | XADD/XREADGROUP |
| **服务注册** | 自建能力感知 Registry | ADR-003 | 支持按 genre/city/capacity 搜索 |
| **区块链** | Hardhat Localnet | ADR-004 | 本地链开发测试 |
| **前端** | Next.js 15 | - | App Router |
| **后端** | Node.js | - | - |
| **数据库** | PostgreSQL | - | - |
| **部署** | Docker / Railway | - | - |

> **关于 Workflow 方案**：[workflow-sdk.dev](https://workflow-sdk.dev) 是 Vercel 独立的基础设施产品（需 Vercel 部署，作为备用选项），项目实际使用 [AI SDK Workflow Patterns](https://ai-sdk.dev/docs/agents/workflows)（`Sequential` / `Orchestrator` / `Parallel` 模式）作为轻量级编排方案，无需额外部署依赖。

### UI 架构说明

```
用户界面
    │
    ├── HeroUI (基础组件: Button, Card, Modal, Form, Table)
    ├── AI Elements (Agent 专用组件: Conversation, Message, Chat)
    ├── AI SDK UI (useChat hook: 流式消息收发)
    └── shadcn/ui (AI Elements 底层基座)

注意: Vercel Chat SDK 用于多平台 bot (Slack/Discord/Teams),
网页聊天界面应使用 AI SDK UI (useChat) + AI Elements。
```

### 钱包连接流程

```
用户打开页面
    │
    ├── 已连接 → 读取钱包地址 → 加载用户信息
    │
    └── 未连接 → 点击"连接钱包"
                     │
                     ├── MetaMask / WalletConnect 弹窗
                     │
                     └── 用户签名消息 (personal_sign)
                             │
                             ├── 后端验签 → 创建/认证 session
                             │
                             └── wallet_address 绑定到 user_id

Agent 创建时:
  wallet_address → agent.wallet_address
  agent_card_json 的 did 字段 = "did:wishlive:{wallet_address}"
  AgentCard hash → 上链存证 (AgentProfile 合约)

交易签名:
  人工确认 → 用户 MetaMask 签名 → Settlement Agent 执行交易
  种子 agent 使用预置 wallet (不参与真实交易签名)
```

> 钱包库推荐：wagmi + RainbowKit (Next.js 集成最佳)

### 关于 Google ADK

Google ADK (Agent Development Kit) 是 A2A 协议的 **Python/Kotlin 参考实现**。
WishLive 项目不直接使用 ADK，而是：
- 遵循 A2A 协议的消息格式（`AgentCard`, `Task`, `Message.parts`）
- 使用 **Redis Streams** 作为传输层（代替 ADK 的 HTTP/gRPC）
- 在 Registry 中实现 Agent Card 的存储和发现
- 参考 ADK 的 A2A 通信模式来设计我们的消息流

> ADK 参考价值：https://adk.dev/a2a/intro/

### 智能合约汇总

参见 [docs/contracts/contracts.md](./docs/contracts/contracts.md)（已冻结，禁止新增）

| 合约 | 用途 | 状态 |
|------|------|------|
| AgentProfile.sol | Agent 链上身份（DID + wallet + AgentCard hash） | ✅ 已认定 |
| Escrow.sol | 资金托管 + 人工确认释放 + 自动分账 | ✅ 已认定 |
| TicketNFT.sol | 门票 ERC-721 | ✅ 已认定 |

> ⛔ **已冻结**：不创建 WishPool / Governance / Staking / Marketplace

---

## 🎯 迭代路线

参见 [TASKS.md](./TASKS.md) 详细里程碑。

### Day 1 — 基础设施
- [ ] Agent Runtime (BaseAgent, State Machine, Memory, Skills)
- [ ] Registry (注册/搜索/心跳)
- [ ] Agent Card (Musician/Venue/Audience)
- [ ] Demand Agent (心愿创建/聚合/阈值)
- [ ] Matching Agent (搜索/排序)

### Day 2 — 核心业务
- [ ] Negotiation Engine (提案/反提案/接受/拒绝)
- [ ] Redis Event Bus (Streams/Producers/Consumers)
- [ ] Topology Dashboard (Agent 图表/实时更新)
- [ ] Negotiation Timeline (提案历史/可视化)

### Day 3 — 上链 & 打磨
- [ ] Blockchain Layer (AgentProfile/Escrow/TicketNFT)
- [ ] Concierge Agent (状态解释/失败解释/下一步建议)
- [ ] Demo Polish (修bug/UI清理/演示)

---

## 🎯 演示目标（Demo Goal）

```
5 分钟端到端演示路径：

0:00  打开 Landing → 连接钱包
0:30  创建 Agent（选择角色→填写信息→上链）
1:00  提交心愿（选择风格/城市/日期→支付意向金）
1:30  拓扑图 57 agents 跳动 + 事件流日志实时更新
2:00  Demand 聚合 → Matching 评分 → 开始协商
2:30  Negotiation Panel：MusicianA ↔ VenueB 多轮提案/反提案
3:30  人工确认 → 资金托管 → Ticket NFT 铸造
4:30  Dashboard 查看全流程状态 + Concierge AI 问答
5:00  演示结束
```

---

## 🧪 验证标准

- ✅ 57+ Agents 同时在线
- ✅ 用户注册三种角色 → Agent Card 生成
- ✅ AgentCard hash 上链存证
- ✅ Agent 发现 + 协商 + 链上结算
- ✅ 完整事件流闭环
- ✅ 实时 Topology 可视化
- ✅ 5 分钟端到端演示

---

## 📚 快速开发指南

### 按角色起步

| 角色 | 第一步 | 参考文档 |
|------|--------|---------|
| 🖥️ 前端开发 | 页面清单 + 技术栈 | [pages.md](docs/frontend/pages.md) + [tech-stack.md](docs/frontend/tech-stack.md) |
| 🔌 API 开发 | 端点定义 + 服务清单 | [endpoints.md](docs/backend/endpoints.md) + [services.md](docs/backend/services.md) |
| 🤖 Agent 开发 | Agent 目录 + 工作流 | [catalog.md](docs/agents/catalog.md) + [workflows.md](docs/agents/workflows.md) |
| ⛓️ 合约开发 | 合约定义 + 任务清单 | [contracts.md](docs/contracts/contracts.md) + [tasks.md](docs/contracts/tasks.md) |
| 🎨 UI 复用 | 共享组件清单 | [components.md](docs/ui/components.md) |

### 新 Agent 开发步骤

1. 在 [docs/agents/catalog.md](docs/agents/catalog.md) 定义 Agent 的技能/事件/IO
2. 在 [docs/agents/workflows.md](docs/agents/workflows.md) 确认工作流位置
3. 在 [docs/protocols/](./docs/protocols/) 遵循协议规范
4. 注册到 Registry (`POST /api/registry/register`)
5. 通过 Redis Streams 发布/订阅事件
6. 通过 A2A 协议与其他 agent 通信
7. 实现 AI SDK `tool()` 技能定义

### 新页面开发步骤

1. 在 [docs/frontend/pages.md](docs/frontend/pages.md) 确认页面定义
2. 检查 [docs/frontend/tech-stack.md](docs/frontend/tech-stack.md) 确认技术栈
3. 优先复用 [docs/ui/components.md](docs/ui/components.md) 已有组件
4. 参考 [docs/backend/endpoints.md](docs/backend/endpoints.md) 对接 API

### 常用命令
| 命令 | 说明 |
|------|------|
| `docker compose up` | 启动本地开发环境 (DB, Redis, Hardhat) |
| `npm run dev` | 启动开发服务器 |
| `npm run test` | 运行测试 |
| `npx hardhat node` | 启动本地持久化区块链 |

---

> 文档风格: [DESIGN.md](./DESIGN.md) — 线性暗色主题设计系统
> 决策记录: [DECISIONS.md](./DECISIONS.md) — 全部 ADR
