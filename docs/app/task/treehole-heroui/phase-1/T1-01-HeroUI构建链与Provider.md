# T1-01 HeroUI 构建链与 Provider

## 1. 这项任务位于哪里

- **阶段**：Phase 1 HeroUI 在本项目真实可用；目标是双端详情 tracer 能显示 HeroUI 组件。
- **推进**：推进 R-1 HeroUI Native 成为树洞唯一通用视觉层。
- **边界**：先完成依赖与根 Provider；不迁移树洞页面，等待 T1-02 真实详情 tracer。

## 2. 开发者需要知道什么

**先读**

- `app/package.json` — 当前 Expo 57 与原生依赖版本线。
- `app/src/app/_layout.tsx` — 根 Provider 顺序和全局 Toast 宿主。
- `app/babel.config.js` — Babel 插件能插入的位置。
- `app/metro.config.js` — Metro 配置需要保留的 monorepo 解析规则。
- `docs/app/evaluation/RN开源组件库调研.md` — HeroUI 与当前版本的兼容证据。

**已定**

- 只引入 HeroUI Native 及其官方要求的最小依赖。
- 现有 Expo Image、Reanimated、Safe Area 和 Worklets 保持版本线。
- 根布局仍只有一个 SafeAreaProvider，现有 ThemeProvider 暂不删除。

**边界与接缝**

- 接触 App 依赖、Babel、Metro、样式入口和根 Provider。
- 接缝：根布局挂载与 Expo 开发构建；不新增页面或数据请求。

**运行**

- `cd app; npx expo-doctor`
- `cd app; npm run typecheck`
- `cd app; npm test -- --runInBand p0-05-navigation.test.ts`

**未知**

- 若官方安装步骤与 Expo 57 文档冲突，停止并记录冲突。
- 若 Provider 必须替换现有主题根，停止并先调整 Phase 1 边界。

## 3. 工作流

1. 阅读本简报，用一句话复述：让 HeroUI 能在当前 App 根部安全挂载。
2. 获取 Expo 57 与 HeroUI 当前官方安装说明。
3. 写根布局与构建链的失败测试或源码断言。
4. 用 Expo 对齐命令安装最小依赖并配置 Provider。
5. 运行 doctor、类型检查和导航回归测试。
6. 提交构建链和 Provider 改动。

## 4. 测试用例

| 用例 | 输入 | 预期 | 接缝 |
|---|---|---|---|
| 1 | App 根布局 | HeroUI Provider 位于安全区根内 | 根布局 |
| 2 | 现有主题根 | SafeAreaProvider 仍只出现一次 | 导航源码测试 |
| 3 | Metro 启动 | `tokens` 与 `shared` 仍可解析 | Metro 配置 |
| 4 | Expo 57 依赖检查 | doctor 不报告版本失配 | Expo Doctor |
