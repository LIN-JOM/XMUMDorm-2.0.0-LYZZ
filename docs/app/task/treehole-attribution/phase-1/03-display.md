# 列表与详情显示同一声明

日期：2026-10-19；版本：1.0。

## 1. 任务位置

- Phase 1 “转载 · WX”完成端到端闭环：读者能看到声明。
- 推进 R-5 列表和详情展示声明，旧帖子保持兼容及 R-6 中文、英文和读屏文案完整。
- 前置：接口与表单已贯通；后继：Phase 2 所有来源与组合校验可用。

## 2. 开发信息

**先读**

- app/src/features/campus/treeholePostViewModel.ts — 元数据如何规范化？
- app/src/features/campus/TreeholePostParts.tsx — 列表和详情共享哪些部件？
- app/src/features/campus/TreeholePostRow.tsx — 紧凑标题区如何安排？
- app/src/features/campus/TreeholePostDetail.tsx — 如何隔离匿名墙？
- app/src/__tests__/p2x-treehole-post.test.tsx — 列表与详情从哪里验证？

**已定**

- README.md §2：历史空值不标为原创，匿名墙不显示声明。
- README.md §3：列表和详情共用声明文本，不修改正文。

**边界与测试缝**

- 使用现有展示模型与树洞组件测试；不新建请求机制。
- 触达数据类型、投影、共享展示和夹具。

**运行**

- cd app && npm test -- --runInBand p2x-treehole-post p2x-bing-campus p0-03-i18n
- cd app && npm run typecheck && npm run lint

**未知项**

- 本轮无真机布局证据；以组件测试验证声明不挤入作者身份行。

## 3. 工作流

1. 阅读开发信息，复述：列表和详情显示经验证的声明。
2. 在展示模型与组件缝写失败用例，证明声明尚未显示。
3. 投影声明与来源，忽略历史空值和不合法组合。
4. 在标题区加入复用文本部件，隔离匿名详情。
5. 补充中英文展示、未知声明和旧帖用例。
6. 完成定向回归、类型检查和 lint，提交实现与验证记录。

## 4. 测试用例

| 用例 | 输入 | 预期 | 测试缝 |
|---|---|---|---|
| WX 转载 | repost、WX | 列表和详情均为转载 · WX | 树洞组件 |
| 原创 | original | 显示原创 | 树洞组件 |
| 旧帖 | 声明缺失 | 不显示声明 | 展示模型与组件 |
| 非法组合 | repost、空来源 | 不显示不完整声明 | 展示模型 |
| 匿名墙 | anonymous、转载数据 | 不显示声明 | 树洞详情 |
