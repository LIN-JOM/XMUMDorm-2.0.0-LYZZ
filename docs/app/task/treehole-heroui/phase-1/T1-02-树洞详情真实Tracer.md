# T1-02 树洞详情真实 Tracer

## 1. 这项任务位于哪里

- **阶段**：Phase 1 HeroUI 在本项目真实可用；目标是双端详情 tracer 能显示 HeroUI 组件。
- **推进**：推进 R-1 HeroUI Native 成为树洞唯一通用视觉层。
- **边界**：依赖与 Provider 已由 T1-01 接入；本任务只打通一条真实树洞详情，不迁移完整评论流。

## 2. 开发者需要知道什么

**先读**

- `app/src/features/campus/CampusScreens.tsx` — 树洞详情入口、真实帖子和现有互动状态。
- `app/src/features/campus/campusActions.ts` — 评论与举报动作的真实状态边界。
- `app/src/components/ui/Toast.tsx` — 现有全局反馈宿主和测试约定。
- `app/src/__tests__/p2x-bing-campus.test.tsx` — 树洞详情的真实行为回归接缝。
- HeroUI 官方组件文档 — Avatar、Button、TextArea、Dialog 与 Toast 的当前 API。

**已定**

- tracer 必须消费真实帖子详情数据，不创建假数据层。
- tracer 覆盖头像、按钮、输入、浮层和 Toast。
- 点赞、评论、举报和导航现有状态规则不在本任务改写。

**边界与接缝**

- 接触树洞详情的最小呈现层和现有树洞专项测试。
- 接缝：CampusDetailScreen 详情入口；不迁移列表、搜索或万能墙。

**运行**

- `cd app; npm test -- --runInBand p2x-bing-campus.test.tsx`
- `cd app; npm run typecheck`
- `cd app; npm run lint`

**未知**

- 若 HeroUI 的浮层或 Toast 无法嵌入现有根宿主，停止并记录 API 差异。
- 若真实详情测试不能独立断言库组件行为，添加最高层渲染断言，不新建数据接缝。

## 3. 工作流

1. 阅读本简报，用一句话复述：以真实树洞详情验证 HeroUI 的关键组件。
2. 写详情 tracer 的失败渲染与操作测试。
3. 在详情入口放入最小 HeroUI 头像、按钮和输入组件。
4. 接通一个真实浮层和 Toast 反馈路径。
5. 运行树洞专项测试、类型检查和 lint。
6. 提交详情 tracer 改动。

## 4. 测试用例

| 用例 | 输入 | 预期 | 接缝 |
|---|---|---|---|
| 1 | 有作者头像的详情 | 显示 HeroUI 头像 | 详情入口 |
| 2 | 评论输入 | 显示 HeroUI 输入与发送按钮 | 详情入口 |
| 3 | 举报操作 | 打开 HeroUI 浮层 | 详情入口 |
| 4 | 成功或失败反馈 | 现有 Toast 可显示正确文案 | 详情入口 |
| 5 | 树洞详情回归 | 分页、评论和鉴权行为不变 | 树洞专项测试 |
