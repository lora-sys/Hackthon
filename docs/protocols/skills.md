# Skills

统一的技能定义规范。所有 Agent 技能使用此结构注册和调用。

## Schema

```yaml
skill_id: "check_availability"
name: "档期检查"
description: "检查音乐人在指定日期的档期可用性"
input_schema:
  type: object
  properties:
    date:
      type: string
      format: date
  required: ["date"]
output_schema:
  type: object
  properties:
    available:
      type: boolean
    slots:
      type: array
      items:
        type: string
required_tools: []
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skill_id` | string | ✅ | 技能唯一标识 |
| `name` | string | ✅ | 技能名称 |
| `description` | string | ✅ | 技能描述 |
| `input_schema` | object | ✅ | JSON Schema 输入 |
| `output_schema` | object | ✅ | JSON Schema 输出 |
| `required_tools` | string[] | - | 依赖的外部工具 ID |

## 实现方式

技能基于 Vercel AI SDK `tool()` 定义：

```typescript
const checkAvailability = tool({
  description: "检查音乐人档期",
  parameters: z.object({ date: z.string() }),
  execute: async ({ date }) => {
    return { available: true, slots: ["18:00", "20:00"] };
  },
});
```

## Registered Skills

| Skill | Owner | Description |
|-------|-------|-------------|
| `submit_wish` | Audience Agent | 提交心愿 |
| `withdraw_wish` | Audience Agent | 撤回心愿 |
| `confirm_show` | Audience Agent | 确认演出 |
| `check_availability` | Musician Agent | 检查档期 |
| `propose_offer` | Musician Agent | 发起报价 |
| `counter_offer` | Musician Agent | 反提案 |
| `accept_offer` | Musician Agent | 接受报价 |
| `reject_offer` | Musician Agent | 拒绝报价 |
| `check_capacity` | Venue Agent | 检查容量 |
| `quote_price` | Venue Agent | 报价 |
| `manage_musicians` | Musician Manager | 乐手管理 |
| `manage_venues` | Venue Manager | 场地管理 |
| `create_event` | Organizer Agent | 创建活动 |
| `guide_wallet_connect` | Onboarding Agent | 引导钱包 |
| `guide_agent_creation` | Onboarding Agent | 引导创建 Agent |
| `explain_status` | Concierge Agent | 解释状态 |
| `suggest_next_step` | Concierge Agent | 建议下一步 |
| `aggregate_wishes` | Demand Pool Agent | 聚合心愿 |
| `check_threshold` | Demand Pool Agent | 检测阈值 |
| `find_musicians` | Matching Engine Agent | 搜索乐手 |
| `find_venues` | Matching Engine Agent | 搜索场地 |
| `rank_candidates` | Matching Engine Agent | 评分排序 |
| `create_negotiation` | Negotiation Agent | 创建协商 |
| `route_proposal` | Negotiation Agent | 路由提案 |
| `create_escrow` | Settlement Agent | 创建托管 |
| `release_funds` | Settlement Agent | 释放资金 |
| `mint_ticket` | Settlement Agent | 铸造门票 |
| `notify_user` | ShowConfirm Agent | 通知用户 |
