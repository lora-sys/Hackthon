# Smart Contracts

> ⛔ 已冻结。Claude Code 禁止创建不在本清单中的合约。

---

## Contract #1 — AgentProfile.sol

| 属性 | 值 |
|------|-----|
| **purpose** | Agent 链上身份 |
| **status** | ✅ 已认定 |
| **dependency** | 无（独立合约） |

**Functions**:
- `registerAgent(wallet, agentCardHash, did) → agentId`
- `getAgent(agentId) → (wallet, agentCardHash, did, registeredAt)`
- `updateMetadata(agentId, newCardHash)`
- `verifyCard(wallet, agentCardHash) → bool`

---

## Contract #2 — Escrow.sol

| 属性 | 值 |
|------|-----|
| **purpose** | 资金托管 + 自动分账 |
| **status** | ✅ 已认定 |
| **dependency** | 无（独立合约） |

**Functions**:
- `createEscrow(dealId, payees, shares) → escrowId` (payable)
- `releaseFunds(escrowId, signature)` — 人工确认后释放
- `refund(escrowId)` — 流程失败后退款
- `getEscrow(escrowId) → (payees, balance, status)`

**Status**: `PENDING → RELEASED / REFUNDED`

---

## Contract #3 — TicketNFT.sol

| 属性 | 值 |
|------|-----|
| **purpose** | 门票 ERC-721 |
| **status** | ✅ 已认定 |
| **dependency** | 无（独立合约） |

**Functions**:
- `mint(to, dealId, metadataUri) → tokenId`
- `burn(tokenId)`
- `tokenURI(tokenId) → string`
- `getTicketDeal(tokenId) → dealId`

---

## 合约关系

```
AgentProfile ←── Agent Registration
                      │
                      ▼
                 Escrow ←── Deal Created（ShowConfirm 触发）
                      │
                      ▼
               TicketNFT ←── Settlement 自动铸造
```

## 禁止创建

以下合约类型不要写：

| 不要写 | 原因 |
|--------|------|
| WishPool | 需求池逻辑在链下完成 |
| Governance Token | hackathon 不需要代币 |
| Staking | 超出范围 |
| Marketplace | 超出范围 |
