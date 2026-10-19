# T15 fireAt 类型统一

## 1. 任务位置

- Phase E 收掉 P-12 剩余两项代码收口，目标见 [第五批总览](14-第五批总览.md)。
- 本任务推进 P-12 余项：提醒计划统一用毫秒数（number），调度器不再解析 ISO 字符串。
- 起始：无前置。后续：无。缺陷：D-12（知悉）。

## 2. 开发者需要知道

**Read first**

- `app/src/features/tools/reminders/plan.ts` — `ClassReminder.fireAt` 现在是什么类型、怎么排序？
- `app/src/features/tools/reminders/scheduler.ts` — `ReminderTime.fireAt` 与 `new Date(...)` 解析点。
- `app/src/features/tools/reminders/native.ts` — 两处 `toISOString()` 转换。
- `app/src/__tests__/p3y0-reminder-plan.test.ts`、`p3y2-reminder-scheduler.test.ts` — 现有断言。

**Settled**

- `MoodleReminderPlan` 已经是 number，课表计划向它看齐；时间只在展示层格式化。
- 无效值仍被丢弃：非有限数不进计划、不进排程。
- 排序与去重语义不变；通知 `trigger` 仍是 `Date`。

**Edges and seam**

- seam：`ReminderTime.fireAt` 与 `ClassReminder.fireAt` 的类型。
- 触 `plan.ts`、`scheduler.ts`、`native.ts` 与两个测试；不动 Owner 代次、容量与标签逻辑。

**Run**

- `cd app; npx jest --ci --testPathPattern "p3y0-reminder-plan|p3y2-reminder-scheduler|p3y3-moodle-host|notification-native-client"`。
- `cd app; npx tsc --noEmit`。

**Unknowns**

- 若还有第三处把 `fireAt` 当字符串比较或格式化，停下逐个改，不要保留双形态。

## 3. 工作流

1. 读四个入口，用一句话复述本任务。
2. 改测试为毫秒数断言（先红）。
3. 改计划层、调度器、适配层，跑绿。
4. 跑本任务命令。
5. 分别提交测试与实现。

## 4. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 课表计划 | `fireAt` 为毫秒 number | `buildClassReminderPlan` |
| 2 | 调度器收到毫秒数 | `trigger` 为对应 `Date` | `createReminderScheduler` |
| 3 | 非有限数 | 不排程 | 同上 |
| 4 | Moodle 计划 | 无需 ISO 转换即可排程 | `replaceMoodleReminders` |
