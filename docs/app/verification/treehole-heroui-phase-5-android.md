# 树洞 HeroUI Native Phase 5 Android 验证记录

## 结论

本轮 Android 本机构建未生成可安装 APK，因此没有把 BottomSheet、Toast、键盘、详情媒体拖拽和 TalkBack 记为已在真实设备验证。iOS 按当前约束不作为本机门禁。

## 已执行

- 在工作区执行 `npx expo prebuild --platform android --no-install`，成功完成。
- 为规避 Windows React Native CMake 的路径长度限制，将 `app/` 同步到短路径 `D:\xmumapp`；该目录的 `node_modules` 是指向工作区依赖的 junction，非提交源目录。
- 在短路径执行以下命令：

  ```powershell
  $env:GRADLE_OPTS='-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m -Dorg.gradle.parallel=false -Dorg.gradle.workers.max=1'
  $env:CMAKE_BUILD_PARALLEL_LEVEL='1'
  .\android\gradlew.bat -p android assembleDebug
  ```

- Gradle 在 `:app:mergeExtDexDebug` 失败，未产生 `D:\xmumapp\android\app\build\outputs\apk\debug\app-debug.apk`。

## 失败证据与影响

Gradle daemon 日志记录了：

```text
ERROR: D8: java.lang.OutOfMemoryError: Java heap space
Execution failed for task ':app:mergeExtDexDebug'.
BUILD FAILED in 3m 40s
```

这是 D8 合并 dex 时的 JVM 内存不足，不是树洞 TypeScript、HeroUI 组件或 Expo prebuild 的编译诊断。构建进程结束后保留的是 Gradle daemon，不能视为仍在构建。

本次短路径副本在构建开始后，工作区又提交了 `4e93620` 和 `189eb74`；故该失败尝试也**不能**作为这两个最新提交的 Android 构建结果。当前仍缺少以下 Android 运行时证据：

- `TreeholeReport` 的 BottomSheet 打开/关闭与成功 Toast；
- `TreeholeComposer` 的软键盘与发送锁；
- `TreeholeMedia` 详情页循环切换、横向拖拽和预览；
- TalkBack 与 200% 字号。

## 可复现建议

在具备更大可提交内存/pagefile 的 Windows 环境，或 CI/Linux/macOS 构建机上，从当前提交重新执行 Expo prebuild、`assembleDebug`、安装 APK 后再完成以上真实运行时清单。不要手工编辑 Expo 生成的 `android/` 目录。
