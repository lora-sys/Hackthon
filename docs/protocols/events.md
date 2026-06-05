# Events

WishLive 全链路事件定义。所有事件通过 Redis Streams 广播。

## 事件清单

| 事件 | 来源 | 触发时机 |
|------|------|----------|
| `wish.created` | Audience Agent | 用户提交心愿 |
| `wish.withdrawn` | Audience Agent | 用户撤回心愿 |
| `wish.aggregated` | WishMaker Agent | 心愿聚合完成 |
| `demand.created` | Demand Pool Agent | 需求阈值达成，创建需求 |
| `demand.threshold_reached` | Demand Pool Agent | 需求达到 MIN_THRESHOLD=10 |
| `matching.started` | Matching Engine Agent | 开始搜索匹配 |
| `matching.completed` | Matching Engine Agent | 匹配完成，返回 Top 3 |
| `negotiation.started` | Negotiation Agent | 协商会话创建 |
| `proposal.sent` | Negotiation Agent | 提案已发送 |
| `proposal.countered` | Negotiation Agent | 反提案已发送 |
| `proposal.accepted` | Negotiation Agent | 提案被接受 |
| `proposal.rejected` | Negotiation Agent | 提案被拒绝 |
| `deal.created` | Negotiation Agent | 协商成功，创建交易 |
| `show.confirmed` | ShowConfirm Agent | 用户确认演出 |
| `show.rejected` | ShowConfirm Agent | 用户拒绝演出 |
| `escrow.created` | Settlement Agent | 托管合约已创建 |
| `ticket.minted` | Settlement Agent | 门票 NFT 已铸造 |

## 事件流映射

| Redis Stream | 事件 |
|-------------|------|
| `agent.lifecycle` | agent.registered, agent.online, agent.heartbeat, agent.offline, agent.error |
| `wish.events` | wish.created, wish.withdrawn, wish.aggregated |
| `demand.events` | demand.created, demand.threshold_reached |
| `matching.events` | matching.started, matching.completed |
| `negotiation.events` | negotiation.started, proposal.sent, proposal.countered, proposal.accepted, proposal.rejected, deal.created |
| `settlement.events` | escrow.created, ticket.minted |
| `show.events` | show.confirmed, show.rejected |
