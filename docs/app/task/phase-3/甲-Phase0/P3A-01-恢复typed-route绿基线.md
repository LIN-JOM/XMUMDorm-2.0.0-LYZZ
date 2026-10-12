# P3A-01 · 恢复 typed-route 绿基线

## 1. Where this task sits

- **甲 Phase 0 绿基线与公共契约先成立**，目标是新五格可运行，公共契约已冻结。
- **本任务推进甲-R1 恢复绿基线并守住后端启动边界**：让 App 类型检查恢复为 0 错误。
- **开始前**：无。**等待本任务**：甲 Phase 0 的全部代码任务。

## 2. What the developer needs to know

**Read first**

- `app/src/app/publish-center.tsx` — 发布中心如何把条目路由交给 Router。
- `app/src/features/publish/usePublishForm.ts` — 提交成功后如何跳转列表和详情。
- `app/src/features/mailbox/MailboxScreen.tsx` — 通知目标路由怎样进入 Router。
- `app/src/__tests__/p2a-02-viewer.test.tsx` — 发布中心条目和目标路由的既有行为。

**Settled**

- typed routes 已在 App 配置中启用，错误必须修正，不可关闭该能力。
- 路由来源必须先由现有注册表或解析器收窄，不能把任意字符串送入 Router。
- 通知目标仍可为空；本任务不实现目标映射。

**Edges and seam**

- 触及发布、信箱和 Router 类型出口；不改变发布权限、通知读取和路由语义。
- Seam：现有 `typecheck` 出口，以及发布中心、发布宿主、信箱用例。

**Run**

- `cd app; npm run typecheck`
- `cd app; npm run test:ci -- --runInBand p2a-02-viewer p2a-04-publish-host p2b-04-mailbox`

**Unknowns**

- 如果 Expo Router 的窄类型需要新 API，先查 SDK 57 文档；不得依据记忆改类型。
- 如果安全的路由收窄无法表达，停下并报告缺失的路由契约。

## 3. The workflow

1. 阅读第 2 部分，并复述：只恢复三处路由出口的静态类型，不改变导航行为。
2. 运行类型检查，记录四个现有错误的来源。
3. 为发布中心和提交回跳写出或调整失败用例，固定合法路由。
4. 让注册表和提交结果提供可被 Router 接受的窄路由。
5. 保留通知目标的空结果，并让其 Router 调用通过类型检查。
6. 运行局部用例和类型检查，确认没有改变既有跳转。
7. 提交本任务。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 可见发布条目 | 打开其已注册的表单 | 发布中心 |
| 2 | 提交后有列表去向 | 回到声明的列表 | 发布宿主 |
| 3 | 提交后有详情去向 | 回执可打开声明的详情 | 发布宿主 |
| 4 | 无 App 目标的通知 | 标记已读，不导航 | 信箱 |
| 5 | 全部 App 源文件 | 类型检查 0 错误 | `typecheck` |
