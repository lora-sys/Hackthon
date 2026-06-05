#!/usr/bin/env bash
# WishLive 开发环境启动脚本
# 用法: ./scripts/start.sh [up|down|logs|reset|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
  if ! command -v docker &> /dev/null; then
    error "Docker 未安装. 请先安装 Docker: https://docs.docker.com/"
    exit 1
  fi
  if ! docker compose version &> /dev/null 2>&1; then
    error "Docker Compose 版本过低. 请升级."
    exit 1
  fi
}

check_env() {
  if [ ! -f .env ]; then
    warn ".env 不存在，从 .env.example 创建默认配置..."
    cp .env.example .env
    info ".env 已创建"
  fi
}

case "${1:-up}" in
  up)
    check_docker
    check_env

    info "启动 PostgreSQL + Redis + Hardhat Localnet..."
    docker compose up -d

    info "等待 PostgreSQL..."
    until docker compose exec postgres pg_isready -U wishlive &>/dev/null 2>&1; do
      sleep 1
    done
    info "PostgreSQL 就绪 ✅"

    info "等待 Redis..."
    until docker compose exec redis redis-cli ping &>/dev/null 2>&1; do
      sleep 1
    done
    info "Redis 就绪 ✅"

    info "等待 Hardhat Localnet..."
    until curl -fsS -X POST \
      -H "Content-Type: application/json" \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      http://localhost:8545 &>/dev/null; do
      sleep 1
    done
    info "Hardhat Localnet 就绪 ✅"

    echo ""
    echo "  PostgreSQL    :5432  | 数据卷: postgres_data"
    echo "  Redis         :6379  | 数据卷: redis_data"
    echo "  Hardhat RPC   :8545  | chainId: 31337"
    echo ""
    echo "  ./scripts/start.sh down   停止服务"
    echo "  ./scripts/start.sh logs   查看日志"
    echo "  ./scripts/start.sh reset  清除数据"
    echo "  ./scripts/start.sh status 查看状态"
    echo ""
    ;;

  down)
    info "停止服务..."
    docker compose down
    info "已停止 ✅"
    ;;

  logs)
    shift
    docker compose logs -f "$@"
    ;;

  reset)
    warn "将清除所有数据 (postgres_data + redis_data)！"
    read -p "确认? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      docker compose down -v
      info "已清除 ✅"
      info "运行 ./scripts/start.sh up 重新启动"
    else
      info "已取消"
    fi
    ;;

  status)
    info "容器状态:"
    docker compose ps 2>/dev/null || echo "  未运行"
    echo ""
    info "卷:"
    docker volume ls | grep -E "wishlive|postgres|redis" 2>/dev/null || echo "  无"
    ;;

  *)
    echo "用法: $0 [up|down|logs|reset|status]"
    echo ""
    echo "  up      启动 PostgreSQL + Redis + Hardhat (默认)"
    echo "  down    停止服务"
    echo "  logs    查看日志"
    echo "  reset   清除数据并重建"
    echo "  status  查看状态"
    ;;
esac
