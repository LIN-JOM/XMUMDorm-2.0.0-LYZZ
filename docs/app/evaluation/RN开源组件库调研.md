# React Native 开源组件库调研

**核验日期**：2026-10-15（Asia/Singapore）  
**目标基线**：Expo SDK **57.0.26** / React Native **0.86.3** / React **19.2.3** / Reanimated **4.5.1** / Worklets **0.10.1**  
**证据范围**：仅使用各项目 GitHub 仓库、官方文档、GitHub Releases/Actions、npm 元数据；未引用博客、榜单或营销聚合站。GitHub Star 为查询日近似值，会随时间变化。  
**验证边界**：本轮是候选事实核验，没有安装候选、没有运行 iOS/Android 真机构建；“peer range 可解”不等于“已在 RN 0.86 真机验证”。

## 1. 结论先行

如果所有者已经决定从“自建设计系统”转向“完整开源 UI kit”，本项目的分层结论如下。

| 层级 | 候选 | 结论 |
|---|---|---|
| **A：优先试点** | **HeroUI Native 1.0.10** | **最适合本项目先做 spike。** 官方示例和库自身开发环境直接使用 Expo 57、RN 0.86.3、React 19.2.3、Reanimated 4.5.1、Worklets 0.10.1，与本项目版本线高度重合；默认视觉现代，组件覆盖和暗色主题较完整。主要代价是引入 Uniwind、Gesture Handler 和原生代码。 |
| **A：保守备选** | **React Native Paper 5.15.3** | **若接受 Material 3 视觉，这是风险更低、生态更成熟的备选。** 组件齐、主题成熟、纯 JS 层风险相对低；但默认视觉强烈偏 Material，且内部组件会使用 Material Design 图标体系，与项目当前 Lucide 单图标体系冲突。官方没有给出 RN 0.86 的明确验证声明。 |
| **B：条件采用** | **UI Kitten 6.2.1**、**Tamagui 3.0.13** | UI Kitten 对新架构、Expo、无障碍覆盖写得最透明，但 Eva 视觉身份较强；Tamagui 活跃、现代、组件和主题能力强，但它同时是样式引擎和跨端平台，对当前原生 App 偏重。两者都应先做单屏 spike。 |
| **C：只在接受“源码归项目维护”时采用** | **gluestack-ui v5**、**React Native Reusables** | 两者的现代观感很好，但主流使用方式是 CLI/copy-paste，把组件源码复制进仓库。它们减少从零编写，却不会消除后续维护，本质上仍由项目承担升级、无障碍和适配责任，不完全符合“不要自研、交给库维护”的原始目标。 |
| **不作为基座** | RNEUI、React Native UI Lib、NativeBase、NativeWind、Restyle、Unistyles | RNEUI v5 官方自己提示初版仍会有 bug，且缺少 RN 0.86/新架构明确信号；RNUILib 原生依赖面大且新架构文档信号不一致；NativeBase 已 deprecated；NativeWind、Restyle、Unistyles只是样式引擎，不提供现成业务组件。 |

**本项目推荐**：先用 **HeroUI Native** 在一个独立、代表性强但边界可控的页面做 spike，至少覆盖 `Button + Input + Select + Dialog/BottomSheet + Toast + dark mode + font scaling + VoiceOver/TalkBack`。如果原生依赖、Uniwind 构建链或品牌重绘成本不可接受，则退到 **React Native Paper**，但要明确接受 Material 视觉和图标体系影响。不要同时引入两套完整 UI kit。

## 2. 决策前必须处理的仓库约束

这次选型不是普通依赖替换，而是对现行设计治理的方向性修改：

