# Frontend Pages

Claude Code 开发任何页面时，先读此文件。

---

## P0（核心页面）

---

### Page: `/` — Landing

**Purpose**: 品牌展示 + 角色选择入口

**Sections**:
- Hero / 品牌标语（WishLive: Agent Native Marketplace）
- 三个角色入口（Audience / Musician / Venue）
- 实时 Agent 在线计数（57+）
- CTA → `/create-agent` 或 `/wish-pool`

**Priority**: P0

---

### Page: `/create-agent` — Agent Onboarding

**Purpose**: 引导用户创建 Agent（连接钱包 → 选角色 → 填信息 → 上链）

**Steps**:
1. Connect Wallet（wagmi + RainbowKit）
2. Select Role（Audience / Musician / Venue）
3. Fill Profile（name / genre / city / tags）
4. Preview Agent Card
5. On-chain Registration（AgentProfile.registerAgent）
6. ✅ Success → redirect to `/my-agent`

**Priority**: P0

---

### Page: `/wish-pool` — Wish Submission

**Purpose**: 观众提交心愿 + 查看心愿列表

**Widgets**:
- Wish Form（artist_name, genre, city, preferred_date, deposit_amount）
- Wish List（status: ACTIVE / FULFILLED / WITHDRAWN）
- Demand Progress Bar（current_count / MIN_THRESHOLD=10）
- "上链成功 ✓" Toast

**Data Sources**:
- `POST /api/wishes` → WishMaker Agent
- SSE `/api/events/stream` for real-time demand updates

**Priority**: P0

---

### Page: `/dashboard` — Global Dashboard

**Purpose**: 全平台总览监控

**Widgets**:
- **Agent Topology** — 57 agents 实时拓扑（React Flow）
- **Event Stream** — Redis Streams 事件日志实时滚动
- **Active Workflows** — 进行中的流程列表
- **System Metrics** — Agent online count, active negotiations, deals today

**Data Sources**:
- SSE `/api/events/stream`
- REST `/api/agents`, `/api/workflows`

**Priority**: P0

---

### Page: `/my-agent` — My Agent Dashboard

**Purpose**: 个人 Agent 信息中心

**Widgets**:
- Agent Card（avatar, type, skills, tags, reputation）
- Negotiation History（proposal ↔ counter-proposal timeline）
- Ticket NFT（minted tickets）
- Wallet Info（wagmi）

**Data Sources**:
- `/api/agents/{agentId}`
- `/api/negotiation?agentId=`
- SSE for real-time status changes

**Priority**: P0

---

### Page: `/negotiation/[id]` — Negotiation Panel

**Purpose**: 协商实时可视化

**Widgets**:
- **Negotiation Timeline** — 提案/反提案/接受/拒绝 时间线
- Agent Cards（Musician + Venue 并排）
- Deal Terms Display（venue_fee, split_percentage, schedule）
- Confirm / Reject Buttons（ShowConfirm Agent）
- Status Badge（PENDING / ACTIVE / ACCEPTED / REJECTED / TIMEOUT）

**Data Sources**:
- `/api/negotiation/{id}`
- SSE for real-time proposal updates

**Priority**: P0

---

## P1（增强页面）

---

### Page: `/topology` — Topology Screen

**Purpose**: 57 agents 实时拓扑图（大屏展示）

**Visual**:
- 紫（Audience）/ 绿（Musician）/ 橙（Venue）/ 蓝（Manager）/ 灰（System）
- 连线代表活跃 A2A 通信
- 节点大小 = 当前负载
- 脉冲动画 = 心跳

**Library**: React Flow

**Data Sources**: SSE `/api/events/stream` + `/api/agents`

**Priority**: P1

---

### Page: Concierge 浮窗（全局 Float）

**Purpose**: 右下角 AI 助手浮窗，点击激活对话

**Features**:
- 浮动按钮（始终可见）
- 展开后为 AI SDK useChat 界面
- 可查询：musician info, event status, next step suggestions

**Priority**: P1

---

## P2（后续迭代）

| 路径 | 页面 | 说明 |
|------|------|------|
| `/dashboard/audience` | Audience Profile | 观众个人中心 — 心愿历史、门票 |
| `/dashboard/musician` | Musician Profile | 音乐人个人中心 — 档期、报价、评价 |
| `/dashboard/venue` | Venue Profile | 场地方个人中心 — 场地管理、收入 |
| `/settings` | Settings | 账户设置 / 通知偏好 |
