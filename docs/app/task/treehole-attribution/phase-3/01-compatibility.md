# 旧帖和迁移缺失回执

日期：2026-10-20；版本：1.0。

## 1. 任务位置

- Phase 3 兼容旧帖并完成发布门禁：历史空值继续可读。
- 推进 R-5 列表和详情展示声明，旧帖子保持兼容。
- 前置：Phase 2 已完成；后继：双语与发布条件复核。

## 2. 开发信息

**先读**

- routes/posts.js — 列表、详情和创建回执如何保留空值？
- __tests__/routes/posts.test.js — 如何模拟旧行与缺失列？
- app/src/features/campus/campusModel.ts — 匿名投影如何隔离声明？
- migrations/076_post_attribution.sql — 历史值是否会被回填？

**已定**

- README.md：历史声明不推断为原创，迁移检查不连接真实数据库。
- Phase 1 约定：旧客户端省略声明保留 NULL。

**边界与测试缝**

- 沿用现有帖子路由、展示模型和树洞组件测试。
- 仅在真实失败暴露本功能缺陷时修复。

**运行**

- npm test -- --runInBand __tests__/routes/posts.test.js __tests__/shared/postAttribution.test.js --silent
- cd app && npm test -- --runInBand p2x-treehole-post-view-model p2x-treehole-post.test --silent
- cd app && npm run typecheck && npm run lint -- --quiet

**未知项**

- 公开 API 不能证明数据库 DDL 细节；只有连接目标数据库才能核实迁移。

## 3. 工作流

1. 阅读开发信息，复述：旧帖为空声明，缺失迁移不宣称创建成功。
2. 验证旧行经列表与详情返回时两个声明字段均为空。
3. 验证两个新增列缺失时均返回 503 和迁移提示。
4. 复核展示模型与匿名边界现有回归用例。
5. 运行检查，将通过项与限制写入证据并提交。

## 4. 测试用例

| 用例 | 输入 | 预期 | 测试缝 |
|---|---|---|---|
| 旧行 | 没有声明元数据 | 列表、详情返回 NULL | 帖子路由 |
| 缺失声明列 | content_origin 不存在 | 503，提示迁移 076 | 帖子路由 |
| 缺失来源列 | repost_source 不存在 | 503，提示迁移 076 | 帖子路由 |
| 旧帖显示 | 声明为空 | 无原创或转载标签 | 树洞组件 |
| 匿名墙 | 原始行含声明 | 不显示声明 | 展示模型与组件 |
