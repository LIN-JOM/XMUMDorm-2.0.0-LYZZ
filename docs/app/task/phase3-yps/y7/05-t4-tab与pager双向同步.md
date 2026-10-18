# T4 Tab 条与 pager 双向同步

## 1. Where this task sits

- **Phase 1 横滑骨架先跑通**。
- **本任务把 R-M4 的实质接上线**：点 Tab 翻页、横滑翻页回写 Tab 条，两条通道一个状态源。
- **Starts after**：T3（骨架在）。**Waits on it**：无（Phase 1 收口）。

## 2. What the developer needs to know

**Read first**

- T3 落地后的 `app/src/features/me/MeScreen.tsx` — 骨架长什么样，状态在哪。
- `node_modules/react-native-pager-view` 的类型声明 — `setPage` / `onPageSelected` 的确切签名。
- `app/src/components/ui/TopTabStrip.tsx` — 选中项自动滚入可见区的逻辑已自带，不重复造。
- `app/src/features/navigation/secondaryTabs.ts` 的 R2/R3 — 选中键是否进 store 的口径。

**Settled**

- 选中状态只有一个源（主页组件的 state），Tab 条与 pager 都是它的投影，⛔ 不搞两个 state 互相同步。
- 动画时长走 `resolveTransitionDuration`（reduceMotion 时一律 0），不手写动画参数。
- 本阶段选中键**不进** SecondaryTabStore（R3 讲一级格切换保留，主页就是一级格本身，暂无此需求；如 Phase 2 发现需要再议）。

**Edges and seam**

- 只碰主页组合与用例。
- Seam：p2c-03 用例驱动回调（jest 里 pager 不真滑，只能测回调接线）。

**Run**

- `cd app && npx jest p2c-03 --runInBand`，然后 `npm run typecheck`。

**Unknowns**

- pager-view 官方 mock 是否触发 `onPageSelected`。若 mock 不触发，用例改为直接调用接线函数断言 Tab 条选中变化——不为了测试去改实现形状。

## 3. The workflow

1. 读上面文件，一句话重述本任务。
2. 红：加用例——点"二手"Tab 后 pager 收到 setPage(1)；模拟 pager 回调选中第 2 页后 Tab 条选中"跑腿"。跑测试确认红。
3. Commit 红的契约。
4. 绿：接上 ref 与回调，单向状态源。
5. 跑用例确认绿，再过 typecheck，全量 jest 无回归。
6. Commit 实现。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 点"二手"Tab | pager 翻到第 1 页 | p2c-03 |
| 2 | pager 回调选中第 2 页 | Tab 条选中"跑腿" | p2c-03 |
| 3 | 点第 0 页之外的 Tab 再点回 | 选中键回到"树洞" | p2c-03 |
| 4 | reduceMotion 为真 | 翻页动画时长为 0 | p2c-03 |
