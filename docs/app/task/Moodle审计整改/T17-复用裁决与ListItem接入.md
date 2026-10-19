# T17 复用裁决与 ListItem 接入

## 1. 任务位置

- Phase F 处理最后一项本地可推进的结构债，目标见 [第六批总览](16-第六批总览.md)。
- 本任务推进 P-10 余项：模块行与公告行改用 `ListItem`，并记录「不套用 P2/P3 容器」的裁决。
- 起始：无前置。后续：无。缺陷：D-10（轻微，本任务关闭）。

## 2. 开发者需要知道

**Read first**

- `app/src/components/ui/ListItem.tsx` — 变体、subtitle/meta/trailing、testID 落在哪。
- `app/src/features/tools/moodle/WorkspaceScreen.tsx` — 模块行现在的 Button + Text 组合。
- `app/src/features/tools/moodle/DetailScreen.tsx` — 公告行的 Button + Text 组合。
- `app/src/__tests__/p3y3-moodle-host.test.tsx` — 现有按 testID 点击模块与公告的断言。

**Settled**

- 不套用 `ListScreen` 与 `proto/P3 DetailScreen`：前者是分页外壳，后者是社交详情，与 Moodle 数据模型不匹配（裁决写进小结）。
- 复用 `ListItem` 行原语：标题 + 副标题 + 单一动作；原链接动作保留为独立链接按钮。
- testID 与可点击语义不变，现有用例不改断言即可继续用。

**Edges and seam**

- seam：两类行的渲染点，换成 `ListItem`。
- 触 `moodle/WorkspaceScreen.tsx`、`moodle/DetailScreen.tsx`；不动解析、缓存、宿主。

**Run**

- `cd app; npx jest --ci --testPathPattern "p3y3-moodle-host|p3y3-moodle-workspace|p3a8-moodle-states"`。
- `cd app; npx tsc --noEmit`。

**Unknowns**

- `ListItem` 的 `onPress` 与旧 Button 的 trigger 语义一致；若某处需要 disabled，停下先确认再改。

## 3. 工作流

1. 读四个入口，用一句话复述本任务。
2. 模块行换 `ListItem`（副标题 = 模块类型），保留原链接按钮。
3. 公告行换 `ListItem`（副标题 = 作者），跑相关测试。
4. 跑本任务命令。
5. 提交（一次改动）。

## 4. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 模块行 | 显示名称 + 类型副标题，点击进详情 | `WorkspaceScreen` |
| 2 | 公告行 | 显示标题 + 作者，点击进讨论 | `DetailScreen` |
| 3 | 原链接 | 独立链接按钮仍可打开 | 同上 |
