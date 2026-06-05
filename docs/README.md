# docs/ — WishLive 文档根索引

> 项目 Wiki 总入口 → [WIKI.md](../WIKI.md)
> Claude Code 工作指令 → [CLAUDE.md](../CLAUDE.md)
> 架构总蓝图 → [opencode/opencode-mapping.md](opencode/opencode-mapping.md)

---

## 文档结构

```
docs/
├── product/                         ← 产品层
│   ├── frontend/pages.md           — 前端页面清单
│   ├── frontend/tech-stack.md      — 前端技术栈（已冻结）
│   ├── backend/services.md         — 后端服务定义
│   ├── backend/endpoints.md        — REST 端点全集
│   ├── agents/catalog.md           — 14 种 Agent 目录
│   ├── agents/workflows.md         — Wish→Show 主流程
│   ├── contracts/contracts.md      — 3 个合约已冻结
│   ├── contracts/tasks.md          — 合约任务清单
│   └── ui/components.md            — 共享 UI 组件
│
├── architecture/                    ← 架构层
│   ├── AGENTS.md                   — Agent 拓扑定义
│   ├── DECISIONS.md                — ADR 决策记录
│   ├── CLAUDE.md                   — Claude 工作指令
│   └── runtime/runtime.md          — 运行时架构
│
├── opencode/                        ← OpenCode 映射层
│   └── opencode-mapping.md         — internal/ 包逐个映射
│
├── database/ / redis/ / api/        ← 数据/接口层
└── protocols/ / observability/      ← 协议/可观测层
```

## 快速导航

| 你要做什么 | 打开 |
|-----------|------|
| 开发前端页面 | [pages.md](frontend/pages.md) + [tech-stack.md](frontend/tech-stack.md) |
| 开发 API | [endpoints.md](backend/endpoints.md) + [services.md](backend/services.md) |
| 开发 Agent | [catalog.md](agents/catalog.md) + [workflows.md](agents/workflows.md) |
| 开发合约 | [contracts.md](contracts/contracts.md) + [tasks.md](contracts/tasks.md) |
| 复用 UI 组件 | [components.md](ui/components.md) |
| 理解架构 | [opencode-mapping.md](opencode/opencode-mapping.md) + [runtime.md](runtime/runtime.md) |
| 查事件定义 | [events.md](protocols/events.md) |
| 查数据库 | [schema.md](../database/schema.md) + [erd.md](../database/erd.md) |
