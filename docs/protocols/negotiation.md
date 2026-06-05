# 协商协议

## 协商对象

```typescript
interface Proposal {
  id: string;
  negotiationId: string;
  senderAgentId: string;
  type: "INITIAL" | "COUNTER";
  venueFee: number;       // 场地费 (USDT)
  splitPercentage: number; // 收入分成 %
  schedule: {
    date: string;          // 日期
    startTime: string;     // 开始时间
    endTime: string;       // 结束时间
  };
  payload: Record<string, unknown>;
  createdAt: number;
}

interface Deal {
  id: string;
  negotiationId: string;
  proposalId: string;
  musicianAgentId: string;
  venueAgentId: string;
  terms: {
    venueFee: number;
    splitPercentage: number;
    schedule: { date: string; startTime: string; endTime: string };
  };
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "FAILED";
  createdAt: number;
}
```

## 协商流程

```
Proposal.sent (Musician → Venue)
    ↓
CounterProposal OR Accept OR Reject (Venue → Musician)
    ↓
CounterProposal OR Accept OR Reject (Musician → Venue)
    ↓
... 循环直到 Accept / Reject / Timeout
    ↓
Deal.created
```

## A2A 映射

WishLive 协商基于 A2A Task 模式：

| A2A Task State | WishLive 协商状态 |
|----------------|-------------------|
| SUBMITTED | 协商开始 (negotiation.started) |
| WORKING | 提案往返 (proposal.sent ↔ counterproposal.sent) |
| COMPLETED | 成交 (deal.created) |
| FAILED | 协商失败 |

## 协商议题

- **Revenue Split** — 收入分成比例
- **Venue Fee** — 场地费
- **Schedule** — 时间安排

## 结果

- **成功**: Deal created → 进入 Human Confirmation
- **失败**: 通知所有相关方，释放资源
