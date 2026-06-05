# Observability — 可观测性架构

> WishLive 的可观测性分为两层：**Redis Streams** 追踪业务事件，**Langfuse** 追踪 AI 推理过程。
>
> 参考：AI SDK [Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry) · [Langfuse Integration](https://ai-sdk.dev/providers/observability/langfuse)

---

## 架构总览

```
AI SDK (ToolLoopAgent)
    ↓ 自动生成 Trace
OpenTelemetry
    ↓ 导出
Langfuse (Trace Viewer + Analytics)
    ↓ 展示
Dashboard (可观测面板)
```

**并行层（从第一天就跑的数据流）：**
```
Redis Streams (Business Events)
    ↓
Topology / Dashboard / Negotiation Timeline
```

## 两层职责

### Redis Streams — Business Event

追踪 Agent 之间的业务流程事件，用于实时拓扑和 Dashboard。

```json
{
  "type": "wish.created",
  "source": "agent:audience:001",
  "data": { "genre": "rock", "city": "shanghai" }
}
```

**用于**: Topology 图、Dashboard 事件流、协商时间线

### Langfuse — AI Event (新增)

追踪 Agent 的 AI 推理过程，用于调试和评审演示。

| 数据 | 说明 |
|------|------|
| Prompt | 每个 Agent 接收到的 system prompt + user message |
| Tool Call | Agent 调用的技能（Registry search, send proposal 等） |
| Token | 每次 LLM 调用的输入/输出 token 数 |
| Cost | 每次 LLM 调用的估算成本 |
| Latency | 每次 LLM 调用的响应时间 |
| Model | 使用的模型（Claude Sonnet 4.5 / GPT-4o 等） |

**用于**: 评审调试、Prompt 分析、Token 用量追踪、性能调优

> 不要自己做 Prompt Log / Token Log / Cost Log —— Langfuse 已经全部做好。

---

## Trace 字段规范

每个 Agent 的 AI SDK 调用必须携带以下自定义属性，确保 Langfuse 中可追溯：

| 字段 | 值示例 | 用途 |
|-----------|--------|------|
| `agent_id` | `musician_07` | 按 agent 个体筛选 |
| `agent_type` | `musician` | 按角色类型筛选 |
| `workflow_id` | `wf_123` | 按业务流程追溯 |
| `conversation_id` | `nego_88` | 按协商会话追溯 |
| `deal_id` | `deal_uuid` | 按成交交易追溯 |

Langfuse 中搜索 `nego_88` 即可看到完整链路：

```
Demand Agent → Matching Agent → Musician Agent → Venue Agent → Settlement Agent
```

### 代码示例

```typescript
const result = await generateText({
  model: yourModel,
  system: "Find best musician for rock concert",
  prompt: `Genre: rock, city: shanghai`,
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agent_id: "matching_engine_01",
      agent_type: "matching",
      workflow_id: "wf_123",
      conversation_id: "nego_88",
    },
  },
});
```

---

## Langfuse 集成

### 安装

```bash
npm install @langfuse/vercel-ai-sdk
```

### 配置 (`instrumentation.ts`)

```typescript
import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel-ai-sdk";

export function register() {
  registerOTel({
    serviceName: "wishlive",
    attributes: { env: process.env.NODE_ENV },
    exporters: [new LangfuseExporter({
      // LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_HOST
    })],
  });
}
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `LANGFUSE_PUBLIC_KEY` | Langfuse 公钥 |
| `LANGFUSE_SECRET_KEY` | Langfuse 密钥 |
| `LANGFUSE_HOST` | Langfuse 服务器地址（自部署）或 https://cloud.langfuse.com |

---

## 与工程体系的关系

```
Redis Streams  = 业务事件的真相来源
Langfuse      = AI 推理的真相来源
OpenTelemetry = 两者之间的传输标准
```

对于 hackathon：**AI SDK Telemetry + Langfuse** 完全够用，不需要自建任何日志系统。
