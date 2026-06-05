# TASKS.md

## 优先级总览

**P0（核心，必须完成）**
1. Agent Onboarding（用户注册 → Agent Card）
2. Agent Registry
3. Agent Runtime（BaseAgent + State Machine + Memory + Skills）
4. Demand Agent（心愿 → 需求聚合）
5. Matching Engine（Registry 搜索 + 评分）
6. Negotiation Agent（A2A 提案/反提案）
7. Settlement Agent（Escrow + Ticket NFT）
8. Topology Dashboard（57 agents 实时拓扑）
9. **Observability（可观测性）**
   ● Agent Trace visible in Langfuse
   ● Workflow Trace visible
   ● Tool Calls visible
   ● Token Cost visible
   ● Redis Events visible in Dashboard

**P1（演示必备）**
1. Concierge Agent（浮窗 AI 助手）
2. Identity On-chain（AgentCard hash 上链存证）
3. 57 agents 种子数据 + 心跳
4. Human Confirmation（确认 → 资金释放）

**P2（后续迭代）**
1. 角色个人中心（Audience/Musician/Venue Profile）
2. WishPool 合约
3. ShowContract + Distribution 合入 Escrow

---

# DAY 1 — 基础设施 + 可视化

策略：前端后端两端同时建，每天都有可演示产出。

---

## 上午 · Agent Runtime + Landing

### M1 Agent Runtime (后端)
Deliverables
* BaseAgent (ToolLoopAgent 基类)
* Agent State Machine (生命周期: CREATED → REGISTERED → ONLINE → BUSY → ...)
* Agent Memory (AI SDK Custom Tool: store/recall/search/forget)
* Agent Skills (tool() 定义)

Acceptance
* Agent 启动、注册、心跳可见

### F1 Landing Page + Agent Onboarding (前端)
Deliverables
* Landing Page: 品牌展示 + 引导注册/许愿
* Agent 创建页: 注册成为 Audienec/Musician/Venue → 填写信息 → 生成 Agent Card
* Agent Card 预览: 创建后看到自己的 Agent Card JSON

Acceptance
* 用户能注册三种角色，表单数据映射到 Agent Card

---

## 下午 · Registry + Topology + 57 种子 Agents + 身份上链

### M2 Registry (后端)
Deliverables
* Register API (含 Agent Card 注册)
* Search API (按 genre/city/capacity 搜索)
* Heartbeat API
* 57 影子 Agent 启动脚本
* AgentProfile 合约 (DID + wallet + AgentCard hash 上链)

Acceptance
* 57 agents 在 Registry 可见，有心跳
* AgentCard hash 已在区块链存证

### F2 Topology Dashboard (前端)
Deliverables
* 实时 Agent 拓扑图 (57 agents 动态显示)
* Agent 卡片详情弹窗
* 心跳状态颜色标记 (ONLINE 绿色 / BUSY 黄色 / OFFLINE 灰色)

Acceptance
* 57 agents 在拓扑图上跳动，评审可见

---

## 傍晚 · Wish 表单 + 身份上链展示

### M3 Wish + Demand (后端)
Deliverables
* Wish CRUD API
* Demand 聚合逻辑 (阈值 MIN_THRESHOLD=10)
* 事件发布: wish.created → demand.created

Acceptance
* 提交心愿 → 触发需求聚合

### F3 Wish Pool (前端)
Deliverables
* 许愿提交表单: 艺人/风格/城市/日期/押金
* 心愿列表: 显示所有活跃心愿
* Agent 认证展示: "你的身份已上链 ✓"

Acceptance
* 用户能提交、浏览心愿，状态实时更新

---

# DAY 2 — 核心业务流

---

## 上午 · Matching + Negotiation

### M4 Matching Agent (后端)
Deliverables
* 搜索 musician + venue (Registry 查询)
* 评分排序 (Genre 40% + Location 30% + Availability 20% + Reputation 10%)
* Top 3 候选返回

Acceptance
* Demand 生成后 → Matching 完成 → 候选返回

### M5 Negotiation Engine (后端)
Deliverables
* Proposal / CounterProposal / Accept / Reject
* 协商状态机
* A2A 消息路由 (Redis Streams agent.task)

Acceptance
* Musician ↔ Venue 完成一轮协商，生成 Deal

---

## 下午 · Negotiation Panel + Dashboard

### F4 Negotiation Panel (前端)
Deliverables
* 协商实时可视化: 提案 + 反提案 + 接受/拒绝
* A2A 消息流展示
* 协商历史时间线

Acceptance
* 评审能看到两个 Agent 实时协商

### F5 Dashboard (前端)
Deliverables
* 用户总览: 心愿/需求/协商/门票状态
* 角色切换: Audienec / Musician / Venue 视图
* 事件流日志

Acceptance
* 用户可跟踪自己的全流程状态

---

## 傍晚 · Deal → Settlement 准备

### M6 Settlement Agent (后端)
Deliverables
* Escrow 创建逻辑
* 资金释放逻辑
* Ticket NFT 铸造逻辑

Acceptance
* Deal created → Escrow created → Human Confirmation 触发

---

# DAY 3 — 上链 + Concierge + 可观测性 + 演示

---

## 上午 · 全链路连接 + Concierge

### M7 Concierge Agent (后端)
Deliverables
* explain_status: 系统状态自然语言解释
* explain_failure: 失败原因解释
* suggest_next_step: 下一步建议

Acceptance
* 用户问"现在什么情况"，AI 回答

### M8 全链路打通 (后端)
Deliverables
* 整条链路: Wish → Demand → Matching → Negotiation → Deal → Human Confirm → Escrow → Ticket NFT
* Redis Event Bus 全流验证
* 57 agents 全流程心跳

Acceptance
* 端到端: 提交心愿 → 拿到门票 NFT

### M9 Observability (后端)
Deliverables
* AI SDK Telemetry 开启 (`experimental_telemetry`)
* Langfuse 集成 (`instrumentation.ts`)
* 每个 Agent Trace 携带: agent_id, agent_type, workflow_id, conversation_id, deal_id

Acceptance
* Agent Trace -> Langfuse 可见
* Workflow Trace 可见
* Tool Calls 可见
* Token / Cost 可见
* Redis Events -> Dashboard 可见

---

## 下午 · 打磨 + 演示

### F6 Concierge UI + 演讲准备
Deliverables
* Concierge 对话界面 (AI SDK UI useChat + AI Elements)
* 57 在线 agent 演示环境
* 演讲 Slide / 演示脚本

Acceptance
* 5 分钟端到端演示: 提交心愿 → 57 agents 拓扑 → 协商 → 确认 → 门票到手
