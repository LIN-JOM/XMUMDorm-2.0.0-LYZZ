## 1. Headline

基线：`App树洞HeroUI-Native重构设计与实施计划.md` 的 Phase 2。  
窗口：2026-10-15。  
**本轮：树洞列表与详情已共享 HeroUI 业务帖子组件；列表多图静态，详情可循环和预览。**

| # | Change | Where | Kind | State | What it means for the reader |
|---|---|---|---|---|---|
| C-1 | 帖子展示模型 | `treeholePostViewModel.ts` | New | Done | 缺失资料不再打断帖子展示 |
| C-2 | 作者、标签、动作、帖子组件 | `TreeholePost.tsx` | New | Done | 页面不再直接组合 HeroUI 原语 |
| C-3 | 媒体模式隔离 | `TreeholeMedia.tsx` | New | Done | 列表不能切图，详情可以循环切换 |
| C-4 | HeroUI 图片查看器 | `TreeholeMedia.tsx` | New | Done | 详情可以打开当前图片预览 |
| C-5 | 详情原帖接入 | `CampusScreens.tsx` | Changed | Done | 树洞详情使用详情密度的业务帖子 |
| C-6 | 列表与搜索接入 | `CampusScreens.tsx` | Changed | Done | 信息流和搜索使用紧凑帖子变体 |
| C-7 | Phase 2 回归 | `p2x-treehole-*` | New | Done | 媒体规则和墙边界有自动化保护 |

Routine：Phase 2 六份任务简报、Android 构建记录和测试 mock 同步更新。

## 2. What it means

树洞现在有一个可复用的业务视觉边界。列表和详情读取同一展示模型，却使用各自正确的媒体密度。万能墙仍走匿名模板，发布页和 API 没有改动。

列表媒体不再继承旧轮播的横滑行为。详情保留按钮、拖拽方向、循环顺序和 HeroUI 图片预览；系统减弱动效时关闭 HeroUI 表面动效。

## 3. Still open

- Android 设备上的 Dialog Portal、键盘、拖拽回弹和 Toast 还未完成运行时验收；本机 Metro 受 Windows 可提交内存限制，不能稳定提供 bundle。
- Phase 3 的评论、回复、举报和真实反馈仍保留旧详情路径，尚未迁移到 HeroUI 业务组件。
- Phase 4 的长列表状态、标签栏、加载态和空错态仍在旧通用列表视觉路径中。
