# Frontend Tech Stack

> ⛔ 已冻结。Claude Code 禁止引入任何不在本清单中的依赖。

## Framework

| 层 | 技术 | 用途 | 禁止替代 |
|----|------|------|---------|
| 框架 | Next.js 15 | 服务端 + 客户端渲染 | — |
| 路由 | App Router | 文件系统路由 | Pages Router ❌ |
| 语言 | TypeScript 5.x | 类型安全 | JavaScript ❌ |

## UI

| 层 | 技术 | 用途 | 禁止替代 |
|----|------|------|---------|
| 组件库 | HeroUI v3 (`@heroui/react`) | Button, Card, Modal, Form, Table, Navbar | Ant Design ❌, Material UI ❌ |
| 基础组件 | shadcn/ui | 自定义扩展组件 | — |
| Agent UI | AI Elements (`@assistant-ui/react`) | Conversation, Message, Thread | — |
| 样式 | Tailwind CSS v4 | 原子化 CSS | CSS Modules ❌, styled-components ❌ |
| 动画 | Framer Motion | 页面/组件过渡动画 | GSAP ❌ |
| 字体 | Sora / Plus Jakarta Sans / JetBrains Mono | 见 DESIGN.md | — |

## State

| 层 | 技术 | 用途 | 禁止替代 |
|----|------|------|---------|
| 客户端状态 | Zustand | Agent Store, UI State | Redux ❌, MobX ❌ |
| 服务端状态 | TanStack Query (React Query) | API 请求缓存/重试 | SWR ❌ |
| 表单 | React Hook Form + Zod | 表单验证 | Formik ❌ |

## AI

| 层 | 技术 | 用途 |
|----|------|------|
| SDK | Vercel AI SDK | `useChat`, `generateText`, `streamText` |
| Agent UI | AI Elements | 聊天界面组件 |
| Bot | Vercel Chat SDK | 仅 Slack/Discord/Teams bot（非网页） |

## Blockchain

| 层 | 技术 | 用途 | 禁止替代 |
|----|------|------|---------|
| Wallet | wagmi v2 | 钱包连接/交易 | ethers.js ❌ |
| Client | viem | 合约交互 | ethers.js ❌ |
| Connect UI | RainbowKit | 钱包连接按钮 | Web3Modal ❌ |

## Charts & Graph

| 层 | 技术 | 用途 | 禁止替代 |
|----|------|------|---------|
| 图表 | Recharts | 数据可视化（metrics charts） | Chart.js ❌, ECharts ❌ |
| 拓扑图 | React Flow | Agent 拓扑可视化 | D3.js ❌ |

## Design System

| Token | 值 | 用途 |
|-------|-----|------|
| `primary` | `#DDB7FF` | 按钮、链接、active |
| `background` | `#131315` | 深空黑背景 |
| `surface` | `#201F22` | 卡片表面 |
| `glass` | `backdrop-blur(16px)` + border | 毛玻璃面板 |

> 完整设计参考 `DESIGN.md`
