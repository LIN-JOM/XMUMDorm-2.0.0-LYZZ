/**
 * Expo 全局类型声明的**入版本库**入口。
 *
 * 背景：`app/expo-env.d.ts` 由 Expo CLI 生成、按官方要求进 `.gitignore`，CI 检出里并不存在；
 * 它只有一行 `/// <reference types="expo/types" />`，其中包含 `declare module '*.css'`
 * 这类 side-effect 导入声明。缺了它，`src/app/_layout.tsx` 里的 `import '../../global.css'`
 * 在 CI 的 `tsc --noEmit` 下会报 TS2882（Cannot find module or type declarations for
 * side-effect import），于是类型检查在干净检出的机器上必然失败 —— 本地因为生成物在而看不出来。
 *
 * 这里用同一官方入口把声明固定下来：类型检查不再依赖任何本地生成物。
 * ⛔ 不要在这里抄写 `*.css` 等具体声明，避免与 `expo/types` 重复声明。
 */

/// <reference types="expo/types" />
