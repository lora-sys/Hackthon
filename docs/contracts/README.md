# Smart Contract Architecture

## Tech Stack

| 层 | 技术 | 用途 |
|----|------|------|
| 语言 | Solidity ^0.8.x | 智能合约编写 |
| 框架 | Hardhat | 编译 / 测试 / 部署 |
| 链环境 | Hardhat Localnet | 本地开发者网络 |
| 客户端 | viem + wagmi | 前端合约交互 |

## Contracts

### AgentProfile.sol ✅ 独立

Agent 身份存证。

```
registerAgent(wallet, agentCardHash, did) → agentId
getAgent(agentId) → (wallet, agentCardHash, did, registeredAt)
verifyCard(wallet, agentCardHash) → bool
```

### WishPool.sol ⚠️ 可合并到 off-chain

需求池登记（人数统计）。

```
createPool(demandId, threshold, depositAmount) → poolId
joinPool(poolId, participant)
getPoolCount(poolId) → count
```

### Escrow.sol ✅ 独立（含 ShowContract + Distribution）

资金托管 + 演出确认 + 自动分账。

```
createEscrow(dealId, showId, payees, shares) → escrowId (payable)
confirmRelease(escrowId, signature)
getEscrow(escrowId) → (payees, balance, status)
// EscrowStatus: PENDING | RELEASED | REFUNDED
```

### TicketNFT.sol ✅ 独立

事件门票 ERC-721。

```
mintTicket(to, dealId, metadataUri) → tokenId
getTicketDeal(tokenId) → dealId
```

## Deployment

```bash
npx hardhat node                # 启动本地链（端口 8545）
npx hardhat run scripts/deploy.ts --network localhost
```

## Contract Interaction Flow

```
Agent注册 → AgentProfile.registerAgent()
需求聚合 → WishPool.createPool()
交易创建 → Escrow.createEscrow()
人工确认 → Escrow.confirmRelease()
门票铸造 → TicketNFT.mintTicket()
```
