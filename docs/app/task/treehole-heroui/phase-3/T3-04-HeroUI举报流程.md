## 1. Where this task sits

- **Phase 3 讨论和反馈完成闭环**，目标是举报在详情内完成并给出可信结果。
- **T3-04 HeroUI 举报流程** 用 HeroUI Dialog/Sheet 组件替换旧举报表面。
- **Starts after**：Phase 2 HeroUI provider。**Waits on it**：T3-05 互动回归。

## 2. What the developer needs to know

**Read first**

- `app/src/features/campus/useCampusReport.ts` — 举报目标映射的唯一入口。
- `app/src/components/ui/ReportSheet.tsx` — 当前字段、确认和安全区规则。
- `app/src/features/campus/CampusScreens.tsx` — 打开、认证和成功关闭流程。
- `app/src/__tests__/p2x-bing-campus-report.test.tsx` — 举报并发和权限契约。

**Settled**

- 举报仍经 `useReport` 写入；表面不能绕过确认或认证。
- 失败保留用户输入；成功关闭表面并触发反馈。

**Edges and seam**

- 接缝为 `actions.report`；不改管理 API、理由枚举或截图契约。

**Run**

- `npm test -- p2x-bing-campus-report.test --silent`。
- `npm run typecheck`。

**Unknowns**

- 若 HeroUI 没有可用 BottomSheet，以 Dialog.Portal 表达同一模态语义并记录原因。

## 3. The workflow

1. 阅读第 2 部分并复述：新表面只承接已有举报状态机。
2. 写 case 1 的失败测试，断言理由和修剪后的说明送达状态机。
3. 封装 HeroUI 举报表面并接入详情打开入口。
4. 写 case 2 的失败测试，断言失败不会关闭或清空表单。
5. 保留登录入口与成功关闭行为并运行测试。
6. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 有理由及前后空格说明 | 发送修剪后的说明 | `useCampusReport` |
| 2 | 网络失败 | 表单继续可重试 | `TreeholeReport` |
| 3 | 游客提交 | 不写请求且给登录入口 | `useCampusReport` |
| 4 | 成功响应 | 关闭表面并显示成功反馈 | `CampusDetailScreen` |
