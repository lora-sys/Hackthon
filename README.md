# WishLive

WishLive is an Agent Native Marketplace for live music creation. Audience wishes are aggregated into demand, A2A agents discover musicians and venues, negotiate show terms, wait for human confirmation, and settle through AgentProfile, Escrow, and TicketNFT contracts.

## Demo Flow

1. Open `/` and choose a role.
2. Complete `/create-agent?role=audience`, `/create-agent?role=musician`, or `/create-agent?role=venue`.
3. Audience enters `/wish-pool` and submits one wish.
4. WishMaker and DemandPool aggregate the cohort to threshold 10.
5. `/demand-pool/[id]` shows demand score, agent analysis, Top 3 musician agents, and Top 3 venue agents.
6. `/negotiation/[id]` shows the A2A room with Musician, Venue, Negotiation, and ShowConfirm agents.
7. `/show-confirmed/[id]` confirms the show and triggers Escrow release plus TicketNFT mint.
8. `/dashboard`, `/topology`, and `/my-agent` show the live event stream, topology, inbox, tool calls, deals, and tickets.

## Local Run

```bash
docker compose up -d
npx pnpm@9.15.4 install
npx pnpm@9.15.4 --filter @wishlive/contracts build
npx pnpm@9.15.4 --filter @wishlive/frontend dev
```

Open `http://localhost:3000`.

## AI, Langfuse, And Wallet Env

Copy `.env.example` to `.env`. Real secrets stay local.

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=

LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=

NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
AGENT_PROFILE_ADDRESS=
ESCROW_ADDRESS=
TICKET_NFT_ADDRESS=
```

If OpenAI config is present, runtime sessions use the model path. If it is absent, events are marked simulated so the UI does not pretend to be real AI.

## Sepolia Deploy

The frozen ETH hackathon contracts are:

- `AgentProfile.sol`
- `Escrow.sol`
- `TicketNFT.sol`

Add these to `.env`:

```bash
SEPOLIA_RPC_URL=https://...
DEPLOYER_PRIVATE_KEY=0x...
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=$SEPOLIA_RPC_URL
```

Deploy:

```bash
npx pnpm@9.15.4 --filter @wishlive/contracts build
npx pnpm@9.15.4 --filter @wishlive/contracts deploy:sepolia
```

Copy the printed addresses into `.env`:

```bash
AGENT_PROFILE_ADDRESS=0x...
ESCROW_ADDRESS=0x...
TICKET_NFT_ADDRESS=0x...
```

## Validation

```bash
npx pnpm@9.15.4 --filter @wishlive/frontend lint
npx pnpm@9.15.4 --filter @wishlive/frontend typecheck
npx pnpm@9.15.4 --filter @wishlive/frontend test
npx pnpm@9.15.4 --filter @wishlive/frontend build
npx pnpm@9.15.4 --filter @wishlive/contracts test
```

Browser acceptance must cover `/`, `/create-agent`, `/wish-pool`, `/demand-pool/[id]`, `/negotiation/[id]`, `/show-confirmed/[id]`, `/my-agent`, `/dashboard`, and `/topology`.
