# 树洞 HeroUI Native Phase 1 汇总

窗口：2026-10-15；基线：[树洞 HeroUI Native 重构设计与实施计划](../design/App树洞HeroUI-Native重构设计与实施计划.md)。

## 1. 摘要

**本轮：HeroUI Native 已接入真实树洞详情和 Campus 主题，但双端可安装 development build 尚未取得。**

| # | 变化 | 位置 | 类型 | 状态 | 对读者的意义 |
|---|---|---|---|---|---|
| C-1 | HeroUI 原生运行链接入 | `app/_layout.tsx`、Metro、全局 CSS | 新增 | 已完成 | App 可加载 HeroUI、Uniwind 与手势根。 |
| C-2 | 真实详情 tracer | `features/campus/TreeholeHeroUITracer.tsx` | 新增 | 已完成 | 真实帖子可展示头像、按钮、输入、浮层与反馈，不改互动接口。 |
| C-3 | Campus 语义主题桥接 | `app/global.css` | 新增 | 已完成 | HeroUI 亮暗表面与主操作色使用 Campus token 语义。 |
| C-4 | 自动化验证记录 | `docs/app/verification/**` | 新增 | 已完成 | 后续页面迁移可区分树洞通过项与工程既有失败。 |
| C-5 | 原生 development build | Android / iOS | 已变更 | 进行中 | Android 预构建成功；尚无可安装双端构建。 |

例行工作：新增 HeroUI 专项断言、调整 Jest ESM 转换、同步本地 `expo run:*` 脚本。

## 2. 这意味着什么

树洞页面具备 HeroUI 的最小真实运行基础，且没有改变当前帖子、评论、点赞、举报和万能墙的边界。下一阶段可开始将页面呈现逐步收敛为树洞业务组件，但原生可安装包仍是进入全量迁移前的未完成门槛。

## 3. 仍未完成

- EAS CLI 未登录，Android internal development build 尚未生成，因此不能确认 tracer 在可安装 Android 包中的行为。
- 当前运行在 Windows，Expo 跳过了 iOS native project 生成；iOS development build 和真机浮层/手势尚无证据。
- 全量 Jest 仍被两个未触及的广场/食堂历史断言阻断；树洞专项、类型和 token 门禁均已通过。
