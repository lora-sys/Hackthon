# Agent Memory 系统

> 基于 Vercel AI SDK Memory 能力
> 参考: https://ai-sdk.dev/docs/agents/memory
> 自定义记忆工具: https://ai-sdk.dev/cookbook/guides/custom-memory-tool

## 选型决策

AI SDK 提供 3 种记忆方案, WishLive 选用 **Custom Tool(自定义工具)**:

| 方案 | 说明 | WishLive 决策 |
|------|------|--------------|
| Provider-Defined Tools | 调用 LLM 提供商的记忆 API | ❌ 依赖外部服务, 不可控 |
| Memory Providers | Letta/Mem0/Supermemory/Hindsight | ❌ 外部依赖, 数据可视性有限 |
| **Custom Tool** | 自建记忆工具(文件/数据库) | ✅ **选用** — 自有 PostgreSQL 做持久化, Redis 做缓存, 完全可控 |

## 架构

```
Agent (ToolLoopAgent)
    │
    ├── prepareCall()  ← 将相关记忆注入 system prompt
    │
    └── memoryTool     ← LLM 调用存储/检索/搜索/删除
            │
            └── PostgreSQL (长期存储) + Redis (缓存)
```

### prepareCall — 自动上下文注入

每个 Agent 启动时, `prepareCall` 从记忆中加载相关上下文注入 prompt:

```typescript
const agent = new ToolLoopAgent({
  model: yourModel,
  tools: { /* 技能 */ },
  maxSteps: 10,
  prepareCall: async ({ context }) => {
    const agentId = context.agentId;
    const recentEvents = await loadRecentEvents(agentId, 10);
    const activeNegotiations = await recallNegotiations(agentId);
    return `
当前 Agent: ${agentId}
最近事件: ${JSON.stringify(recentEvents)}
活跃协商: ${JSON.stringify(activeNegotiations)}
    `.trim();
  },
});
```

## 记忆工具定义

自建记忆工具通过 AI SDK `tool()` 定义, 作为 agent 技能之一注册:

```typescript
import { tool } from "@ai-sdk/core";
import { z } from "zod";

const memoryTool = tool({
  description: "Agent 记忆存储与检索工具",
  parameters: z.object({
    action: z.enum(["store", "recall", "search", "forget"]).describe("操作类型"),
    key: z.string().describe("记忆键名"),
    value: z.string().optional().describe("要存储的内容 (store 操作必需)"),
    scope: z.enum(["short", "mid", "long"]).optional().default("short"),
    ttl: z.number().optional().describe("过期秒数, 不传则使用 scope 默认值"),
  }),
  execute: async ({ action, key, value, scope, ttl }) => {
    switch (action) {
      case "store":
        return await storeMemory(scope, key, value, ttl);
      case "recall":
        return await recallMemory(scope, key);
      case "search":
        return await searchMemory(scope, key);
      case "forget":
        return await forgetMemory(scope, key);
    }
  },
});
```

## 三层存储

| 层级 | 存储引擎 | TTL | 用途 |
|------|---------|-----|------|
| **短期** | Redis | 24h | 当前会话, 临时状态 |
| **中期** | Redis | 7d | 协商流程, 提案往返 |
| **长期** | PostgreSQL | 永久 | Agent 身份, 声誉, 交易历史 |

### 存储格式

```typescript
interface MemoryRecord {
  id: string;
  agentId: string;
  scope: "short" | "mid" | "long";
  key: string;
  value: string;               // JSON stringified
  tags: string[];              // 标签(用于搜索过滤)
  traceId: string;             // 关联的追踪 ID
  sessionId: string;           // 会话 ID
  createdAt: Date;
  expiresAt?: Date;
}
```

### 键命名规范

```
# 短期/中期 (Redis)
wishlive:memory:{scope}:{agentId}:{key}
wishlive:memory:short:agent:musician:001:current_task
wishlive:memory:mid:agent:venue:002:negotiation:neg-001

# 长期 (PostgreSQL 表 memories)
SELECT * FROM memories WHERE agent_id = ? AND scope = 'long';

# 共享上下文 (Redis)
wishlive:context:{key}
wishlive:context:current_demand
```

## 记忆场景

### 协商记忆

Agent 在协商中需要记忆对方的出价历史来优化策略:

```
回合1: Venue 出价 split=20%, fee=5000
回合2: Musician 反提案 split=30%, fee=3000
回合3: Venue 接受 split=25%, fee=4000
```

Agent 调用 `memoryTool({ action: "store", key: "negotiation:neg-001:history", value: historyJSON })`,
每次新提案时 `prepareCall` 自动注入历史。

### 用户偏好

Audience Agent 存储用户偏好(如音乐类型, 城市), 用于后续推荐。

### 声誉

Agent 交易历史写入长期记忆, 匹配时作为声誉因子。

### 技能缓存

Agent 可以缓存技能执行结果, 避免重复计算。

## 与 A2A 协议的关系

| A2A 概念 | WishLive 实现 |
|---------|---------------|
| Task.history | 短期记忆(Redis) |
| 会话上下文 | 中期记忆(Redis, TTL 7d) |
| AgentCard 持久化 | 长期记忆(PostgreSQL) |
| 声誉数据 | 长期记忆 + 聚合计算 |
