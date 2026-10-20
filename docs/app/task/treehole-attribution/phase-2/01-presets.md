# 所有预设来源贯通发布与读取

日期：2026-10-20；版本：1.0。

## 1. 任务位置

- Phase 2 所有来源与组合校验可用：七个预设可发布和读回。
- 推进 R-3 提供七个预设和自定义来源，以及 R-2 转载必须填写简单来源。
- 前置：Phase 1 已完成；后继：自定义输入接入。

## 2. 开发信息

**先读**

- shared/constants/postAttribution.js — 当前预设在哪里被三端使用？
- routes/posts.js — 哪一步在写库前校验来源？
- app/src/features/campus/postPublishFields.ts — 选项如何进入提交白名单？
- __tests__/routes/posts.test.js — 创建、列表与详情如何验证相同来源？

**已定**

- README.md：七个预设名称和顺序按用户原始需求。
- README.md：复用 100 字符字段，来源仅保存单行纯文本。

**边界与测试缝**

- 使用现有帖子路由、共享 API 和发布描述符测试。
- 统一来源规范化，保留旧客户端和公告行为。

**运行**

- npm test -- --runInBand __tests__/routes/posts.test.js __tests__/shared/postAttribution.test.js --silent
- cd app && npm test -- --runInBand p2x-bing-publish-contract --silent
- cd app && npm run typecheck && npm run lint -- --quiet

**未知项**

- 接口只收到最终来源文字，不能用预设白名单拒绝合法自定义文字。

## 3. 工作流

1. 阅读开发信息，复述：让七个预设沿已有声明链路完整传递。
2. 从帖子路由验证预设保存和读回，记录失败证据。
3. 扩展共享预设并统一纯文本来源校验。
4. 从描述符和 multipart 请求验证名称和字段不丢失。
5. 运行定向测试、类型检查和 lint，分别提交测试与实现。

## 4. 测试用例

| 用例 | 输入 | 预期 | 测试缝 |
|---|---|---|---|
| 七个预设 | WX 至 Whatsapp | 原样保存并读回 | 帖子路由 |
| 简短来源 | 两端空格 | 保存去空格文字 | 帖子路由 |
| 错误来源 | 数组、空白、超长、标记 | 400 且未写库 | 帖子路由 |
| 请求传递 | Telegram | multipart 来源为 Telegram | 共享 API |
| 表单选项 | 七个预设 | 顺序和名称准确 | 描述符 |
