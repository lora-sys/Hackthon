# UI Components

> 共享 UI 组件清单。Claude Code 开发页面时，优先复用已列组件，禁止为每个页面重写。

---

## P0 — 核心组件

### AgentCard

| 属性 | 值 |
|------|-----|
| **used_in** | Dashboard, My Agent, Topology |
| **props** | `agentId`, `type`, `name`, `skills[]`, `tags[]`, `reputation`, `status` |
| **variants** | `compact` (Dashboard list), `full` (My Agent page) |

**Screenshot**: 紫色渐变卡片 + 状态圆点 + 技能标签

### NegotiationTimeline

| 属性 | 值 |
|------|-----|
| **used_in** | Negotiation Panel |
| **props** | `negotiationId`, `events[]` |
| **features** | 时间线展示提案/反提案/接受/拒绝，实时 SSE 更新 |

### EventStream

| 属性 | 值 |
|------|-----|
| **used_in** | Dashboard |
| **props** | `stream[]` |
| **features** | 实时滚动事件日志，按类型颜色区分 |

### WishCard

| 属性 | 值 |
|------|-----|
| **used_in** | Wish Pool |
| **props** | `wishId`, `artist`, `genre`, `city`, `date`, `status` |

### DemandProgressBar

| 属性 | 值 |
|------|-----|
| **used_in** | Wish Pool |
| **props** | `current`, `threshold` (MIN_THRESHOLD=10) |
| **features** | 达到阈值时触发动画 + 进入 Matching 状态 |

---

## P1 — 增强组件

### AgentTopologyGraph

| 属性 | 值 |
|------|-----|
| **used_in** | Dashboard, Topology Screen |
| **library** | React Flow |
| **features** | 57 agents 实时拓扑，节点颜色按 type 区分 |
| **colors** | 紫=Audience, 绿=Musician, 橙=Venue, 蓝=Manager, 灰=System |

### WalletButton

| 属性 | 值 |
|------|-----|
| **used_in** | Landing, Onboarding, Settings |
| **library** | RainbowKit + wagmi |

### ConciergeFloat

| 属性 | 值 |
|------|-----|
| **used_in** | 全局（所有页面） |
| **features** | 右下角浮动按钮，展开为 AI Chat |
| **library** | AI SDK UI (useChat) |

### MetricsChart

| 属性 | 值 |
|------|-----|
| **used_in** | Dashboard |
| **library** | Recharts |
| **variants** | `line` (agents online), `bar` (deals/day), `pie` (genre distribution) |

---

## Reusable Layouts

### GlassPanel

| 属性 | 值 |
|------|-----|
| **css** | `backdrop-blur(16px)` + `bg-black/20` + `border border-primary/10` |
| **used_in** | 所有卡片容器 |

### StatusBadge

| 属性 | 值 |
|------|-----|
| **variants** | `online` (绿), `busy` (黄), `offline` (灰), `error` (红), `pending` (蓝) |

---

## 使用规则

1. **已有组件优先** — 页面开发时先看此清单，复用已有组件
2. **不要重写** — 不要在页面文件里内联重写 `AgentCard` 或 `NegotiationTimeline`
3. **组件目录** — 所有组件放在 `src/components/{name}/`
4. **新增组件** — 如果确认是跨页面复用的，先加到此清单，再创建
