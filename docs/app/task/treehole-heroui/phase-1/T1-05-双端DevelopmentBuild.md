# T1-05 双端 Development Build

## 1. 这项任务位于哪里

- **阶段**：Phase 1 HeroUI 在本项目真实可用；目标是双端详情 tracer 能显示 HeroUI 组件。
- **推进**：推进 R-1 HeroUI Native 成为树洞唯一通用视觉层 与 R-8 双端、双主题、无障碍与性能达标。
- **边界**：自动验证已通过；本任务验证原生构建和可见 tracer，不迁移完整树洞信息流。

## 2. 开发者需要知道什么

**先读**

- `app/app.json` — Expo 插件、iOS bundle 和 Android package 配置。
- `app/eas.json` — development build profile 与构建命令。
- `app/package.json` — Expo 57 与开发脚本。
- `app/android/` — 已生成原生工程的当前状态，不能手动修改。
- `docs/app/design/App树洞HeroUI-Native重构设计与实施计划.md` — 双端构建是 Phase 1 的门。

**已定**

- 先使用 development build，不以 Expo Go 代替原生验证。
- 只在 app.json 与配置插件表达原生需求，不手改 android 或 ios 生成文件。
- 无法访问签名、Mac 或 EAS 账户时记录阻塞，不伪造双端通过。

**边界与接缝**

- 接触 Expo development build 配置和构建记录。
- 接缝：Android 与 iOS development build；不改业务页面行为。

**运行**

- `cd app; npx expo prebuild --platform android --no-install`
- `cd app; npx expo prebuild --platform ios --no-install`
- `cd app; npx eas-cli@latest build --profile development --platform android`

**未知**

- 若本机没有 iOS 构建环境或 EAS 未登录，记录命令输出和阻塞条件。
- 若预构建改写生成文件，停止并确认变更是否来自本阶段配置。

## 3. 工作流

1. 阅读本简报，用一句话复述：用双端 development build 验证 HeroUI 原生依赖。
2. 检查 EAS profile 与 Expo 插件是否满足 development build。
3. 运行 Android 与 iOS 预构建检查，不手改生成目录。
4. 发起 Android development build 并记录结果。
5. 在可用环境发起 iOS development build 或记录环境阻塞。
6. 提交构建配置或结果记录。

## 4. 测试用例

| 用例 | 输入 | 预期 | 接缝 |
|---|---|---|---|
| 1 | Android 预构建 | HeroUI 原生配置可解析 | Expo prebuild |
| 2 | iOS 预构建 | HeroUI 原生配置可解析 | Expo prebuild |
| 3 | Android development build | 安装包能启动详情 tracer | Android build |
| 4 | iOS development build | 安装包能启动详情 tracer | iOS build |
