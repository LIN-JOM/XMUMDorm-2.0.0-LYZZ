## 1. Where this task sits

- **Phase 5 双端验收并移除树洞旧视觉路径**，目标是 Android 真实运行可用。
- **T5-03 Android 运行时验收** 记录 build、安装与关键互动检查。
- **Starts after**：T5-01、T5-02。**Waits on it**：T5-04 验收。

## 2. What the developer needs to know

**Read first**

- `docs/app/verification/treehole-heroui-phase-1-development-build.md` — 已有 Android build 基线。
- `app/src/features/campus/TreeholeMedia.tsx` — 详情拖拽与预览。
- `app/src/features/campus/TreeholeReport.tsx` — BottomSheet 行为。

**Settled**

- iOS 不作为当前门禁；环境限制必须如实记录。

**Edges and seam**

- 接缝为 Android development build；不手改 Expo 生成目录。

**Run**

- `npx expo prebuild --platform android --no-install`。
- Android debug build 与安装。

**Unknowns**

- Metro 若继续因 Windows pagefile 失败，记录为环境限制。

## 3. The workflow

1. 阅读第 2 部分并复述：只将真实运行结果作为门禁证据。
2. 构建并安装 Android APK。
3. 检查 BottomSheet、Toast、键盘与媒体。
4. 记录成功或环境阻碍。
5. 提交验证记录。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | Android build | 生成可安装 APK | Gradle |
| 2 | 举报动作 | BottomSheet 可关闭 | `TreeholeReport` |
| 3 | 三图详情 | 切图只在详情可用 | `TreeholeMedia` |
