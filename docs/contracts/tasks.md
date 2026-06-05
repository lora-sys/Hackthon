# Contract Development Tasks

> Claude Code 操作合约时，按此清单。每个合约只完成列出的函数。

---

## Contract #1: AgentProfile.sol

### Tasks

| # | 函数 | 状态 | 说明 |
|---|------|------|------|
| 1.1 | `registerAgent` | ✅ 完成 | 注册 Agent 身份 |
| 1.2 | `getAgent` | ✅ 完成 | 查询 Agent 信息 |
| 1.3 | `updateMetadata` | ✅ 完成 | 更新 Agent Card Hash |
| 1.4 | `verifyCard` | ✅ 完成 | 验证 Agent 真实性 |

---

## Contract #2: Escrow.sol

### Tasks

| # | 函数 | 状态 | 说明 |
|---|------|------|------|
| 2.1 | `createEscrow` | ✅ 完成 | 创建资金托管（payable） |
| 2.2 | `releaseFunds` | ✅ 完成 | 人工确认后释放资金 |
| 2.3 | `refund` | ✅ 完成 | 流程失败退款 |
| 2.4 | `getEscrow` | ✅ 完成 | 查询托管状态 |
| 2.5 | Events | ✅ 完成 | `EscrowCreated`, `FundsReleased`, `Refunded` |

---

## Contract #3: TicketNFT.sol

### Tasks

| # | 函数 | 状态 | 说明 |
|---|------|------|------|
| 3.1 | `mint` | ✅ 完成 | 铸造门票 NFT |
| 3.2 | `burn` | ✅ 完成 | 销毁门票 |
| 3.3 | `tokenURI` | ✅ 完成 | 元数据 URI |
| 3.4 | `getTicketDeal` | ✅ 完成 | 查询门票对应交易 |
| 3.5 | `supportsInterface` | ✅ 完成 | ERC-721 接口标识 |

---

## 测试清单

| # | 测试 | 合约 | 状态 |
|---|------|------|------|
| T1 | 注册 Agent → 查询验证 | AgentProfile | ✅ |
| T2 | 创建 Escrow → 存入资金 | Escrow | ✅ |
| T3 | 确认释放 → 资金按分成分配 | Escrow | ✅ |
| T4 | 退款 → 资金原路返回 | Escrow | ✅ |
| T5 | mint → tokenURI → burn | TicketNFT | ✅ |
| T6 | 完整流程：注册 → 托管 → 确认 → mint | 全部 | ✅ |
