# Message Envelope

统一的 A2A 消息信封格式，所有 Agent 间通信使用此结构。

> 架构模式来自 OpenCode 的 Task/Message 定义。
> 传输层使用 Redis Streams（非 HTTP/gRPC）。

## 结构

```json
{
  "id": "msg-a1b2c3d4",
  "workflowId": "wf-123",
  "conversationId": "conv:musician:001-venue:002",

  "sender": "agent:musician:001",
  "receiver": "agent:venue:002",

  "type": "PROPOSAL",

  "payload": {
    "venueFee": 5000,
    "splitPercentage": 20,
    "schedule": {
      "date": "2025-07-15",
      "startTime": "19:00",
      "endTime": "23:00"
    }
  },

  "timestamp": "2025-07-10T08:00:00Z"
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 消息唯一标识 (UUID) |
| `workflowId` | string | ✅ | 所属流程 ID |
| `conversationId` | string | ✅ | 会话/协商 ID |
| `sender` | string | ✅ | 发送方 agentId |
| `receiver` | string | ✅ | 接收方 agentId |
| `type` | string | ✅ | 消息类型（见下文） |
| `payload` | object | ✅ | 消息负载 |
| `timestamp` | string | ✅ | ISO 8601 时间戳 |

## 消息类型

| 类型 | 用途 |
|------|------|
| `TASK` | 委托执行技能 |
| `EVENT` | 事件通知 |
| `PROPOSAL` | 协商提案 |
| `COUNTER_PROPOSAL` | 反提案 |
| `ACCEPT` | 接受提案 |
| `REJECT` | 拒绝提案 |
| `INTERRUPT` | 中断流程 |
| `RESUME` | 恢复流程 |
| `NOTIFICATION` | 用户通知 |

## 传输层

- **点对点**: Redis Stream `agent.task`，按 `receiver` 路由
- **广播**: 各事件专用 Stream (`wish.events`, `demand.events`, 等)
