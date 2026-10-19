# T13 空态消费 EmptyState

## 1. 任务位置

- Phase D 只做两件能立即验的事，目标见 [第四批总览](12-第四批总览.md)。
- 本任务推进 P-10 余项：三类空态改用现成 `EmptyState`，按语义分 kind 与动作。
- 起始：无前置。后续：T14（同改 WorkspaceScreen）。缺陷：D-10（轻微）。

## 2. 开发者需要知道

**Read first**

- `app/src/components/ui/EmptyState.tsx` — 三种 kind、唯一动作、title/action 长度约束。
- `app/src/features/tools/moodle/WorkspaceScreen.tsx` — 两处空态与可用动作。
- `app/src/features/tools/moodle/DetailScreen.tsx` — 三处空态。
- `app/src/__tests__/p3a8-moodle-states.test.tsx` — 现有按 testID 触发的写法。

**Settled**

- 空态只给一个动作（宪法 10.4/10.2）；三 kind 语义：首次无数据 / 筛选无结果 / 坏了。
- 动作文案沿用已有词条（`sync`/`allTypes`/`original`），不新增解释性文案。
- ⛔ 不在空态里写说明性旁白；标题沿用 `empty`/`fileUnknown`。

**Edges and seam**

- seam：两个屏幕的空态渲染点，换成 `EmptyState`。
- 触 `moodle/WorkspaceScreen.tsx`、`moodle/DetailScreen.tsx`、`p3a8-moodle-states.test.tsx`；不动解析与缓存。

**Run**

- `cd app; npx jest --ci --testPathPattern "p3a8-moodle-states|p3y3-moodle-workspace|p3y3-moodle-host"`。
- `cd app; npx tsc --noEmit`。

**Unknowns**

- `EmptyState` 的 testID 在容器上，测试要按文案找动作按钮，不能继续 press 容器。

## 3. 工作流

1. 读四个入口，用一句话复述本任务。
2. 改测试：按动作文案找按钮（先红）。
3. 两个屏幕换 `EmptyState`，跑绿。
4. 跑本任务命令。
5. 分别提交测试与实现。

## 4. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 无课程 | `firstRun` 空态 + 「同步课程」动作 | `WorkspaceScreen` |
| 2 | 课程无模块 | `firstRun` + 同步动作 | 同上 |
| 3 | 类型筛选无结果 | `noResult` + 「全部类型」动作 | 同上 |
| 4 | 公告为空 | 空态 + 原页动作 | `DetailScreen` |
| 5 | 资源无文件 | `broken` + 原页动作 | 同上 |