- 当前 [App 设计宪法 §9.11](../constitution/App设计宪法.md) 明确禁止完整 UI kit 和 `nativewind` / `restyle` / `unistyles` / `tamagui` 作为基座。
- 当前 [App 依赖准入登记](./App依赖准入登记.md) 已把 Paper、Tamagui、RNUILib、UI Kitten、RNEUI、NativeWind、Restyle、Unistyles列为拒绝项。
- 脚手架测试 [`p0-01-scaffold.test.ts`](../../../app/src/__tests__/p0-01-scaffold.test.ts) 有对应禁止依赖断言；只修改 `package.json` 会直接破坏现有验证门。
- 当前 [`app/src/components/ui`](../../../app/src/components/ui) 有 **71 个文件**，在 `app/src` 中有 **129 个文件**引用 `components/ui`。其中一部分是可由通用库替换的原子组件，另一部分是 `ChatBubble`、`CommentThread`、`EntityCard`、`MediaGrid` 等业务组合，不可能由通用 UI kit 直接替代。复现命令：

  ```powershell
  (rg --files app/src/components/ui | Measure-Object).Count
  (rg -l "@/components/ui|\.\./components/ui|components/ui" app/src -g '*.ts' -g '*.tsx' | Measure-Object).Count
  ```

因此，采用前必须先由所有者修改宪法、依赖准入和脚手架门禁，再做分批迁移。不能一边保留“UI kit 禁止项”，一边把完整 UI kit 装进生产依赖。

## 3. 活跃度、版本与许可证快照

Star、release 和默认分支提交均于 **2026-10-15** 查询。版本时间取对应版本自身的 npm/GitHub 发布时间，不使用 npm `time.modified`。

