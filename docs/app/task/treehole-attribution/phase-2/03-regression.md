# 草稿和来源切换保持一致

日期：2026-10-20；版本：1.0。

## 1. 任务位置

- Phase 2 所有来源与组合校验可用：来源切换和草稿恢复均能正确发布。
- 加固 R-1 发布时必须声明原创或转载、R-2 转载必须填写简单来源及 R-6 中文、英文和读屏文案完整。
- 前置：预设和自定义均已接入；后继：Phase 3 真机和发布验收。

## 2. 开发信息

**先读**

- app/src/__tests__/publish-attribution.test.tsx — 如何重放草稿并通过真实表单提交？
- app/src/__tests__/p2x-bing-publish-contract.test.ts — 如何阻止无效组合进入接口？
- app/src/__tests__/p2x-treehole-post.test.tsx — 如何验证列表和详情双语一致？
- __tests__/routes/posts.test.js — 旧客户端和非法元数据如何保持兼容？

**已定**

- README.md：切回原创提交空来源，切回预设不提交残留自定义文字。
- README.md：不强制旧客户端补声明，不把旧帖推断为原创。

**边界与测试缝**

- 继续使用已有宿主、描述符、路由、展示模型与组件测试。
- 不扩大到部署、权限或其他发布页面。

**运行**

- cd app && npm test -- --runInBand publish-attribution p2x-bing-publish p2x-treehole-post p2x-bing-campus p0-03-i18n --silent
- npm test -- --runInBand __tests__/routes/posts.test.js __tests__/shared/postAttribution.test.js __tests__/routes/termsPublishingGate.test.js --silent
- cd app && npm run typecheck && npm run lint -- --quiet

**未知项**

- 上一版 WX 草稿没有自定义字段，恢复时必须继续使用现有默认值合并。

## 3. 工作流

1. 阅读开发信息，复述：草稿和切换后提交的来源与用户所见一致。
2. 重放自定义草稿后切到预设并发布，核对实际提交值。
3. 验证切回原创、空自定义和旧版草稿的行为。
4. 验证七个预设和自定义来源在中英文列表及详情中的呈现。
5. 运行全部相关回归、类型检查与 lint，保存实际结果。
6. 提交任务，并按 easy-summary 保存交付记录。

## 4. 测试用例

| 用例 | 输入 | 预期 | 测试缝 |
|---|---|---|---|
| 自定义草稿 | 学院群聊 | 恢复原文并可发布 | 表单宿主 |
| 切到预设 | 自定义改成 QQ | 提交 QQ | 表单宿主 |
| 切到原创 | 存在自定义文字 | 提交空来源 | 表单宿主 |
| 缺少声明 | 新 App 提交值缺失 | 阻止接口请求 | 描述符 |
| 中英文 | 预设或自定义来源 | 两处文案一致且可读屏 | 树洞组件 |
