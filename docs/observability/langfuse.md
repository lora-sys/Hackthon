# Langfuse Observability

> 接入方式：https://ai-sdk.dev/providers/observability/langfuse
> AI SDK Telemetry：https://ai-sdk.dev/docs/ai-sdk-core/telemetry

---

## 架构

```
AI SDK (ToolLoopAgent)
    ↓ 自动生成 Trace (Prompt / Tool Call / Token / Cost)
OpenTelemetry
    ↓ 导出
Langfuse (Trace Viewer + Analytics)
    ↓
Dashboard
```

## 追踪维度

| 维度 | Trace 字段 | Langfuse 搜索 |
|------|----------|--------------|
| Workflow | `workflow_id` | 搜索 `wf-123` 看完整流程 |
| Agent | `agent_id`, `agent_type` | 搜索 `musician_07` 看该 Agent 所有调用 |
| Tool Call | `ai.toolCall.name` | 搜索 `check_availability` 看调用频率 |
| LLM | `ai.model`, `ai.prompt` | 查看每次调用的 Prompt / Response |
| Negotiation | `conversation_id` | 搜索 `nego_88` 看整条协商链路 |

## 接入步骤

### 1. 安装依赖

```bash
npm install @langfuse/vercel-ai-sdk @vercel/otel
```

### 2. 配置 `instrumentation.ts`

```typescript
import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel-ai-sdk";

export function register() {
  registerOTel({
    serviceName: "wishlive",
    attributes: { env: process.env.NODE_ENV },
    exporters: [new LangfuseExporter()],
  });
}
```

### 3. 环境变量

| 变量 | 说明 |
|------|------|
| `LANGFUSE_PUBLIC_KEY` | Langfuse 公钥 |
| `LANGFUSE_SECRET_KEY` | Langfuse 密钥 |
| `LANGFUSE_HOST` | Langfuse 服务器地址 |

### 4. Agent 调用时携带 Trace

```typescript
const result = await generateText({
  model: yourModel,
  prompt: "Find best musician",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agent_id: "matching_engine_01",
      agent_type: "matching",
      workflow_id: "wf-123",
      conversation_id: "nego_88",
    },
  },
});
```

## 链路示例

Langfuse 中搜索 `nego_88` 可见：

```
Demand Agent (workflow_id: wf-123)
  ↓ generateText: 聚合心愿...
  ↓ tool: check_threshold
Matching Agent (workflow_id: wf-123)
  ↓ generateText: 搜索匹配...
  ↓ tool: find_musicians → Registry
  ↓ tool: find_venues → Registry  
  ↓ tool: rank_candidates
Negotiation Agent (workflow_id: wf-123)
  ↓ generateText: 协商策略...
  ↓ tool: route_proposal → MusicianA
  ...
```

## 注意事项

- 不要自己实现 Prompt Log / Token Log / Cost Log — Langfuse 已经全部做好
- hackathon 阶段用 Langfuse Cloud 即可，不需要自部署
- 每个 Agent Trace 必须携带 `agent_id`, `agent_type`, `workflow_id`, `conversation_id`
