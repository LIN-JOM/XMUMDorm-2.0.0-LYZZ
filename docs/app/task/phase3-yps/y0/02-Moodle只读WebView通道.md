## 1. Where this task sits

- Phase Y0 风险验证：Moodle 只读数据可穿过既有宿主，提醒与设备有证据。
- 推进 R-Y1 Moodle 与提醒风险验证：扩展现有 WebView 命令与消息边界。
- 前置：01 Moodle 响应标准化提交；后继：会话缓存；原生工作台与路由由后续批次接入。

## 2. What the developer needs to know

**Read first**
- `app/src/features/tools/SchoolSystemWebView.tsx` — 谁持有 WebView 与命令句柄？
- `app/src/features/tools/injectedScripts.ts` — 哪些旧消息必须保留？
- `app/src/__tests__/p0-08-school-systems.test.ts` — 怎样实际执行注入脚本？
- `app/src/__tests__/p1-14-tools-school-systems.test.tsx` — 怎样验证命令与回调？

**Settled**
- 页面内使用 Moodle `core/ajax` 调用批准的三种只读方法（上游 R-7）。
- Cookie 与 sesskey 留在页面；只回传白名单对象和有限错误状态。
- AJAX 与会话保持须真机验证；本任务不改甲的宿主路由和公共词条。

**Edges and seam**
- 仅工具域宿主、脚本与测试；不改变 AC/签到原有行为。
- seam：现有 WebView 命令句柄、注入执行与消息回调。

**Run**
- `cd app; npm.cmd run test:ci -- --runInBand p3y0-moodle-bridge p0-08 p1-14 p2y-e02`。
- `cd app; npm.cmd run typecheck`；`npm.cmd run lint -- --no-cache`。

**Unknowns**
- 站点 AMD/版本差异须记录失败状态；不读取凭据作为兜底。
- 未登录、超时或请求对应失败时不接受数据；没有设备不标通过。

## 3. The workflow

1. 阅读第 2 部分，把本任务复述成一句话。
2. 写执行脚本到回调的失败用例，运行并提交红测试。
3. 接通批准方法、参数校验与字段白名单。
4. 依次验证过期、错误、外域、重复和旧请求，先红后绿。
5. 扩展工具域句柄与回调，保持旧系统回归通过。
6. 运行域测试、typecheck、lint，提交实现与甲接线契约。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | Moodle 页课程命令 | 一次只读调用，对应请求回调 | 注入/消息 |
| 2 | 其他系统或外域页面 | 不发 Moodle 请求、不接数据 | 宿主/注入 |
| 3 | 登录页或登录异常 | 返回会话状态，无原始异常 | 注入/消息 |
| 4 | 旧请求或重复响应 | 不再次回调 | 命令/消息 |
| 5 | 带敏感额外字段的响应 | native 仅得到标准对象 | 注入/消息 |
