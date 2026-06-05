# A2A Protocol — Agent-to-Agent 通信协议

> 基于 Google A2A (Agent-to-Agent) Protocol v1 规范
>
> 官方参考: https://a2a-protocol.org/latest/specification/
> GitHub: https://github.com/a2aproject/A2A

## 核心概念

A2A 协议围绕 `Task`（任务）构建。Agent 之间通过 `SendMessage` / `SendStreamingMessage` RPC 交换消息。

```
Agent A  ──SendMessage──→  Agent B
         ←──Task/Message──
```

## Agent Card（Agent 身份卡）

每个 Agent 发布一个 `AgentCard` JSON 用于发现和通信协商：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 人类可读的 Agent 名 |
| `description` | string | ✅ | 对人类和其他 Agent 说明用途 |
| `supported_interfaces` | AgentInterface[] | ✅ | 支持的通信接口（URL + 协议绑定） |
| `version` | string | ✅ | Agent 版本号 |
| `capabilities` | AgentCapabilities | ✅ | A2A 能力集 |
| `default_input_modes` | string[] | ✅ | 默认支持的输入媒体类型 |
| `default_output_modes` | string[] | ✅ | 默认支持的输出媒体类型 |
| `skills` | AgentSkill[] | ✅ | Agent 技能列表 |
| `provider` | AgentProvider | - | 服务提供商信息 |
| `documentation_url` | string | - | 文档链接 |
| `security_schemes` | map | - | 安全认证方案 |
| `security_requirements` | SecurityRequirement[] | - | 安全要求 |
| `signatures` | AgentCardSignature[] | - | JWS 签名 |
| `icon_url` | string | - | 图标链接 |

### AgentInterface

```json
{
  "url": "https://api.example.com/a2a/v1",
  "protocol_binding": "HTTP+JSON",
  "protocol_version": "1.0",
  "tenant": "wishlive"
}
```

### AgentCapabilities

```json
{
  "streaming": true,
  "push_notifications": false
}
```

### AgentSkill

```json
{
  "id": "check_availability",
  "name": "档期检查",
  "description": "检查音乐人在指定日期的档期可用性",
  "tags": ["availability", "schedule"],
  "examples": ["2025-07-15 是否可用？"]
}
```

## 任务 (Task)

```json
{
  "id": "task-uuid",
  "context_id": "session-uuid",
  "status": {
    "state": "WORKING",
    "message": { ... }
  },
  "artifacts": [],
  "history": [],
  "metadata": {}
}
```

### TaskState 生命周期

```
UNSPECIFIED → SUBMITTED → WORKING → COMPLETED
                              → FAILED
                              → CANCELED
```

## 消息 (Message)

```json
{
  "message_id": "msg-uuid",
  "task_id": "task-uuid",
  "role": "agent",
  "parts": [
    {
      "type": "text",
      "text": "这是个提案"
    },
    {
      "type": "data",
      "data": {
        "venueFee": 5000,
        "splitPercentage": 20
      }
    }
  ],
  "metadata": {}
}
```

## WishLive 适配说明

WishLive 使用 A2A **消息格式规范**，但通信传输层使用 **Redis Streams**（而非 HTTP/gRPC）：

| A2A 规范概念 | WishLive 实现 |
|-------------|---------------|
| AgentCard | Registry 中的 agent_card_json |
| SendMessage RPC | Redis Stream `agent.task` |
| SendStreamingMessage | Redis Stream 分块推送 |
| Task | 协商流程状态机实例 |
| Message.parts | A2A 消息信封 (type: TASK/EVENT/PROPOSAL/ACCEPT/REJECT) |

### 通信通道

```
点对点: agent.task stream (targetAgentId 路由)
广播:   各事件 stream (wish.events, demand.events, ...)
协商:   点对点 PROPOSAL ↔ COUNTER_PROPOSAL ↔ ACCEPT/REJECT
```

## 身份验证

WishLive 使用钱包签名验证消息真实性，不依赖特定 DID 解析服务（hackathon 简化）。

### 签名算法

采用 EIP-191 `personal_sign` 格式：

```
signed_data = keccak256(abi.encodePacked(
    "\x19Ethereum Signed Message:\n" + len(message),
    message
))
```

其中 `message` 为待签名的消息内容（不包含信封元数据）。前端使用 `ethers.utils.verifyMessage` 或 `wagmi.signMessage` 签名。

### 签名内容

每条 A2A 消息签名以下字段：

```
signPayload = {
  messageId,
  from,
  to,
  type,
  timestamp,
  payloadHash: keccak256(JSON.stringify(payload))
}
```

签名结果放在 `MessageEnvelope.signature` 字段：

```json
{
  "messageId": "msg-uuid",
  "from": "agent:musician:001",
  "to": "agent:venue:002",
  "type": "PROPOSAL",
  "timestamp": "2025-06-02T12:00:00Z",
  "payload": { "venueFee": 5000 },
  "signature": "0x..."
}
```

### 验签流程

```
接收消息
    │
    ├── 提取 messageId, from, to, type, timestamp, payload
    │
    ├── 计算 payloadHash = keccak256(JSON.stringify(payload))
    │
    ├── 组装 signPayload = { messageId, from, to, type, timestamp, payloadHash }
    │
    ├── 序列化 signPayloadStr = JSON.stringify(signPayload)
    │
    ├── Node.js: ethers.utils.verifyMessage(signPayloadStr, signature) → 签名者地址
    │   (ethers 自动处理 \x19Ethereum Signed Message 前缀 + keccak256)
    │
    ├── Registry lookup: 签名者地址 == from 的 wallet_address ?
    │       │
    │       ├── 匹配 → 消息合法
    │       └── 不匹配 → 拒绝消息
    │
    └── 检查 messageId 是否已处理 (replay protection)
```

可选链上验证：

```solidity
// Solidity 验签 (需手动拼接 personal_sign 前缀)
bytes memory prefix = "\x19Ethereum Signed Message:\n";
bytes memory message = bytes(signPayloadStr);
bytes32 hash = keccak256(abi.encodePacked(prefix, uintToString(message.length), message));
address signer = ecrecover(hash, v, r, s);
require(signer == agentWallet, "Invalid signature");
```

### 身份绑定

```
用户钱包地址
    │
    ├── Agent 注册时绑定: agents.wallet_address = 钱包地址
    │
    ├── AgentCard 的 did = "did:wishlive:{wallet_address}"
    │
    ├── AgentCard hash 在 AgentProfile 合约存证
    │
    └── 消息验签时: ecrecover 出地址 → 对比 agents.wallet_address
```

### 种子 Agent

种子 agent（非深度协商的 54 个）使用预置的 DID 和 wallet 注册。它们只参与心跳，不发送 A2A 消息，因此不需要主动签名。Registry 启动时通过 seed 数据加载它们的公钥用于心跳格式校验。
