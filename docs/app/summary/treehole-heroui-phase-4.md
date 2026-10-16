## 1. Headline

基线：`App树洞HeroUI-Native重构设计与实施计划.md` 的 Phase 4。  
窗口：2026-10-15。  
**本轮：树洞流的标签和首屏状态已迁移到 HeroUI，搜索与媒体边界保持同一帖子链路。**

| # | Change | Where | Kind | State | What it means for the reader |
|---|---|---|---|---|---|
| C-1 | 树洞标签筛选 | `TreeholeTagFilters.tsx` | New | Done | 标签筛选使用 HeroUI 组件 |
| C-2 | 首屏状态表面 | `TreeholeFeedState.tsx` | New | Done | 加载、空态和错误态使用 HeroUI 表面 |
| C-3 | 搜索帖子复用 | `CampusScreens.tsx` | Changed | Done | 搜索继续使用同一帖子和媒体变体 |
| C-4 | 多图行为保护 | `TreeholeMedia.tsx` | Changed | Done | 列表和搜索没有切图入口 |
| C-5 | 状态回归 | `p2x-*` | Changed | Done | 分页、搜索与匿名边界仍受保护 |

Routine：标签变体修复和本阶段五份任务简报同步更新。

## 2. What it means

树洞信息流的用户可见筛选和首屏状态已从旧通用视觉路径转入 HeroUI 业务组件。FlashList、分页、缓存、请求代次和滚动恢复仍在原有状态容器内，因此视觉迁移没有改变数据读取的真源。

搜索结果继续复用树洞帖子变体和静态媒体模式。多图切换只存在于详情页，万能墙继续不使用实名树洞组件。

## 3. Still open

- Phase 5 仍需完成树洞详情剩余的旧视觉壳与 Phase 1 tracer 清理，并核对目标页面没有旧通用视觉组件的直接消费。
- Android 真机尚未验收 BottomSheet、Toast、键盘、图片拖拽、TalkBack、字体缩放和减弱动效；本机 Metro 仍受 Windows 可提交内存限制影响。
- 全量 lint 和 typecheck 尚未作为成功门禁通过；历史 lint 问题与 Node 内存限制需分别记录。
