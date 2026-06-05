# Frontend Architecture

## Tech Stack

| 层 | 技术 | 用途 |
|----|------|------|
| 框架 | Next.js 15 (App Router) | 服务端+客户端渲染 |
| 组件库 | HeroUI | Button, Card, Modal, Form, Table |
| Agent UI | AI Elements | Conversation, Message, Thread |
| 聊天 | AI SDK UI (useChat) | 流式消息收发 |
| 样式 | Tailwind CSS v4 | Cyber-Neon Minimalist 设计系统 |
| 钱包 | wagmi + RainbowKit | 钱包连接 / 签名 / 交易 |
| 字体 | Sora / Plus Jakarta Sans / JetBrains Mono | 详见 DESIGN.md |

## Pages

### P0（核心页面）

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Landing | 品牌展示 + 角色选择（观众/音乐人/场地方） |
| `/create-agent` | Agent Onboarding | 引导：连接钱包 → 选择角色 → 填写信息 → Agent Card 上链 |
| `/wish-pool` | Wish Pool | 许愿提交 + 心愿列表 + "上链成功 ✓" |
| `/dashboard` | Global Dashboard | 全平台总览：57 agents 状态、事件流、指标 |
| `/my-agent` | My Agent Dashboard | 个人 Agent 信息：Card、协商记录、门票 |
| `/negotiation/[id]` | Negotiation Panel | 协商实时可视化：提案/反提案/时间线 |

### P1（增强页面）

| 路径 | 页面 | 说明 |
|------|------|------|
| `/topology` | Topology Screen | 57 agents 实时拓扑图（紫/绿/橙/蓝/灰） |
| `/concierge` | Concierge 浮窗 | 右下角浮窗，点击激活 AI 助手 |

### P2（后续迭代）

| 路径 | 页面 | 说明 |
|------|------|------|
| `/dashboard/audience` | Audience Profile | 观众个人中心 |
| `/dashboard/musician` | Musician Profile | 音乐人个人中心 |
| `/dashboard/venue` | Venue Profile | 场地方个人中心 |

## Design System

参考 [DESIGN.md](../../DESIGN.md) — Cyber-Neon Minimalist

| Token | 值 | 用途 |
|-------|-----|------|
| `primary` | `#DDB7FF` | 按钮、链接、active 状态 |
| `background` | `#131315` | 深空黑背景 |
| `surface-container` | `#201F22` | 卡片表面 |
| `glass-panel` | `backdrop-blur(16px)` + `border rgba(#DDB7FF, 0.1)` | 毛玻璃卡片 |
| `display-lg` | Sora 72px 800w | H1 |
| `label-sm` | JetBrains Mono 12px | 导航、标签 |

## Data Flow

```
用户操作
    ↓
Frontend (Next.js)
    │
    ├── AI SDK UI (useChat) ←→ Agent Runtime (SSE)
    │
    ├── wagmi ←→ Wallet (MetaMask)
    │
    └── REST API ←→ Backend Services (Registry / Settlement / Concierge)
```
