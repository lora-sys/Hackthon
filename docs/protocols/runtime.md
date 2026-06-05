# Agent 运行时协议

> 基于 Vercel AI SDK 的 `ToolLoopAgent` 模式
> 参考: https://ai-sdk.dev/docs/agents.md

## Agent 模式

WishLive Agent 使用 **ToolLoopAgent** 模式——"思考→调用工具→处理结果→循环"：

```
LLM "think"  →  工具调用  →  结果处理  →  (循环直到完成)
```

```typescript
import { ToolLoopAgent } from "@ai-sdk/agent";

const agent = new ToolLoopAgent({
  model: yourModel,
  tools: {
    check_availability: checkAvailabilityTool,
    propose_offer: proposeOfferTool,
    check_capacity: checkCapacityTool,
  },
  maxSteps: 10,
  onStepFinish: async ({ text, toolResults }) => {
    // 记录每个步骤的输出
    console.log(`Step result: ${text}`);
  },
});
```

## BaseAgent 接口

```typescript
interface BaseAgent {
  // 生命周期
  onCreate(): Promise<void>;
  onRegister(): Promise<void>;
  onOnline(): Promise<void>;
  onBusy(): Promise<void>;
  onWaitingConfirmation(): Promise<void>;
  onCompleted(): Promise<void>;
  onOffline(): Promise<void>;
  onError(error: Error): Promise<void>;

  // 技能（暴露为 AI SDK Tools）
  executeSkill(skillName: string, params: unknown): Promise<unknown>;

  // A2A 通信
  sendMessage(message: A2AMessage): Promise<void>;
  onMessage(message: A2AMessage): Promise<void>;

  // 记忆
  remember(key: string, value: unknown): Promise<void>;
  recall(key: string): Promise<unknown>;

  // 事件
  emit(event: Event): Promise<void>;
  onEvent(event: Event): Promise<void>;
}
```

## AI SDK Workflow Patterns

> 参考：https://ai-sdk.dev/docs/agents/workflows

AI SDK Workflow Patterns 是 **5 个纯 TypeScript 代码模式**，不是独立运行时引擎。
每个模式就是一个普通 TypeScript 函数，跑在 Node.js 进程里，**没有状态持久化 / 暂停 / 恢复**。

WishLive 的编排靠 **Redis Streams 事件驱动**，Workflow Patterns 只用于 agent **内部**的代码结构组织。

### 5 种模式在 WishLive 的映射

| 模式 | 实现方式 | WishLive 使用场景 |
|------|---------|----------------|
| **Sequential** | 函数串行 `stepA() → stepB()` | WishMaker → DemandPool → Matching 流水线 |
| **Routing** | `if/else` 按上一步结果分流 | Negotiation Agent 判断 accept/reject/timeout |
| **Parallel** | `Promise.all()` 并发 | Matching Agent 同时搜 musician + venue |
| **Orchestrator-Worker** | 主 agent 拆任务给子 agent | 暂不适用 |
| **Evaluator-Optimizer** | 生成→评估→改进循环 | Concierge Agent 改进回答质量 |

### WishLive 的运行时架构

```
事件驱动 (Redis Streams)   ← 真正的"编排层"（跨 agent 协调）
    ↓
每个 Agent 内部 ToolLoopAgent  ← AI SDK agent loop（思考→工具→循环）
    ↓
Agent 决策逻辑 (Workflow Patterns)  ← 5 个代码模式，辅助决策
```

### 各环节实际用的协调方式

| 环节 | 协调方式 | Workflow Pattern? |
|------|---------|-------------------|
| 跨 57 agent 通信 | Redis Streams 事件 | ❌ |
| Matching 搜 musician+venue | 并行 `searchRegistry()` | ✅ Parallel |
| Negotiation 判断提案 | Routing：accept/reject/timeout | ✅ Routing |
| 全流水线（心愿→门票） | 事件链，每个 agent 监听+emit | ❌ 事件解耦 |
| 人工确认等待 | event → wait → user confirm → event | ❌ 事件驱动 |
| 57 agent 心跳循环 | 独立 Timer 30s | ❌ |

### 性能考量

57 个 ToolLoopAgent 跑在单个 Node.js 进程：

- **3 个深度协商 agent**：需要 LLM 推理（多轮 Proposal↔CounterProposal）
- **54 个轻量 agent**：maxSteps=2（少量 LLM 调用 + 直接返回）

瓶颈不在 Node.js 进程数，在 LLM API 的 TPS。hackathon 规模完全无压力。

> 不要把 Workflow Patterns 当分布式中介引擎用—Redis Streams 才是。
> Workflow Patterns 只在你写一个 agent 内部逻辑时，帮你组织代码结构（顺序判断、并行搜索、条件路由）。

## 安装

```bash
# 安装 AI SDK 技能（让 AI 编码工具理解 AI SDK）
npx skills add vercel/ai
```
