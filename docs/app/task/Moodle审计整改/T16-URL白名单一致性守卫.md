# T16 URL 白名单一致性守卫

## 1. 任务位置

- Phase E 收掉 P-12 剩余两项代码收口，目标见 [第五批总览](14-第五批总览.md)。
- 本任务推进 P-12 余项：给两份同源 URL 规则加跨实现表驱动守卫，防各自漂移。
- 起始：无前置。后续：无。缺陷：D-12（知悉）。

## 2. 开发者需要知道

**Read first**

- `app/src/features/tools/moodle/contract.ts` — 投影侧的 `safeUrl`（内联，随函数注入）。
- `app/src/features/tools/moodle/detail.ts` — 只读侧的 `safeMoodleReadUrl`（同样注入）。
- `app/src/__tests__/p3y0-moodle-contract.test.ts`、`p3y3-moodle-detail.test.ts` — 两侧现有断言。
- `docs/app/design/App组件类型定义.md` §4 注入说明——为什么不能合并成一份。

**Settled**

- 两份规则**不合并**：都以 `toString()` 注入 WebView，必须自包含（T12 已记录）。
- 守卫只钉共同底线：外域/带凭据拒绝；只读侧接受的 URL，投影侧必须也能接受（否则详情打不开）。
- 两侧语义差异（投影会清洗 query，只读会拒绝多余参数）保留，不做统一。

**Edges and seam**

- seam：新测试文件同时 import 两个纯函数做对照，不改生产代码。
- 触 `app/src/__tests__/p3a8-moodle-url-rules.test.ts`；不动 contract/detail 实现。

**Run**

- `cd app; npx jest --ci --testPathPattern "p3a8-moodle-url-rules|p3y0-moodle-contract|p3y3-moodle-detail"`。
- `cd app; npx tsc --noEmit`。

**Unknowns**

- 若某条对照暴露真实不一致（只读能过、投影打不开），停下按两函数语义分别修，不要在守卫里放宽。

## 3. 工作流

1. 读四个入口，用一句话复述本任务。
2. 写对照表测试：外域、带用户名密码、含 sesskey、正常 view.php、pluginfile 五种输入。
3. 跑测试，暴露真实不一致（若有）再决定修哪侧。
4. 跑本任务命令。
5. 提交（纯测试）。

## 4. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `https://outside.example/...` | 两侧都拒绝 | contract / detail |
| 2 | `https://user:pass@l.xmu.edu.my/...` | 两侧都拒绝 | 同上 |
| 3 | 带 `sesskey` 的课程链接 | 投影清洗掉、只读拒绝 | 同上 |
| 4 | 正常 `course/view.php?id=42` | 两侧都接受 | 同上 |
| 5 | 正常 `pluginfile.php/.../content/...` | 只读接受时投影也接受 | 同上 |
