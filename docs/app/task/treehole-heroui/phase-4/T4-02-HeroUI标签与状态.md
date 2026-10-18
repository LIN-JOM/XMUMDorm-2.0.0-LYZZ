## 1. Where this task sits

- **Phase 4 整条树洞流迁移且状态不断**，目标是筛选状态与流视觉一致。
- **T4-02 HeroUI 标签与状态** 迁移标签、加载、空态和错误态。
- **Starts after**：T4-01。**Waits on it**：T4-05 全量回归。

## 2. What the developer needs to know

**Read first**

- `app/src/features/campus/CampusScreens.tsx` — 标签读取与错误隔离。
- `app/src/components/ui/FilterChips.tsx` — 当前筛选契约。
- `app/src/components/ui/ListScreen.tsx` — 加载、空错状态入口。

**Settled**

- 标签 ID、查询参数和缓存键不变；不把标签失败变成整流失败。

**Edges and seam**

- 接缝是 `CampusFeed` 的 filter 与 labels；不改接口。

**Run**

- `npm test -- p2x-bing-campus.test --silent`。
- `npm run typecheck`。

**Unknowns**

- 若 HeroUI 没有等价可访问 Chip 变体，使用现有筛选行为并记录。

## 3. The workflow

1. 阅读第 2 部分并复述：筛选行为不能由视觉重置。
2. 写标签切换失败测试。
3. 封装 HeroUI 标签与状态表面。
4. 接入加载、空态和错误态。
5. 运行验证并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 选择标签 | 请求携带对应 tagId | `CampusFeed` |
| 2 | 标签目录失败 | 帖子仍可阅读 | `useCampusTags` |
| 3 | 空列表 | 显示可操作空态 | `ListScreen` |
