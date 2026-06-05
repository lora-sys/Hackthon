# DECISIONS.md

# ADR-001 Why Vercel AI SDK Agents?

Status: Accepted

Reason:

* Native TypeScript support
* Built-in Agent abstractions
* Tool calling and workflow capabilities
* Strong integration with modern AI application patterns
* Excellent developer experience
* Fast implementation for hackathons

Alternatives:

* Mastra
* LangGraph
* CrewAI
* AutoGen

Decision:

Use the Vercel AI SDK Agents as the primary agent framework.

For the agent UI layer, use AI Elements (https://elements.ai-sdk.dev/docs) to provide reusable agent interaction components, conversation interfaces, and real-time agent experiences.

---

# ADR-002 Why Redis Streams?

Status: Accepted

Reason:

* Lightweight
* Replayable
* Real-time
* Easy WebSocket integration

Decision:

All agent events must flow through Redis Streams.  read https://redis.io/docs/latest/develop/data-types/streams/

---

# ADR-003 Why Self-built Registry?

Status: Accepted

Reason:

Traditional service discovery only answers:

Who is online?

WishLive requires:

Who can perform rock music?
Who owns a 500-seat venue?
Who accepts a 20% split?

Decision:

Build a capability-aware registry.

---

# ADR-004 Why Hardhat Localnet?

Status: Accepted

Reason:

* Instant confirmation
* No faucet issues
* Demo reliability

Decision:

Use Hardhat Localnet for hackathon.

---

# ADR-005 Agent Scale Strategy

Status: Accepted

Reason:

Need scale impression.

**Total**: 57+ agents online, seeded via Docker → PostgreSQL → Registry on startup.

**Three layers**:

| 层 | 类型 | 数量 | 角色 |
|----|------|------|------|
| **个体层** | Audience / Musician / Venue | ~35 | 用户资产，注册在 Registry，有真实技能和标签 |
| **管理层** | Musician Manager / Venue Manager / Organizer | 3 | 管理个体 agent 的状态和数据同步 |
| **核心业务层** | Onboarding / Concierge / WishMaker / Demand Pool / Matching Engine / Negotiation / Settlement / ShowConfirm | 9 | 驱动全链路流程，Pipeline 从左到右 |
| **基础设施** | Registry / Event Bus / Memory Store / IPFS / Blockchain Node + 影子填充 | ~10 | 系统服务层 |

个体 Agent 都具有职业属性：

| 个体类型 | 标签 | 技能 |
|---------|------|------|
| Audience x10 | — | submit_wish, withdraw_wish, confirm_show |
| Musician x15 | genre:rock/pop/jazz, city:shanghai/beijing/shenzhen | check_availability, propose_offer, accept_offer, reject_offer |
| Venue x10 | city:shanghai/beijing/shenzhen, capacity:200/500/1000 | check_capacity, quote_price, accept_offer, reject_offer |

其中 3 个 Agent（MusicianA / VenueB / Settlement）展示完整深度协商（Proposal↔CounterProposal↔Accept，多轮往返）。
其余所有 agent 的 maxSteps=2（接收提案 → 执行技能 → 直接 accept/reject）。
所有 A2A 消息流在 Dashboard 事件日志可见。

心跳间隔：30s（全部一致），Registry 60s 无心跳标记 OFFLINE。

启动行为：
1. 从 PostgreSQL 读取预制 Agent Card 数据
2. POST /registry/register（携带 Agent Card），Registry 按 genre/city/capacity 索引
3. 每 30s POST /registry/heartbeat
4. 管理 Agent + 业务 Agent 通过 Registry 搜索个体 Agent → A2A 发送任务/提案
5. 个体 Agent 收到 A2A 消息 → 执行技能 → 返回结果

参考：A2A Agent Discovery → https://a2a-protocol.org/latest/topics/agent-discovery/
Redis Streams → https://redis.io/docs/latest/develop/data-types/streams/

Decision:

All agents registered.
Only a subset participates in deep negotiation.

---

# ADR-006 Why Human Confirmation?

Status: Accepted

Reason:

Agents should recommend.

Humans should approve.

Decision:

No autonomous financial execution without confirmation.

---

# ADR-007 Why Event-Driven Architecture?

Status: Accepted

Reason:

Observability is a core demo feature.

Decision:

Every important action emits an event.

No hidden workflows.

---

# ADR-008 Why Blockchain?

Status: Accepted

Reason:

Hackathon requires blockchain component.

Decision:

Blockchain handles:

* Identity
* Escrow
* Ticket NFT

Business logic remains off-chain.

# ADR-009 Why AI SDK Workflow Patterns?

Status: Accepted

Reason:

Agent workflow for long running process and complex logic. AI SDK Workflow Patterns manage state and execution using built-in workflow capabilities — no separate workflow-sdk product required.

Decision:

Use AI SDK Workflow Patterns to manage agent workflow. Read https://ai-sdk.dev/docs/agents/workflows

> 备用选项：Vercel Workflow SDK（https://workflow-sdk.dev）—— 但需要 Vercel 部署环境，非通用方案。

# ADR-010 Why AI SDK Workflow Patterns for Orchestration?

Status: Accepted
Reason:
* Native integration with AI SDK — uses built-in workflow patterns, not a separate SDK
* Simplifies agent orchestration within workflows
* Leverages existing agent capabilities in workflow context
* Refer to https://ai-sdk.dev/docs/agents/workflows for implementation guidance
Decision:
Use AI SDK Workflow Patterns for orchestrating agent workflows within the application.

# ADR-012 Why use vercel ai elements for agent UI?

Status: Accepted
Reason:
* Provides reusable UI components for agent interactions
* Seamless integration with Vercel AI SDK Agents
* Enhances user experience with consistent design patterns
Decision:
https://elements.ai-sdk.dev/docs?utm_source=chatgpt.com
Use Vercel AI Elements for building the agent interaction UI components, such as conversation interfaces and real-time agent experiences.

# ADR-013 Why use Hero UI for base UI components?

Status: Accepted
Reason:
* Provides a comprehensive set of React components
* Designed for building AI applications
* Enhances developer experience with ready-to-use components
Decision:
Use Hero UI for building the base UI components of the application, such as layout, buttons,dashboard,chat,mail,finances  and other common interface elements. read https://heroui.com/en/docs/react/getting-started/llms-txt

# ADR-014 Why AI SDK UI + AI Elements for Web Chat UI?
Status: Accepted
Reason:
* AI SDK UI (useChat hook) 提供流式消息收发和聊天状态管理，是 Next.js 网页聊天的标准方案
* AI Elements 提供基于 shadcn/ui 的聊天组件（Conversation, Message, Thread），开箱即用
* 两者配合覆盖 Web 聊天界面的全部需求
* Vercel Chat SDK (chat-sdk.dev) 只用于 Slack/Discord/Teams 等外部 bot 平台，不用于网页界面
Decision:
Use AI SDK UI (useChat) + AI Elements for the web chat interface.
Read https://ai-sdk.dev/docs/ai-sdk-ui and https://elements.ai-sdk.dev/docs

# ADR-015 Runtime Architecture
Status: Accepted
Reason:
* OpenCode 提供了成熟的 Agent 运行时架构参考（Card/Session/Tools/Memory/Events）
* Vercel AI SDK 提供了 ToolLoopAgent + Telemetry + Workflow Patterns
* 没必要自建 LLM 循环、工具框架、记忆系统、流式协议
* 项目只需构建业务逻辑层（Demand/Matching/Negotiation/Reputation/Settlement）
Decision:
Use OpenCode architecture philosophy: https://deepwiki.com/opencode-ai/opencode
Use Vercel AI SDK runtime for agent execution.
Do not build custom runtime infrastructure — business logic only.
