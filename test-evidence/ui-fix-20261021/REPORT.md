# WishLive UI 修复回归（2026-10-21）

## 本轮修改

- 收紧工作页侧栏、标题、卡片、图片尺寸；移动端许愿表单优先于配图。
- 首页、看板适配窄屏；事件表格在自身容器内滚动。
- 根据真实乐手和场地候选数量判断是否可协商；空候选禁用按钮并提供调整条件入口。
- 去除需求页固定分数/成功概率；许愿统计不再把 MATCHED 错当待确认订单。
- 撮合和协商主要文案双语，技术追踪折叠；确认页明确未结算、未铸票、配图只是示意。

## 验证结果

- pnpm typecheck、pnpm lint 通过；最后补丁后 frontend typecheck/lint 再次通过。
- pnpm test：shared 2、contracts 6、backend 12、frontend 7，共 27 项通过。
- Playwright 实测首页/看板/许愿页在 390 和 320 宽度下 scrollWidth 等于 viewport width；看板加载 59 个节点后再次验证通过。
- 新增 10 条 test:ui1021:* 本地测试许愿，日期 2026-12-20。真实空候选需求 demand:144c4a46-cb06-461a-b5d8-af82ca5dd90d：协商按钮禁用，中英文提示可切换。未使用网络 mock。
- 复用上一轮有候选测试订单：协商记录可查看，并可进入 deal:1ecf88c5-56a8-45a8-9b97-e28686a5e32b 待确认页。
- 确认按钮禁用；测试签名请求返回 HTTP 503。未执行付款或 NFT 铸造。
- 本轮是 UI 和安全边界回归；有候选完整创建链路见 ../e2e-20261021/REPORT.md，不代表生产端到端结算成功。

## 截图

- wish-desktop.png / mobile-wish-pool.png：许愿页布局。
- mobile-home.png / mobile-dashboard.png：窄屏首页和看板。
- empty-match-zh.png / empty-match-en.png：真实空候选状态。
- negotiation-en.png / confirmation.png：协商和未启用结算。

## 仍需改进

1. 结算未启用：真实钱包签名、授权和交易回执验证需专项实现及审计。
2. 业务数据仍依赖内存，服务重启不能保证保留；尚不具备生产可靠性。
3. 后端 MATCHED 仍表示匹配过程结束，不保证有候选；本轮修正展示及按钮判断，状态模型应进一步区分匹配失败/等待档期。
4. 种子档期已过期，有候选测试依赖明确标注的 E2E 测试卡片。
5. 创建 Agent、看板细节及 Trust Layer 尚非全站完整双语；侧栏目录数量是演示目录而非在线人数。
6. 手机看板拓扑仍偏密，后续宜默认摘要列表、按需展开图；仍缺“我的许愿”独立进度入口。
7. 开发环境初始 favicon 404（已新增 SVG 应用图标）；快速跳转截图产生过 caret-color hydration 提示，截图需等待页面完成加载。未以隐藏控制台错误作为验收手段。
