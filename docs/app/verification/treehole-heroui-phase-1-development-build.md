# 树洞 HeroUI Phase 1 development build 记录

日期：2026-10-15  
任务：T1-05 双端 Development Build

## Android

`npx expo prebuild --platform android --no-install` 成功完成：清理并重新生成 Android 工程后，Expo prebuild 结束为成功。HeroUI Native、Uniwind、Gesture Handler 与 Expo 配置均能被 Android 原生工程解析。

预构建将 `package.json` 的 `android` 命令同步为 `expo run:android`。这是包含原生模块的 development build 正确启动路径，不再将 Expo Go 作为验证替代品。

尚未生成可安装包：当前环境未登录 EAS，不能安全发起 internal distribution build。

## 当前验证范围

用户已明确当前只推进 Android；iOS 不再是本阶段继续 Android 迁移的前置条件。

Android 本机安装验证仍有两个外部前置条件：当前环境没有 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`，也找不到 `adb`，所以不能运行 `expo run:android` 或向模拟器/设备安装。EAS CLI 仍返回 `Not logged in`，所以也不能发起 Android internal development build。

## 结论

Android 预构建通过；可安装 Android development build 与真机 tracer 验证仍需要 Android SDK/可用设备，或已登录的 EAS 账户。本记录不把预构建成功表述为 Android 安装包成功。
