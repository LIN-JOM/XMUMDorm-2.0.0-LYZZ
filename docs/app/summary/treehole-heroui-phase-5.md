# 树洞 HeroUI Native Phase 5 总结

基线：`treehole-heroui-phase-4.md`。窗口：2026-10-15。来源：重构设计与实施计划及本阶段提交。

## 1. 摘要

**本轮清除了树洞详情的旧视觉壳，并完成代码级回归；Android 设备验收仍受本机 D8 内存失败限制。**

| # | 变更 | 位置 | 类型 | 状态 | 对读者的影响 |
|---|---|---|---|---|---|
| C-1 | 删除 Phase 1 tracer | `TreeholeHeroUITracer.tsx` | 移除 | 完成 | 详情不再显示临时探针 |
| C-2 | 树洞脱离旧详情壳 | `CampusScreens.tsx` | 修改 | 完成 | 标题、作者和互动只显示一次 |
| C-3 | 媒体与筛选支持双语 | `TreeholeMedia.tsx` | 修复 | 完成 | 英文界面不再混入中文 |
| C-4 | 修正 HeroUI 组件类型 | 媒体、举报组件 | 修复 | 完成 | TypeScript 检查可通过 |
| C-5 | Android 构建记录 | 验证记录 | 修改 | 进行中 | 未能生成 APK 或设备证据 |

Routine：删除旧 tracer 断言，补充标题唯一性与英文媒体回归测试。

## 2. 这意味着什么

树洞详情现只把 `Screen` 用作安全区和滚动结构，视觉内容由 HeroUI Native 树洞业务组件提供。
万能墙保留独立匿名路径，未混入树洞实名作者、媒体或讨论展示。
专项回归和 TypeScript 均通过，当前代码层的交互与数据边界可继续维护。

## 3. 仍未完成

- Android 的 D8 dex 合并耗尽 JVM 堆，缺少当前提交的 APK 与安装证据。
- BottomSheet、Toast、软键盘、媒体拖拽、TalkBack 和 200% 字号尚未在设备运行时确认。
- iOS 不在本机门禁范围，尚未验收。

## Changelog

- `4e93620`：本地化媒体控件与筛选清除动作。
- `189eb74`：树洞详情移除旧 `DetailScreen` 视觉壳。
- `d5120de`：记录 Android 构建的 D8 内存失败。
- `ba55184`：修正 HeroUI BottomSheet 类型与媒体 Hook 顺序。
