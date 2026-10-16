# 树洞 HeroUI Phase 1 development build 记录

日期：2026-10-15  
任务：T1-05 双端 Development Build

## Android

`npx expo prebuild --platform android --no-install` 成功完成：清理并重新生成 Android 工程后，Expo prebuild 结束为成功。HeroUI Native、Uniwind、Gesture Handler 与 Expo 配置均能被 Android 原生工程解析。

预构建将 `package.json` 的 `android` 命令同步为 `expo run:android`。这是包含原生模块的 development build 正确启动路径，不再将 Expo Go 作为验证替代品。

已在本机完成 debug APK 构建与模拟器安装：

```text
./gradlew.bat app:assembleDebug -x lint -x test --configure-on-demand --build-cache \
  -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=x86_64

BUILD SUCCESSFUL
450 actionable tasks: 61 executed, 389 up-to-date

adb -s emulator-5554 install -r D:\xmumapp\android\app\build\outputs\apk\debug\app-debug.apk
Success

adb -s emulator-5554 shell pm list packages com.xmumdorm.app
package:com.xmumdorm.app
```

本机工作区路径会使 React Native CMake 超出 Windows 路径上限，因此构建使用短路径临时副本 `D:\xmumapp`，并复用原工作区 `node_modules`。该副本不包含业务源码修改，目的是让 CMake 生成目录缩短；构建输入仍为当前项目代码。为了规避本机 Windows commit 限制，Gradle 与 CMake 均以单 worker/单并发运行，未修改 Expo 生成的 `android/` 配置文件。

## 当前验证范围

用户已明确当前只推进 Android；iOS 不再是本阶段继续 Android 迁移的前置条件。

Android SDK、`adb`、Pixel 7 x86_64 模拟器、NDK 27.1、Build Tools 36 与 CMake 3.22.1 已就绪；应用已成功安装。

设备内运行的交互验收（HeroUI Dialog、TextArea 与 Toast）尚未完成。原因是当前 Windows 环境无可用页面文件：在 APK 构建后启动 Metro 时，Node 在约 6 MB 半空间提交阶段即报 `NewSpace::EnsureCurrentCapacity Allocation failed`；带图形的模拟器同样在宿主图层渲染处不稳定。无窗口软件 GPU 模式能够稳定启动和安装，但 Metro 无法在该环境提供 bundle。因此这项剩余验证需要恢复系统可提交内存（例如启用/扩展页面文件）后进行。

## 结论

Android 预构建、原生 debug APK 构建和模拟器安装均通过。当前不把它表述为 HeroUI tracer 的完整设备交互验收；后者仍受宿主机可提交内存限制，且应在 Metro 可运行后补测。
