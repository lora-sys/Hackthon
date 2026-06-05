#!/usr/bin/env bash
# 重置开发环境（清除所有数据）

echo "Resetting development environment..."

# 停止并删除容器和卷
docker compose down -v

# 重新启动
docker compose up -d

echo "Environment reset complete."
