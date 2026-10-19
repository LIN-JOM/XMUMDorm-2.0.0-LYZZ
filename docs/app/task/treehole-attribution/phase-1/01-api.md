# 声明创建后可读回

日期：2026-10-19；版本：1.0。

## 1. 任务位置

- Phase 1 “转载 · WX”完成端到端闭环：发布后列表和详情能读取声明。
- 推进 R-4 声明和来源必须持久保存并随帖子返回，兼容历史空值。
- 前置：任务批次写完；后继：发布表单接入、列表和详情展示。

## 2. 开发信息

**先读**

- routes/posts.js — 创建、回执、列表和详情在哪里组装？
- __tests__/routes/posts.test.js — 现有路由如何模拟数据库？
- shared/api/posts.js — multipart 如何传送业务字段？
- migrations/075_shop_store_soft_delete.sql — 如何编写可重入迁移？

**已定**

- README.md §2：content_origin 与 repost_source 独立于正文。
- README.md §2：旧客户端和公告不被强制标为原创。

**边界与测试缝**

- 使用现有帖子路由测试和共享 API 测试；不新建服务层。
- 触达迁移、入参校验、创建回执、列表和详情投影。

**运行**

- npm test -- --runInBand __tests__/routes/posts.test.js __tests__/shared/postAttribution.test.js
- node --check routes/posts.js；App 类型检查留在表单与展示任务。

**未知项**

- 不执行连接真实数据库的命令；以迁移文件和模拟数据库验证记录边界。

## 3. 工作流

1. 阅读开发信息，复述：把 WX 声明沿创建、保存和读取传递。
2. 在现有路由缝增加失败用例，证明原逻辑丢弃声明。
3. 添加可空字段迁移，保留历史数据。
4. 校验入参并更新创建、回执、列表和详情查询。
5. 接入共享 API multipart 字段并验证兼容行为。
6. 运行测试和语法检查，提交测试与实现的独立意图。

## 4. 测试用例

| 用例 | 输入 | 预期 | 测试缝 |
|---|---|---|---|
| WX 转载 | repost、WX | 保存并读回相同声明 | 帖子路由 |
| 原创 | original、残留来源 | 来源保存 NULL | 帖子路由 |
| 无来源 | repost、空来源 | 400，未插入帖子 | 帖子路由 |
| 旧客户端 | 无声明 | 声明保存 NULL | 帖子路由 |
| multipart | repost、WX | 传送两项元数据 | 共享 API |
