## 1. Where this task sits

- **Phase 3 讨论和反馈完成闭环**，目标是详情内可以可靠地讨论。
- **T3-02 HeroUI 回复编辑器** 将现有草稿和回复状态呈现为 HeroUI 业务组件。
- **Starts after**：Phase 2 详情帖子。**Waits on it**：T3-03 评论串接入。

## 2. What the developer needs to know

**Read first**

- `app/src/features/campus/useCampusActions.tsx` — 草稿、发送锁和旧响应保护。
- `app/src/components/ui/CommentComposer.tsx` — 当前编辑器和匿名规则。
- `app/src/features/campus/TreeholeHeroUITracer.tsx` — 已验证的 HeroUI TextArea 用法。
- `app/src/__tests__/p2x-bing-campus.test.tsx` — 评论失败与登录回归。

**Settled**

- 草稿归 `useCampusActions`；展示组件不得自行发送请求。
- 树洞允许实名回复；万能墙继续使用匿名文案。

**Edges and seam**

- 接缝为 `actions.body` 的编辑器区域；不修改发布页或墙的身份投影。

**Run**

- `npm test -- p2x-bing-campus.test --silent`。
- `npm run typecheck`。

**Unknowns**

- 若 HeroUI TextArea 的键盘焦点与详情滚动冲突，保留实现并等待 Android 真机验收。

## 3. The workflow

1. 阅读第 2 部分并复述：编辑器只投影既有草稿状态。
2. 写 case 1 的失败测试，覆盖失败后草稿仍在。
3. 封装 HeroUI 回复编辑器并接入 `useCampusActions`。
4. 写 case 2 的失败测试，覆盖发送时新编辑不被旧响应清空。
5. 让竞态保护继续生效并运行测试。
6. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 发送失败的草稿 | 文本仍可修改 | `useCampusActions` |
| 2 | 发送期间继续编辑 | 旧成功不清空新文本 | `useCampusActions` |
| 3 | 选择一级评论 | 显示可取消的回复上下文 | `TreeholeComposer` |
| 4 | 万能墙回复 | 不显示被回复者身份 | `CommentComposer` |
