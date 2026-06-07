# Contracts Scaffold

This package is reserved for the three frozen WishLive contracts:

- `AgentProfile.sol`
- `Escrow.sol`
- `TicketNFT.sol`

Do not add other contracts unless `docs/contracts/contracts.md` changes.

## Sepolia Deploy

Put these values in the project root `.env`:

```bash
SEPOLIA_RPC_URL=https://...
DEPLOYER_PRIVATE_KEY=0x...
```

Then deploy:

```bash
npx pnpm@9.15.4 --filter @wishlive/contracts build
npx pnpm@9.15.4 --filter @wishlive/contracts deploy:sepolia
```

Copy the printed `AGENT_PROFILE_ADDRESS`, `ESCROW_ADDRESS`, and `TICKET_NFT_ADDRESS`
back into `.env`. Keep the private key out of git.
