## 1. Where this task sits

- Phase Y0 风险验证：Moodle 只读数据可穿过既有宿主，提醒与设备有证据。
- 推进 R-Y1 Moodle 与提醒风险验证：清会话后旧数据不能回流。
- 前置：02 Moodle 只读 WebView 通道提交；后继：原生工作台；磁盘恢复待真实账号身份契约。

## 2. What the developer needs to know

**Read first**
- `app/src/features/tools/schoolSession.ts` — 清观察状态与会话变化在哪里发生？
- `app/src/features/tools/cacheIdentity.ts` — 旧异步响应如何用代次隔离？
- `app/src/shared/storage.ts` — 为何 key 护栏不能替代 payload 白名单？
- `docs/app/task/Phase3全面治理工程计划.md` — 为什么数据只留设备且清会话要清缓存？

**Settled**
- 本批只用会话代次隔离的设备内存缓存；不凭本项目 JWT 猜校方账号身份。
- 只保留用户明确选择且可见的课程对象；原始 payload 不进缓存。
- 清观察会话不等于校方登出；Cookie 留平台（上游隐私边界）。

**Edges and seam**
- 仅工具域 Moodle 缓存、清观察会话和相关测试；不改公共鉴权。
- seam：现有 clearSchoolSession 入口与 WebView 命令响应代次。

**Run**
- `cd app; npm.cmd run test:ci -- --runInBand p3y0-moodle-cache p3y0-moodle-bridge p1-14`。
- `cd app; npm.cmd run typecheck`；`npm.cmd run lint -- --no-cache`。

**Unknowns**
- 没有可信校方账号分区时不落盘；跨重启恢复留给 Phase Y3 Moodle 工作台。

## 3. The workflow

1. 阅读第 2 部分，把本任务复述成一句话。
2. 写清会话后旧响应回流的失败用例，运行并提交红测试。
3. 实现选择课程、会话代次与字段白名单内存缓存。
4. 接入 Moodle 清观察会话、登录页与卸载的失效路径。
5. 补换课、旧响应、其他系统与敏感字段用例，先红后绿。
6. 运行域测试、typecheck、lint，提交实现与磁盘恢复边界。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 清 Moodle 后返回旧响应 | 缓存仍空 | 清会话/代次 |
| 2 | 响应含未选课程 | 未选课程不入缓存 | 缓存写入 |
| 3 | 更换所选课程 | 取消选择对象立即移除 | 选择/读取 |
| 4 | 清 AC 观察状态 | Moodle 缓存不受影响 | 清会话 |
| 5 | 非标准字段与凭据 | 仅白名单字段留内存 | 缓存写入 |
