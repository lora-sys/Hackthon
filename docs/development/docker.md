# Docker Infrastructure

This is the first WishLive development step: run local infrastructure only.

It starts:

- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`
- Hardhat Localnet on `localhost:8545` with chain ID `31337`

It does not start the Agent runtime, seed 57 agents, create database tables, deploy contracts, or run business workflows.

## Setup

```bash
cp .env.example .env
docker compose up -d
```

Or use the helper:

```bash
./scripts/start.sh up
```

The first Hardhat run builds a small Node image and installs `hardhat@2.22.19`.

## Health Checks

```bash
docker compose config
docker compose ps
```

PostgreSQL:

```bash
docker compose exec postgres pg_isready -U wishlive
```

Redis:

```bash
docker compose exec redis redis-cli ping
```

Hardhat:

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  http://localhost:8545
```

Expected Hardhat chain ID is `0x7a69`, which is decimal `31337`.

## Logs

```bash
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f hardhat
```

All logs:

```bash
docker compose logs -f
```

## Stop

```bash
docker compose down
```

Or:

```bash
./scripts/stop.sh
```

## Reset Data

This removes Docker Compose volumes for PostgreSQL, Redis, and Hardhat cache.

```bash
docker compose down -v
docker compose up -d
```

Or:

```bash
./scripts/reset.sh
```
