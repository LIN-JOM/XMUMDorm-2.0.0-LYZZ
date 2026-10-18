## 1. Where this task sits

- Phase Y0 风险验证：Moodle 只读数据可穿过既有宿主，提醒与设备有证据。
- 推进 R-Y1 Moodle 与提醒风险验证：先建立有来源的字段白名单。
- 前置：上游三种 AJAX 已定；后继：WebView 通道与会话缓存；本任务不证明真实站点可用。

## 2. What the developer needs to know

**Read first**
- `docs/app/task/Phase3全面治理工程计划.md` — 哪些对象、可见性和隐私规则已定？
- `app/src/features/tools/injectedScripts.ts` — 现有消息信封如何分流？
- `app/src/features/tools/scheduleImport.ts` — 未类型化响应如何拒绝脏数据？
- Moodle 官方 `course/format/classes/external/get_state.php` — 为何 state 是 JSON 字符串？

**Settled**
- 三种 AJAX 优先；不依赖 get_contents；只保留批准字段（上游 R-7）。
- 模拟夹具依据 Moodle 官方 4.5 源码，明确不是本站抓取样本；站点版本待验证。
- 机器类型取 `module`；分页保留 `nextoffset` 与 `lastid`，不由数组长度猜游标。

**Edges and seam**
- 仅工具域 Moodle 解析与测试夹具；不改共享 API 或路由。
- seam：新增纯 Moodle 响应解析边界，供既有 WebView 命令与消息回调消费。

**Run**
- `cd app; npm.cmd run test:ci -- --runInBand p3y0-moodle-contract`。
- `cd app; npm.cmd run typecheck`；`npm.cmd run lint -- --no-cache`。

**Unknowns**
- 实站原始样本缺失，保留为设备门；不把模拟响应改称真实契约证据。

## 3. The workflow

1. 阅读第 2 部分，把本任务复述成一句话。
2. 根据官方源码写课程与游标的失败用例，记录红测试并提交。
3. 实现最小字段标准化，运行对应测试。
4. 依次补 state、模块类型、事件、可见性和凭据剔除用例，先红后绿。
5. 运行域测试、typecheck、lint，区分基线失败与新增问题。
6. 单独提交实现，记录官方来源和模拟夹具边界。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | courses 两项、nextoffset=25 | 保留 25，不推导成 2 | 课程解析 |
| 2 | state JSON 字符串 | 读取 course/section/cm | 状态解析 |
| 3 | module=assign、modname=作业 | 类型为 assign | 状态解析 |
| 4 | 不可见项或无效顶层 | 剔除不可见项；无效返回 null | 三种解析 |
| 5 | events 带 instance、lastid、sesskey URL | 保留 cmid/游标，剔除凭据 | 事件解析 |
