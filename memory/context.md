# 开发上下文记录

> 本文档用于记录项目开发过程中的上下文, 决策, 进度与问题。
> Agent 在每次开发会话(session)结束时更新此文件, 供后续会话追查。

---

## Session Log

| # | 日期 | 目标 | 状态 | 记录人 |
|---|------|------|------|--------|
| 1 | 2025-06-02 | 项目文档体系搭建与修正 | ✅ 完成 | AtomCode |

---

### Session 1 — 2025-06-02

**目标**: 完善 WishLive 项目文档, 确保文档体系可支撑 Agent 开发。

**完成项**:
- 建立 `WIKI.md` 项目 Wiki 总入口
- 填充 `docs/protocols/` 6 个协议规范文件 (a2a/agent-card/event/negotiation/runtime/skill)
- 填充 `docs/business/` 3 个业务逻辑文件 (demand/matching/reputation)
- 完善 `CLAUDE.md` REFERENCES 和 ADR 摘要
- 填写 4 个 API OpenAPI 文件 (registry/a2a/settlement/concierge)
- 修复 `api/a2a.yaml` 文件名前多余空格
- 统一事件系统事实来源为 `redis/topics.md`
- 删除 ADR-011 (Chat SDK), 新增 ADR-014 (AI SDK UI + AI Elements)
- 修复 WIKI.md 所有断裂的 `../` 链接
- 重写 Agent Memory 设计(基于 AI SDK Custom Tool 模式)

**决策**:

| # | 决策 | 原因 |
|---|------|------|
| D1 | A2A 不自建 ADK, 自建 TypeScript 实现 | 项目全 TypeScript 栈, ADK 是 Python/Kotlin, A2A 协议只是 JSON 格式 |
| D2 | Workflow 用 AI SDK Workflow Patterns 而非独立 workflow-sdk | workflow-sdk 需 Vercel 部署, 与 Docker/Railway 路线冲突 |
| D3 | Vercel Chat SDK 声明为多平台 bot 通道, 网页聊天用 AI SDK UI + AI Elements | 查证 chat-sdk.dev 实为 Slack/Discord bot SDK |
| D4 | Demand 阈值公式修正为 `max(MIN_THRESHOLD, wish_count_accumulated)` | 原公式依赖 venue capacity(匹配后才确定), 存在时序矛盾 |
| D5 | Agent Memory 用 AI SDK Custom Tool 模式 | 自有 PostgreSQL+Redis, 无需依赖外部记忆服务 |

**问题排查**:

| # | 问题 | 根因 | 解决方案 |
|---|------|------|---------|
| B1 | `api/a2a.yaml` 无法读取 | 文件名前有多余空格 ` a2a.yaml` | `mv " a2a.yaml" a2a.yaml` |
| B2 | WIKI.md 所有链接无效 | 使用 `../` 相对路径指到上级目录 | 全部替换为 `./` |
| B3 | DECISIONS.md 同时编辑冲突 | parallel_edit_files 中两个子 agent 同时写同一文件 | 手动合并 |

**待办**:
- [ ] 项目目录结构说明(用户自写)
- [ ] 项目初始化 package.json / Dockerfile(用户自写)
- [ ] BaseAgent 实现代码
- [ ] Registry 服务实现
- [ ] Agent Memory 存储层(storeMemory / recallMemory 等)编码

---

## 常用诊断命令

```bash
# 检查所有文档引用是否有断裂
grep -rn '](../' /home/lora/repos/hackthon/ --include="*.md" | grep -v node_modules

# 检查 API 文件 YAML 合法性
python3 -c "
import yaml, glob
for f in glob.glob('/home/lora/repos/hackthon/api/*.yaml'):
  try:
    yaml.safe_load(open(f))
    print(f'{f}: OK')
  except Exception as e:
    print(f'{f}: ERROR {e}')
"

# 事件系统一致性比对
diff <(grep -v '^$' /home/lora/repos/hackthon/redis/topics.md | grep -v '^#' | grep -oP '^\w+\.\w+' | sort -u) \
     <(sed -n '/^# Event Layer/,/^# /p' /home/lora/repos/hackthon/ARCHITECTURE.md | grep -oP '\b\w+\.\w+\b' | grep -v 'Topics\|Redis' | sort -u)
```

## ADR 索引

| # | 标题 | 文件位置 |
|---|------|---------|
| ADR-001 | Vercel AI SDK Agents | DECISIONS.md |
| ADR-002 | Redis Streams 事件总线 | DECISIONS.md |
| ADR-003 | 自建能力感知 Registry | DECISIONS.md |
| ADR-004 | Hardhat Localnet | DECISIONS.md |
| ADR-005 | 影子代理 (3+22=57) | DECISIONS.md |
| ADR-006 | 人工确认不可跳过 | DECISIONS.md |
| ADR-007 | 事件驱动架构 | DECISIONS.md |
| ADR-008 | 区块链 (Identity/Escrow/TicketNFT) | DECISIONS.md |
| ADR-009 | AI SDK Workflow Patterns | DECISIONS.md |
| ADR-010 | Workflow Patterns 编排 | DECISIONS.md |
| ADR-012 | Vercel AI Elements Agent UI | DECISIONS.md |
| ADR-013 | HeroUI 基础组件 | DECISIONS.md |
| ADR-014 | AI SDK UI + AI Elements 网页聊天 | DECISIONS.md |
