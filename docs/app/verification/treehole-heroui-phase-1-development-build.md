# 树洞 HeroUI Phase 1 development build 记录

日期：2026-10-15  
任务：T1-05 双端 Development Build

## Android

`npx expo prebuild --platform android --no-install` 成功完成：清理并重新生成 Android 工程后，Expo prebuild 结束为成功。HeroUI Native、Uniwind、Gesture Handler 与 Expo 配置均能被 Android 原生工程解析。

预构建将 `package.json` 的 `android` 命令同步为 `expo run:android`。这是包含原生模块的 development build 正确启动路径，不再将 Expo Go 作为验证替代品。

尚未生成可安装包：当前环境未登录 EAS，不能安全发起 internal distribution build。

## iOS

Windows 环境下运行 `npx expo prebuild --platform ios --no-install` 被 Expo 明确跳过：iOS 原生工程需要 macOS 或 Linux 环境生成。EAS CLI 当前也返回 `Not logged in`，因此不能发起云端 iOS development build。

## 结论

Android 预构建通过；Android/iOS 可安装 development build 与真机 tracer 验证仍需要已登录的 EAS 账户，且 iOS 需要云构建权限或 macOS/Linux 环境。本记录不把预构建成功表述为双端 build 成功。