| 候选 | Stars（约） | 最新稳定版本 / 发布时间 | 默认分支最近提交 | 许可证 | 维护判断 |
|---|---:|---|---|---|---|
| [React Native Paper](https://github.com/callstack/react-native-paper) | 14.5k | [`5.15.3`](https://github.com/callstack/react-native-paper/releases/tag/v5.15.3)，2026-05-26 | [`ce72155`](https://github.com/callstack/react-native-paper/commit/ce72155)，2026-10-12 | [MIT](https://github.com/callstack/react-native-paper/blob/main/LICENSE.md) | 活跃维护，发版节奏稳健 |
| [Tamagui](https://github.com/tamagui/tamagui) | 14.3k | [`3.0.13`](https://github.com/tamagui/tamagui/releases/tag/v3.0.13)，2026-10-14 | [`b8e5570`](https://github.com/tamagui/tamagui/commit/b8e5570)，2026-10-14 | [MIT](https://github.com/tamagui/tamagui/blob/main/LICENSE) | 非常活跃，刚完成 v3 主线 |
| [NativeWind](https://github.com/nativewind/nativewind) | 8.1k | [`4.2.7`](https://github.com/nativewind/nativewind/releases/tag/nativewind%404.2.7)，2026-09-14 | [`f9cfae6`](https://github.com/nativewind/nativewind/commit/f9cfae6)，2026-09-15 | [MIT](https://github.com/nativewind/nativewind/blob/main/LICENSE) | 活跃；但它不是组件库 |
| [React Native Reusables](https://github.com/founded-labs/react-native-reusables) | 8.7k | 最近 GitHub release 为 [`rn-primitives@1.4.0`](https://github.com/founded-labs/react-native-reusables/releases/tag/rn-primitives%401.4.0)，2026-03-28；`@rn-primitives/*` npm 已到 1.5.x | [`385834c`](https://github.com/founded-labs/react-native-reusables/commit/385834c)，2026-09-27 | [MIT](https://github.com/founded-labs/react-native-reusables/blob/main/LICENSE) | 活跃，但版本由 CLI、registry 和 primitives 多部分组成 |
| [gluestack-ui](https://github.com/gluestack/gluestack-ui) | 5.3k | [`v5.0.0`](https://github.com/gluestack/gluestack-ui/releases/tag/v5.0.0)，2026-06-25；`@gluestack-ui/core` npm 为 [`5.0.15`](https://www.npmjs.com/package/@gluestack-ui/core/v/5.0.15) | [`b712c85`](https://github.com/gluestack/gluestack-ui/commit/b712c85)，2026-09-02 | npm 元数据为 MIT；[README 也声明 MIT](https://github.com/gluestack/gluestack-ui#license) | 主线已转为 v5 copy-paste 体系；每日 Expo Latest CI |
| [RNEUI / React Native Elements](https://github.com/react-native-elements/react-native-elements) | 25.9k | [`5.0.0`](https://github.com/react-native-elements/react-native-elements/releases/tag/v5.0.0)，2026-01-19 | [`32ae0ed`](https://github.com/react-native-elements/react-native-elements/commit/32ae0ed)，2026-05-21 | [MIT](https://github.com/react-native-elements/react-native-elements/blob/next/LICENSE) | Star 很高，但 v5 是新维护团队恢复后的首个大版本 |
| [UI Kitten](https://github.com/akveo/react-native-ui-kitten) | 10.7k | [`@ui-kitten/components@6.2.1`](https://www.npmjs.com/package/@ui-kitten/components/v/6.2.1)，2026-10-06 | [`e73dce6`](https://github.com/akveo/react-native-ui-kitten/commit/e73dce6)，2026-10-06 | [MIT](https://github.com/akveo/react-native-ui-kitten/blob/master/LICENSE.txt) | 活跃，v6 已针对 React 19/新架构重建 |
| [NativeBase](https://github.com/GeekyAnts/NativeBase) | 20.4k | [`3.4.28`](https://www.npmjs.com/package/native-base/v/3.4.28)，2023-03-06 | [`335a1d5`](https://github.com/GeekyAnts/NativeBase/commit/335a1d5)，2026-01-31 | [MIT](https://github.com/GeekyAnts/NativeBase/blob/master/LICENSE) | npm 已 deprecated，官方要求新项目改用 gluestack-ui |
| [Restyle](https://github.com/Shopify/restyle) | 3.4k | [`2.4.5`](https://github.com/Shopify/restyle/releases/tag/v2.4.5)，2025-03-19 | [`799b804`](https://github.com/Shopify/restyle/commit/799b804)，2026-09-29 | [MIT](https://github.com/Shopify/restyle/blob/master/LICENSE.md) | 仍维护，但定位是建 UI 库的样式工具 |
| [Unistyles](https://github.com/jpudysz/react-native-unistyles) | 3.0k | [`3.5.3`](https://github.com/jpudysz/react-native-unistyles/releases/tag/v3.5.3)，2026-10-13 | [`133f901`](https://github.com/jpudysz/react-native-unistyles/commit/133f901)，2026-10-14 | [npm 元数据为 MIT](https://www.npmjs.com/package/react-native-unistyles/v/3.5.3)；GitHub API 未识别仓库许可证 | 非常活跃，但定位是原生加速样式引擎 |
| [React Native UI Lib](https://github.com/wix/react-native-ui-lib) | 7.2k | npm [`9.1.3`](https://www.npmjs.com/package/react-native-ui-lib/v/9.1.3)，2026-09-06；最近 GitHub release 为 9.1.0 | [`1d6f609`](https://github.com/wix/react-native-ui-lib/commit/1d6f609)，2026-10-12 | [MIT](https://github.com/wix/react-native-ui-lib/blob/master/LICENSE) | 活跃，但原生依赖和架构迁移面较大 |
| [HeroUI Native](https://github.com/heroui-inc/heroui-native) | 3.7k | [`1.0.10`](https://github.com/heroui-inc/heroui-native/releases/tag/v1.0.10)，2026-09-21 | [`122f63d`](https://github.com/heroui-inc/heroui-native/commit/122f63d)，2026-09-21 | [Apache-2.0](https://github.com/heroui-inc/heroui-native/blob/main/LICENSE) | 较新但活跃，版本线与本项目最贴近 |

## 4. Expo 57 / RN 0.86 / React 19 / 新架构兼容性

Expo 官方版本表明确：SDK 57 对应 RN 0.86 和 React 19.2.3；同时 SDK 55 以后只能运行新架构，不能回退旧架构。因此“只支持旧架构”在本项目不是可接受降级项。来源：[Expo SDK 57 版本表](https://docs.expo.dev/versions/v57.0.0)、[Expo New Architecture 指南](https://docs.expo.dev/guides/new-architecture/)。

| 候选 | 一手兼容性证据 | 对本项目的判断 |
|---|---|---|
| **HeroUI Native** | npm peer 为 React `>=19`、RN `>=0.81`、Reanimated `^4.1.1`、Safe Area `^5.6`、Worklets `>=0.5.1`；更强的证据是官方仓库 [`package.json`](https://github.com/heroui-inc/heroui-native/blob/main/package.json) 和 [`example/package.json`](https://github.com/heroui-inc/heroui-native/blob/main/example/package.json) 直接使用 RN **0.86.3**、React **19.2.3**、Reanimated **4.5.1**、Worklets **0.10.1**，示例使用 Expo **57**。 | **证据最强。** 版本与本项目几乎逐项相同。但包含 `android/ios/cpp/podspec`，还需 `react-native-gesture-handler` 和 Uniwind；必须 development build/原生重建，不能只在 Expo Go 或 Jest 中判断。 |
| **NativeWind 4.2.7** | 官方 [4.2.7 release](https://github.com/nativewind/nativewind/releases/tag/nativewind%404.2.7) 明确写明支持 Expo SDK 57，源码测试环境升级为 React 19 / RN 0.86，并兼容 Reanimated 3/4；[安装文档](https://www.nativewind.dev/docs/getting-started/installation) 同样列出 Expo 57。 | **样式引擎兼容证据强**，但不直接提供 Button、Dialog、Select 等组件。引入后还要增加 Babel、Metro、CSS 和 Tailwind 配置。 |
| **Tamagui 3** | [官方安装要求](https://tamagui.dev/docs/intro/installation) 为 React 19+、RN 0.81+ 且启用新架构；另有 [Expo 指南](https://tamagui.dev/docs/guides/expo)。npm `tamagui@3.0.13` peer 为 React `>=19`。 | **版本范围覆盖本项目**，但没有看到官方直接声明 RN 0.86.3 真机矩阵。完整套件依赖面和配置面较大，需 spike。 |
| **UI Kitten 6** | 官方 [README](https://github.com/akveo/react-native-ui-kitten) 明确称 v6 为 React 19、RN 0.81、新架构重建，并验证 Fabric + Expo 54；npm peer 为 React `>=18.2`、RN `>=0.72`、SVG `>=13`。 | **范围可解且新架构方向明确**；但官方明确验证点是 RN 0.81 / Expo 54，不是 0.86 / 57，仍需本项目真机构建。 |
| **gluestack-ui v5** | [安装文档](https://gluestack.io/ui/docs/home/getting-started/installation) 声明 Expo `>=50`；仓库有 [Expo Latest 工作流](https://github.com/gluestack/gluestack-ui/blob/main/.github/workflows/expo-latest.yml)，2026-10-15 的 [运行结果成功](https://github.com/gluestack/gluestack-ui/actions/runs/38669496867)。 | **有当前 Expo Latest 自动化证据**，但该工作流只创建最新 Expo 项目、添加全部组件并验证 Web bundle，**不是 iOS/Android 原生构建**。v5 还依赖 NativeWind v5/Tailwind 4 路线，需核对生成结果。 |
| **React Native Reusables** | `@rn-primitives/*` 的 npm peer 对 React/RN 使用宽范围；但官方 [`apps/showcase/package.json`](https://github.com/founded-labs/react-native-reusables/blob/main/apps/showcase/package.json) 当前仍是 Expo 56 / RN 0.85.3 / Reanimated 4.3.1。 | **没有 Expo 57 的同版本示例证据。** 底层 NativeWind 4.2.7 已支持 57，不代表整个 registry 组件已完成 57 真机回归。 |
| **React Native Paper 5** | npm peer 为 React `*`、RN `*`、Safe Area `*`；[官方 Expo 安装说明](https://callstack.github.io/react-native-paper/docs/guides/getting-started/) 完整。 | **依赖可解但证据偏间接。** 未发现官方 RN 0.86/Expo 57/新架构专项声明。Paper 本身主要是 JS，但其图标、Portal、动画和导航组合仍需回归。 |
| **RNEUI 5** | `@rneui/base@5.0.0` 没有声明 React/RN 版本 peer，只要求 Safe Area 和测试库；[安装文档](https://reactnativeelements.com/docs/installation) 支持 Expo。 | **peer 不阻止安装，但也没有构成兼容证明。** 官方 v5 release 明示这是新团队恢复维护后的首版，且“there will be bugs”，不适合作为本项目首选基座。 |
| **React Native UI Lib 9.1.3** | npm peer 接受 React `>=19`、RN `>=0.77.3`、Reanimated `>=3.19.4`、Gesture Handler `>=2.24`、Safe Area `>=5.6.2`，还强制 `uilib-native`；[安装文档](https://wix.github.io/react-native-ui-lib/docs/getting-started/setup) 要求多个原生依赖。仓库 README 仍写“正在升级以支持 New Architecture”。 | **peer 范围可解，但官方新架构信号不一致。** 在 SDK 57 无旧架构退路的前提下，未完成 iOS/Android spike 前不应准入。 |
| **Unistyles 3.5.3** | [官方要求](https://www.unistyl.es/v3/start/getting-started) 为 RN 0.81+、新架构、Expo 54+，并依赖 Nitro Modules；npm peer 同样为 RN `>=0.81`。 | **技术上覆盖本项目**，但它只解决样式，不提供组件；还引入 Nitro 原生层和 Babel 插件。 |
| **Restyle 2.4.5** | npm peer 为 React `*` / RN `*`，无直接依赖；[官方定位](https://shopify.github.io/restyle/) 是“用于构建 UI libraries”的类型化样式系统。 | 安装风险低，但**不会替换自研组件**，不满足本次目标。 |
| **NativeBase** | npm 已显示：`NativeBase has evolved into gluestack-ui`；官方 [README](https://github.com/GeekyAnts/NativeBase) 写明 deprecated/maintenance mode。 | **淘汰。** 不应给新项目引入已停更主线。 |

## 5. 组件覆盖、主题、无障碍与视觉

“视觉质量”是基于官方示例、组件页和默认主题的一致性判断，属于主观评价；它不是兼容性或无障碍合规证明。

### 5.1 HeroUI Native — 首选 spike

- **组件覆盖**：官方 [组件目录](https://www.heroui.com/docs/native/components) 包含 Button、Card、Checkbox、Input/InputOTP、Select、SearchField、TextArea、Accordion、Tabs、Menu、Dialog、Popover、BottomSheet、Toast、Skeleton、Slider 等，能覆盖本项目多数原子和常见复合控件。业务型 `ChatBubble`、`CommentThread`、`EntityCard`、媒体网格仍需保留项目实现。
- **主题/暗色**：官方 [Theming](https://www.heroui.com/en/docs/native/getting-started/theming) 基于 Tailwind v4 + Uniwind CSS variables，默认自动支持亮/暗模式，也允许自定义多主题。
- **无障碍**：官方 [介绍页](https://www.heroui.com/en/docs/native/getting-started) 声明每个组件包含焦点、触控和读屏支持；Provider 还可统一开启字体缩放、限制最大倍率和关闭动画。此处仍属于库方声明，必须用 VoiceOver/TalkBack 和放大字号实测。
- **视觉质量**：**高**。默认视觉比 Paper/RNEUI 更现代，动画和细节完整，适合用户明确追求“不要自己从零打磨视觉”的目标。
- **迁移风险**：**高**。需要 Uniwind、Gesture Handler、Reanimated/Worklets 配置；包本身含原生代码；部分 Overlay/BottomSheet/Blur 能力带额外 peer。它不是简单替换 `Button.tsx` 的一行依赖。

### 5.2 React Native Paper — 成熟、保守、Material 明确

- **组件覆盖**：[官方组件导航](https://callstack.github.io/react-native-paper/docs/guides/getting-started/) 包含 Appbar、Avatar、Badge、Button、Card、Checkbox、Chip、DataTable、Dialog、Drawer、FAB、List、Menu、Modal、Portal、Radio、Searchbar、SegmentedButtons、Snackbar、Switch、TextInput、Tooltip 等，成熟度和文档完整度都高。
- **主题/暗色**：[Theming](https://callstack.github.io/react-native-paper/docs/guides/theming/) 提供 Material 3 亮/暗主题、动态主题和全局 ThemeProvider；可覆盖颜色和字阶，但默认就是完整 M3 视觉。
- **无障碍**：主题会根据设备无障碍设置控制动画，组件 API 也普遍暴露 accessibility props；但当前官方站没有像 UI Kitten 那样给出一份完整、逐组件的覆盖/缺口矩阵，不能据此宣称全库已通过无障碍审计。
- **视觉质量**：**高但有强身份**。默认一致、成熟，却会让产品明显呈现 Material App 风格；iOS 也会带同一套设计语言。
- **迁移风险**：**中**。运行时依赖面较轻，但内部组件会使用 Material Design Icons；[安装文档](https://callstack.github.io/react-native-paper/docs/guides/getting-started/) 明确说明部分组件依赖该图标包。项目当前只允许 Lucide + 平台图标，需先裁决图标规则。

### 5.3 UI Kitten — 覆盖完整，无障碍披露最好

- **组件覆盖**：[官方组件总览](https://akveo.github.io/react-native-ui-kitten/docs/components/overview) 提供 30+ 组件，包括导航、Drawer、Tabs、Input、Select、Autocomplete、Datepicker、Modal、Popover、Tooltip、Calendar 等。
- **主题/暗色**：Eva Light/Dark 开箱即用，支持运行时切换、自定义主题与 mapping；所有组件共享 Eva Design System。
- **无障碍**：[官方无障碍指南](https://akveo.github.io/react-native-ui-kitten/docs/guides/accessibility) 不只写“accessible”，还明确列出覆盖范围和缺口：图标按钮需要业务侧命名，触控尺寸由业务保证，Modal/Popover/Tooltip/OverflowMenu 尚未处理完整焦点陷阱、进入和恢复。这种透明度是优点，但缺口也必须计入验收。
- **视觉质量**：**中高**。视觉统一、专业，但 Eva 风格明显；如果不接受它的默认视觉，重写 mapping 的工作量会削弱“用现成库”的收益。
- **迁移风险**：**中高**。新架构方向清楚，依赖主要为 SVG；风险集中在主题重绘和 Overlay 无障碍补齐。

### 5.4 Tamagui — 能力强，但对本项目偏重

- **组件覆盖**：主包包含 Accordion、AlertDialog、Avatar、Button、Card、Checkbox、Dialog、Form、Input、Menu、Popover、Select、Sheet、Slider、Tabs、Toast、Tooltip 等；[官方介绍](https://tamagui.dev/docs/intro/introduction) 同时提供组件、设计令牌、主题、响应式样式和编译优化。
- **主题/暗色**：[Themes](https://tamagui.dev/docs/intro/themes) 支持嵌套主题、子主题、动态主题和亮/暗语义 token。
- **无障碍**：官方称组件为 accessible/composable primitives，并支持 React Native accessibility props；本轮未发现类似 UI Kitten 的逐组件缺口表，仍需真机核验。
- **视觉质量**：**高**。默认组件和主题现代，可定制性很强。
- **迁移风险**：**很高**。它同时改变组件层、样式表达、令牌、Provider 和可选编译链。本项目已有唯一令牌源和 Metro monorepo 配置，迁移不是“替换 UI 组件”，而是重做设计系统基础设施。

### 5.5 gluestack-ui v5 — 现代，但 copy-paste 后归项目维护

- **组件覆盖**：[官方总览](https://gluestack.io/ui/docs/components/all-components) 标注 30+ 响应式组件；v5 [README](https://github.com/gluestack/gluestack-ui) 明确采用 CLI/copy-paste，而不是预打包完整组件依赖。
- **主题/暗色**：基于 NativeWind/Tailwind token，源码复制后可完全改造。
- **无障碍**：官方 README 声明具备无障碍支持；`@gluestack-ui/core` 的 npm 依赖包含 React Aria/React Stately。仍需按生成的具体组件版本核验，不能把底层依赖自动等同于每个组件已合规。
- **视觉质量**：**高**，偏现代 Tailwind/shadcn 风格。
- **迁移风险**：**高**。v5 使用 NativeWind v5/Tailwind 4，生成代码进入本仓库；上游升级无法像普通 npm 依赖一样无痛获得。本项目仍须维护生成后的组件、令牌映射和回归测试。

### 5.6 NativeWind + React Native Reusables — 好看，但不是托管式组件库

- NativeWind 官方 README 直接说明：**“Nativewind is not a component library, it's a styling library.”** 来源：[NativeWind 仓库](https://github.com/nativewind/nativewind)。单独采用它不能减少组件设计工作。
- React Native Reusables [官方文档](https://reactnativereusables.com/docs) 也直接说明：**“This is not a component library. It is how you build your component library.”** CLI 会把 shadcn 风格组件复制进 `components/ui`。
- [组件目录](https://reactnativereusables.com/docs/components/accordion) 约有 29 个基础组件，视觉现代，并复用 Lucide，和本项目现有图标方向较友好；但日期时间、媒体、复杂列表状态和业务卡片仍由项目维护。
- **结论**：若目标是“拿到一份可编辑的漂亮源码”，它很合适；若目标是“组件不再由项目维护”，它不符合要求。

### 5.7 RNEUI — Star 高，不等于当前最稳

- **组件/主题**：覆盖常见 Button、Input、ListItem、Overlay、Tooltip、BottomSheet、Rating、SearchBar、Tab 等，并有 `@rneui/themed` 主题层和暗色能力；[安装文档](https://reactnativeelements.com/docs/installation) 支持 Expo。
- **关键风险**：[v5.0.0 release](https://github.com/react-native-elements/react-native-elements/releases/tag/v5.0.0) 明确写明这是更换维护团队后“很久以来的第一个 release”，并提示“there will be bugs”。截至查询日默认分支最后提交为 2026-05-21，活跃度弱于 Tamagui、Paper、UI Kitten、HeroUI。
- **兼容性**：包没有给出 RN 0.86 或新架构明确矩阵；缺少版本上界不等于已经验证。
- **结论**：**不作为新基座**。可以复用个别独立组件，但没有理由在本项目从现有体系整体迁往 RNEUI。

### 5.8 React Native UI Lib — 功能丰富，但原生与架构风险高

- **覆盖**：Wix 的组件面很广，包含 Picker、WheelPicker、DateTimePicker、Drawer、Carousel、Incubator 等高级组件。
- **依赖**：[官方安装页](https://wix.github.io/react-native-ui-lib/docs/getting-started/setup) 要求 `react-native-reanimated`、`react-native-gesture-handler`、`uilib-native`，部分组件还需 Blur、DateTimePicker、SVG、Linear Gradient。
- **新架构**：npm peer 范围接受当前 React/RN，但仓库 README 仍把新架构支持描述为进行中；这与 Expo 57“新架构不可关闭”形成风险。
- **结论**：**当前淘汰，除非单独 native spike 证明 iOS/Android 均通过。** 即使通过，它引入的原生依赖和可选依赖也明显多于 Paper/UI Kitten。

### 5.9 NativeBase — 直接淘汰

- npm [`native-base@3.4.28`](https://www.npmjs.com/package/native-base/v/3.4.28) 已标记 deprecated，并明确指向 gluestack-ui。
- 官方 [README](https://github.com/GeekyAnts/NativeBase) 写明维护模式，新项目推荐 gluestack-ui。
- 最近正式版本仍是 2023-03-06。20k Stars 是历史积累，不能抵消停止主线演进的事实。

### 5.10 Restyle / Unistyles — 都不是本次问题的答案

- [Restyle](https://shopify.github.io/restyle/) 是用 TypeScript 和 theme 构建 UI library 的工具；组件视觉仍需项目定义。优点是轻、0 直接依赖，但它只会帮助继续自研。
- [Unistyles](https://www.unistyl.es/v3/start/getting-started) 是 Fabric/Nitro 驱动的增强 StyleSheet；支持主题和响应式，但没有 Button、Select、Dialog 等组件，还增加 Nitro 原生依赖和 Babel 配置。
- **结论**：如果目标只是改善样式工程，它们值得另开议题；如果目标是停止自研视觉和通用组件，则两者都应淘汰。

## 6. 最终 shortlist

### 6.1 首选：HeroUI Native

适用前提：愿意接受 Uniwind/Tailwind 主题体系、增加 Gesture Handler 和原生构建，并把当前设计宪法从“完整 UI kit 禁止”改成“单一 UI kit 允许”。

选择理由：

1. 这是唯一一个官方仓库直接使用本项目同一组 RN 0.86.3 / React 19.2.3 / Reanimated 4.5.1 / Worklets 0.10.1，并有 Expo 57 示例的完整组件库。
2. 默认视觉现代且有较完整的动画、暗色和表单/Overlay 组件，最符合“不要再从零打磨通用视觉”的目标。
3. Apache-2.0 许可证清晰，维护活跃。

不直接全量迁移的原因：原生代码、Uniwind 构建链和 Provider 影响面大；必须先做单屏 spike，并保留回退路径。

### 6.2 备选：React Native Paper

适用前提：产品可以接受 Material 3 作为主要视觉语言，并允许 Material 图标依赖或完成自定义图标适配。

选择理由：生态成熟、文档和组件覆盖完整、Provider/主题模式清晰、迁移复杂度低于 Tamagui/HeroUI/RNUILib。

淘汰条件：若要求 iOS/Android 分别呈现明显的平台原生风格，或坚持现有 Neo-Brutalism/自有令牌身份，Paper 会带来长期主题对抗，不应采用。

### 6.3 条件备选：UI Kitten

适用前提：接受 Eva Design System，且能对 Overlay 焦点管理等官方已披露缺口做补充。

选择理由：React 19/新架构路线明确、组件覆盖全、无障碍文档最诚实具体。

### 6.4 不进入最终试点

| 候选 | 淘汰理由 |
|---|---|
| Tamagui | 能力优秀，但对原生单项目过重；会同时替换组件、样式、主题和令牌基础设施。 |
| gluestack-ui / React Native Reusables | copy-paste 后源码归本项目维护，与“不要自研/不要自己维护通用组件”的目标不一致。 |
| RNEUI | v5 官方仍提示 bug 风险；缺 RN 0.86/新架构直接证据；维护活跃度不占优。 |
| React Native UI Lib | 原生依赖多，新架构官方信号不一致；Expo 57 不能回退旧架构。 |
| NativeBase | 已 deprecated，官方后继为 gluestack-ui。 |
| NativeWind / Restyle / Unistyles | 只是样式引擎，不会提供现成组件；采用后仍要维护自己的 UI library。 |

## 7. 建议的最小验证门

本轮不安装依赖。若进入实施，建议只验证首选 HeroUI Native，不并行安装多套库：

1. 在独立分支/工作树加入 HeroUI Native 及其 Expo 57 对齐依赖，所有原生包必须使用 `npx expo install` 或按 SDK 57 pin 固定版本，不使用 npm latest 漂移。
2. 只迁移一个代表性页面，保留原页面作为视觉和行为对照；不要先批量删除 71 个现有 UI 文件。
3. 运行 `expo-doctor`、TypeScript、Jest、现有 rulers，并完成 Android/iOS development build。
4. 验证亮/暗主题、200% 字号、Reduce Motion、VoiceOver/TalkBack、键盘、Modal/BottomSheet 焦点、Android 返回键和安全区。
5. 统计最终新增原生依赖、包体变化、冷启动影响和未被 HeroUI 替代的现有组件；只有这些证据通过，才决定是否修改宪法并扩大迁移。

**最终判定**：对于当前 Expo 57 / RN 0.86 项目，完整开源组件库并非“装一个依赖就删除所有自研 UI”。最合理的路线是用 **HeroUI Native** 替代通用原子和常见复合控件，继续保留业务组件；若 HeroUI 的原生和样式链成本过高，则采用 **React Native Paper**，前提是产品明确接受 Material 视觉。其余候选没有在“现代美观、当前版本证据、维护责任、迁移成本”四项上给出更优综合解。
