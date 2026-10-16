# T1-03 Campus 主题映射

## 1. 这项任务位于哪里

- **阶段**：Phase 1 HeroUI 在本项目真实可用；目标是双端详情 tracer 能显示 HeroUI 组件。
- **推进**：推进 R-1 HeroUI Native 成为树洞唯一通用视觉层 与 R-8 双端、双主题、无障碍与性能达标。
- **边界**：T1-02 已有可见 tracer；本任务只对齐 HeroUI 主题语义，不扩展树洞组件数量。

## 2. 开发者需要知道什么

**先读**

- `app/src/design-system/theme.tsx` — 当前亮暗主题、令牌和减弱动效真源。
- `tokens/generated/` — 当前颜色与尺寸生成物。
- `app/src/app/_layout.tsx` — 系统主题如何传入根 Provider。
- `docs/app/design/App树洞HeroUI-Native重构设计与实施计划.md` — Campus Blue、Action Yellow 与主题约束。
- HeroUI 官方主题文档 — CSS 变量和亮暗主题的配置方式。

**已定**

- Campus Blue 只用于主操作、选中态和身份强调。
- Action Yellow 只用于小面积提醒，不与蓝色做渐变。
- 系统减弱动效仍由现有主题真源决定。

**边界与接缝**

- 接触 HeroUI 主题配置和 tracer 样式。
- 接缝：现有 ThemeProvider 的亮暗主题测试；不重写设计令牌系统。

**运行**

- `cd app; npm test -- --runInBand p0-02-theme.test.tsx`
- `cd app; npm run typecheck`
- `cd app; npm run rulers`

**未知**

- 若 Uniwind 主题变量不能消费现有令牌，保留适配层并记录原因。
- 若主题映射要求全局替换旧主题，停止并报告超出本阶段的影响。

## 3. 工作流

1. 阅读本简报，用一句话复述：让 HeroUI tracer 使用 Campus 亮暗语义色。
2. 写亮暗主题和主操作色的失败断言。
3. 映射最小 HeroUI 主题变量到 Campus 语义色。
4. 在真实详情 tracer 验证按钮、表面和强调色。
5. 运行主题测试、类型检查和设计规则。
6. 提交主题映射改动。

## 4. 测试用例

| 用例 | 输入 | 预期 | 接缝 |
|---|---|---|---|
| 1 | 亮色系统主题 | 主操作使用 Campus Blue | ThemeProvider |
| 2 | 暗色系统主题 | HeroUI 表面和正文可读 | ThemeProvider |
| 3 | 提醒状态 | Action Yellow 不成为页面背景 | 详情 tracer |
| 4 | 减弱动效开启 | 主题继续传递减弱动效状态 | ThemeProvider |
