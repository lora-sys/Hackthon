# ARCHITECTURE.md

# WishLive Architecture

> 架构总蓝图 → [docs/opencode/opencode-mapping.md](docs/opencode/opencode-mapping.md)
> 产品层索引 → [WIKI.md](WIKI.md)

---

---
架构设计
前端部分 采用 服务端和客户端渲染等机制，组件化设计，状态管理等，确保用户界面友好且响应迅速。模块化组织，组件可复用，易于维护和扩展。只在 需要交互等地方使用客户端渲染，其他静态内容使用服务端渲染，提升性能和 SEO。page.tsx 禁止 客户端，采用服务端+客户端端部分 ，ai 部分使用vercel ai sdk 看 wiki.md 使用ai element ui  和hero UI 作为组件使用，避免自己造轮子，抽离可复用独立组件，提升开发效率和界面一致性。整体设计注重用户体验和性能优化。

类型安全，禁止使用 any 和 @ts-ignore，所有输入输出都使用 zod 进行校验，确保数据质量和系统稳定性。前端与后端通过 RESTful API 或 GraphQL 进行通信，确保数据交互的高效和安全。
后端采用分层架构，清晰划分职责，确保系统的可维护性和可扩展性。核心层负责业务逻辑和数据处理，接口层负责与前端通信，工具层提供辅助功能。模块化设计，功能单一，易于测试和维护。每个 Agent 作为独立模块运行，通过消息总线进行通信，实现松耦合和高内聚。状态驱动每轮协商fsm，所有api 输出输入都用zod 校验，禁止 any，禁止 @ts-ignore枚举使用 as const 而非 enum异步错误统一使用 Result<T, E> 模式
智能合约部分 单一职责: 每个合约只负责一个领域（AgentProfile / Escrow / TicketNFT）
安全优先: Checks-Effects-Interactions 模式 + Transient Storage Reentrancy Guard 
事件驱动: 所有状态变更必须 emit event，供 subgraph 索引和前端监听
访问控制: OpenZeppelin AccessControl，多签 + Timelock 治理

> ⛔ **已冻结**：不再新增合约。详情 → [docs/contracts/contracts.md](docs/contracts/contracts.md)

测试 统一使用 playwright cli skills 进行端到端测试，覆盖前端 UI、后端 API、Agent 行为、日志记录、数据质量、提示词效果、工具调用和智能合约执行等方面。确保系统的整体质量和稳定性。 


---

# High Level Architecture

Audience

↓

Frontend

↓

Agent Runtime

↓

Registry

↓

A2A Communication

↓

Redis Event Bus

↓

Blockchain Layer

---

# Runtime Layer

Core Runtime Components

* BaseAgent
* Scheduler
* Memory
* Skill Execution
* State Machine

Responsibilities

* Agent execution
* Skill invocation
* Lifecycle management

---

# Registry Layer

Responsibilities

* Registration
* Discovery
* Search
* Heartbeat

Supports

* Search by type
* Search by tags
* Search by skills

Examples

genre:rock

city:shanghai

capacity:500

---

# Agent Card Layer

Contains

* Identity
* Skills
* Tags
* Reputation
* Wallet

Purpose

Agent discoverability.

---

# A2A Layer

Message Types

* TASK
* EVENT
* PROPOSAL
* COUNTER_PROPOSAL
* ACCEPT
* REJECT
* INTERRUPT
* RESUME

Every message uses a common envelope.

---

# Event Layer

> **单一事件真相来源：[redis/topics.md](./redis/topics.md)** — 所有事件定义以此文件为准。

Redis Streams

Topics

agent.lifecycle
  ├── agent.registered
  ├── agent.online
  ├── agent.offline
  └── agent.error

agent.task
  ├── task.created
  ├── task.started
  ├── task.completed
  └── task.failed

wish
  ├── wish.created
  └── wish.withdrawn

demand
  ├── demand.created
  └── demand.threshold_reached

matching
  ├── matching.started
  └── matching.completed

negotiation
  ├── negotiation.started
  ├── proposal.sent
  ├── counterproposal.sent
  ├── proposal.accepted
  ├── proposal.rejected
  └── deal.created

settlement
  ├── settlement.started
  ├── escrow.created
  └── ticket.minted

blockchain
  ├── blockchain.tx.sent
  └── blockchain.tx.confirmed

concierge
  └── concierge.notification

---

# Demand System

Input

Audience wishes

Output

Demand cohorts

Threshold-based aggregation.

---

# Matching System

Score Formula

