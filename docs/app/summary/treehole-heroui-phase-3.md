## 1. Headline

基线：`App树洞HeroUI-Native重构设计与实施计划.md` 的 Phase 3。  
窗口：2026-10-15。  
**本轮：树洞详情的互动、讨论、举报和成功回执已迁移到 HeroUI 业务组件。**

| # | Change | Where | Kind | State | What it means for the reader |
|---|---|---|---|---|---|
| C-1 | 真实点赞动作 | `TreeholePost.tsx` | Changed | Done | 点赞状态和计数在帖子动作栏更新 |
| C-2 | 回复编辑器 | `TreeholeComposer.tsx` | New | Done | 草稿和回复在 HeroUI 输入区完成 |
| C-3 | 两级评论串 | `TreeholeCommentThread.tsx` | New | Done | 一级评论和回复按讨论关系呈现 |
| C-4 | 举报 BottomSheet | `TreeholeReport.tsx` | New | Done | 举报可从帖子动作栏内完成 |
| C-5 | 举报成功回执 | `CampusScreens.tsx` | Changed | Done | 树洞成功反馈使用 HeroUI Toast |
| C-6 | 互动回归 | `p2x-bing-campus*` | Changed | Done | 真实请求、匿名边界和失败路径受保护 |

Routine：Phase 3 五份任务简报与 HeroUI 测试 mock 同步更新。

## 2. What it means

树洞详情现在由帖子、编辑器、评论串和举报表面组成一条 HeroUI 业务链路。真实点赞、评论和举报仍由现有 hooks 与 API 作为唯一真源，因此没有把视觉状态误当成服务端成功。

万能墙继续保留匿名投影及旧详情表面。树洞的登录、处罚、失败和重试仍保留原有语义；成功举报只在真实成功状态后关闭 BottomSheet 并显示 HeroUI Toast。

## 3. Still open

- Android 设备上的 BottomSheet 焦点、键盘、Toast 和详情拖拽仍未完成运行时验收；Metro 继续受本机 Windows 可提交内存限制影响。
- Phase 4 的搜索入口、标签栏、加载态和空错态仍使用旧列表视觉路径。
- Phase 5 仍需清理树洞详情中保留的通用详情壳与 Phase 1 tracer，并完成双主题、字号和无障碍验收。
