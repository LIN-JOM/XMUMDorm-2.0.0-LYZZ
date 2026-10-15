# 树洞 HeroUI Phase 1 自动验证基线

日期：2026-10-15  
任务：T1-04 自动验证基线

## 结论

HeroUI 引入后的树洞专项、主题、类型与设计规则均通过。全量 Jest 未能成为绿灯，原因是两项未触及的既有广场/食堂测试断言，非 HeroUI 模块解析或树洞行为回归。

## 通过的证据

| 检查 | 命令 | 结果 |
|---|---|---|
| 树洞与 HeroUI 专项 | `jest --runInBand p2x-treehole-heroui-spike.test.ts p2x-bing-campus.test.tsx --silent` | 70 tests passed |
| 主题 | `jest --runInBand p0-02-theme.test.tsx --silent` | 8 tests passed |
| 类型 | `npm run typecheck` | passed |
| 设计规则 | `npm run rulers` | passed；22 组 textSafe token 均达 AA |
| lint | `npm run lint` | 0 errors；保留工程既有 warnings |

## Expo Doctor

`npx expo-doctor` 为 20/21。唯一失败是 Expo SDK 57 的八项既有补丁版本落后：`expo`、`expo-asset`、`expo-constants`、`expo-linking`、`expo-notifications`、`expo-router`、`expo-sharing` 与 `jest-expo`。Doctor 未报告 HeroUI、Uniwind、Gesture Handler 或 Expo config 冲突。

本任务不升级这些依赖，避免把树洞视觉迁移扩大为 SDK 维护。

## 全量 Jest 阻断项

静默运行 `jest --ci --runInBand --silent` 时，树洞专项通过；已确认的失败如下：

| 用例 | 失败事实 | 与本任务关系 |
|---|---|---|
| `p1-17-canteen.test.tsx` 的 `TC-P1-17-7A` | 断言 `square-services`，当前广场渲染的是 `square-module-tabs` / `square-module-pager` | 食堂/广场历史断言，未修改 |
| `p2a-03-secondary-tabs-config.test.tsx` 的 `TC-P2A-03-5A` | 扫描到 `features/square/SquareHome.tsx` 也包含 `secondary.*` 词条 | 二级 Tab 历史源码扫描，未修改 |

两项失败不包含 HeroUI import、Metro、Uniwind、树洞详情或帖子 API。它们作为后续全量基线修复项保留，不归因于 Phase 1。

## 未覆盖的边界

Jest 不替代原生构建或真机 Portal/Reanimated 手势验证。Android 与 iOS development build 仍由 T1-05 处理。