Genre Match = 40%

Location Match = 30%

Availability Match = 20%

Reputation = 10%

Output

Ranked musician and venue candidates.

---

# Negotiation System

Negotiation Objects

* Proposal
* CounterProposal
* Deal

Negotiation Topics

* Revenue Split
* Venue Fee
* Schedule

Result

Deal

or

Failure

---

# Blockchain Layer

## 智能合约接口

合约基于 Solidity ^0.8.x，在 Hardhat Localnet 部署。

### AgentProfile.sol

存证 Agent 身份信息，绑定 DID 和 AgentCard。

```solidity
// 注册/更新 Agent 链上身份
function registerAgent(address wallet, bytes32 agentCardHash, string calldata did) external returns (uint256 agentId);

// 查询 Agent 信息
function getAgent(uint256 agentId) external view returns (address wallet, bytes32 agentCardHash, string memory did, uint256 registeredAt);

// 验证 AgentCard 是否匹配链上记录
function verifyCard(address wallet, bytes32 agentCardHash) external view returns (bool valid);
```

### WishPool.sol

需求池登记，记录聚合心愿数和状态。

```solidity
// 创建需求池
function createPool(bytes32 demandId, uint256 threshold, uint256 depositAmount) external returns (uint256 poolId);

// 加入需求池
function joinPool(uint256 poolId, address participant) external;

// 查询需求池人数
function getPoolCount(uint256 poolId) external view returns (uint256 count);
```

### Escrow.sol

资金托管 —— 锁定意向金+票款，含演出信息存证和自动分账。

```solidity
// 创建托管（ShowConfirm Agent 调用，包含演出信息和分账规则）
function createEscrow(bytes32 dealId, bytes32 showId, address[] calldata payees, uint256[] calldata shares) external payable returns (uint256 escrowId);

// 人工确认释放（唯一资金释放入口，需人工签名）
function confirmRelease(uint256 escrowId, bytes calldata signature) external;

// 查询托管状态
function getEscrow(uint256 escrowId) external view returns (address[] memory payees, uint256 balance, EscrowStatus status);
// EscrowStatus: PENDING | RELEASED | REFUNDED
```

### TicketNFT.sol

事件门票 ERC-721 NFT。

```solidity
// 铸造门票（Settlement Agent 调用）
function mintTicket(address to, bytes32 dealId, string calldata metadataUri) external returns (uint256 tokenId);

// 查询门票绑定的 deal
function getTicketDeal(uint256 tokenId) external view returns (bytes32 dealId);
```

---

# Frontend Layer

> 完整页面清单 → [docs/frontend/pages.md](docs/frontend/pages.md)
> 技术栈冻结 → [docs/frontend/tech-stack.md](docs/frontend/tech-stack.md)

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Landing | 品牌展示、引导注册/许愿 |
| `/onboarding` | Agent Onboarding | 选择角色 → 填写信息 → 生成 Agent Card |
| `/wishes` | Wish Pool | 提出心愿、浏览心愿、"已上链 ✓" |
| `/dashboard` | Dashboard | 用户总览、流程状态 |
| `/dashboard/audience` | Audience Profile | 个人中心（后续迭代） |
| `/dashboard/musician` | Musician Profile | 个人中心（后续迭代） |
| `/dashboard/venue` | Venue Profile | 个人中心（后续迭代） |
| `/negotiation/[id]` | Negotiation Panel | 协商可视化、A2A 消息流 |
| `/concierge` | Concierge 浮窗 | 常驻右下角浮窗，点击激活 AI 助手 |
| `/topology` | Topology Screen | 57 Agents 实时拓扑 |

## 页面功能

Pages

* **Landing** — 品牌展示 + 引导连接钱包 / 注册 / 许愿
* **Agent Onboarding** — 选择 Audience/Musician/Venue → 表单 → Agent Card JSON → 上链
* **Wish Form** — 许愿提交、心愿列表、"身份已上链 ✓"
* **Dashboard** — 用户总览、角色切换视图、事件流日志
* **Negotiation Panel** — 提案/反提案可视化、时间线
* **Topology Screen** — 57 Agents 实时拓扑、心跳状态色标

每个角色个人中心（后续迭代）
* Audience Profile
* Musician Profile
* Venue Profile

# Observability

All actions emit events.

No hidden state.

Everything must be replayable.

---

# Deployment

Frontend

* Next.js 15

Backend

* Node.js

Storage

* PostgreSQL
* Redis

Blockchain

* Hardhat Localnet

Deployment

* Docker
* Railway
