# T3 · 今日 pane（课表全量 + Moodle 前 3 条）

## 1. Where this task sits

- **Phase 广场今日页**，目标：「今日」tab 的内容就是今日课表 + Moodle 最近 3 条待交。
- **本任务移入** `R1/R2 的界面呈现`：只消费 T1 的纯函数与 hook，不重新取数。
- **Starts after**：T1。**Waits on it**：T4（把 pane 挂进广场分页）。

## 2. What the developer needs to know

**Read first**

- `app/src/features/square/todayAgenda.ts`（T1 产物）— 返回结构与排序口径。
- `app/src/features/tools/ToolsDashboard.tsx` — 课表取数的**现有接线**（`useTimetableWeek` + `getScheduleWeek` + `session.handleAuthFailure`），照抄同一套，⛔ 不另写一份。
- `app/src/components/ui/ListItem.tsx` — 行式入口（`title` + `subtitle` + `onPress`）；今日两段都用它，少造组件。
- `app/src/components/ui/LoadingState.tsx` / `ErrorState.tsx` — 四态只允许用现成组件。
- `app/src/i18n/zh.ts` / `en.ts` — 新词条必须双语同时落；`square.` 前缀已在白名单。

**Settled**

- 课程列表展示**今天全部**（不截断、不筛"剩余"）；教学周外显示"今天没有课"。
- Moodle 只展示 3 条、按 DDL 升序；未同步时给"打开 Moodle 同步"入口，⛔ 不展示假数据。
- 点击课程行 → `/tools/timetable`；点击 DDL 行 → `/system/moodle`。
- 列表本身不吸顶、不横滑；pane 内纵向滚动（广场分页只吃横向手势）。

**Edges and seam**

- 只新增 `features/square/TodayPane.tsx` + i18n 词条（词条由 T4 统一合入时一起提交，本任务先落键）。
- 接缝：`TodayPane`（无 props，自取数；`embedded` 语义 = 已在 `Screen` 内）。

**Run**

- `cd app && npx jest --testPathPattern p3a6-today-pane`
- `cd app && npx tsc --noEmit`

**Unknowns**

- `useTimetableWeek` 在 Jest 里需要 mock 掉 `shared/api/schedule` 与 `session`；若 mock 成本高于收益，改为对"纯视图"（传入已取好的数据）测——决定后写进提交信息。
- 今日 pane 高度有限（广场顶部固定区约 200dp），列表必须可滚；若一屏放不下两段，先课表后 DDL，整页纵滚。

## 3. The workflow

1. 读上述文件，复述本任务一句话。
2. 落词条（zh/en 成对）：`square.today.courses` / `square.today.noCourses` / `square.today.deadlines` / `square.today.noDeadlines` / `square.today.moodleUnsynced` / `square.today.moodleSync` / `square.today.deadlineToday|Tomorrow|Later`。
3. 写 `TodayPane` 骨架：课表段（标题 + Loading/Error/空态 + 行），红→绿。
4. 接 Moodle 段（标题 + 3 行 + 未同步入口），红→绿。
5. 跑用例与 `tsc`，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 今日 2 节课（08:00、10:00） | 两行都在、按时间升序、带 `HH:MM` | `TodayPane` |
| 2 | 今日 0 节课 | 显示 `square.today.noCourses` | `TodayPane` |
| 3 | 已同步、4 条未过期 DDL | 只出现 3 行、按 DDL 升序 | `TodayPane` |
| 4 | 未同步（缓存空） | 显示 `square.today.moodleUnsynced`；点它 push `/system/moodle` | `TodayPane` |
| 5 | 课表 loading 且无缓存 | 显示 `LoadingState`，不显示空态 | `TodayPane` |
