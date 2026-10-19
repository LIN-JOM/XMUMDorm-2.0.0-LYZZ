# T1 装 react-native-pager-view 与 jest 替身

## 1. Where this task sits

- **Phase 1 横滑骨架先跑通**，目标是主页"更多"区块出现四个 Tab，手指横滑能翻页。
- **本任务把 R-M4 内容区横向滑动切换的依赖就位**：包装上、jest 能跑。
- **Starts after**：无。**Waits on it**：T3 主页骨架（没有包就没有 pager）。

## 2. What the developer needs to know

**Read first**

- `app/package.json` — 现有依赖清单，确认 pager-view 确实不在、Expo SDK 版本是多少。
- `app/jest.setup.js` — 项目惯例：优先用包自带的官方 mock，⛔ 不手写替身。
- `docs/app/task/phase3-yps/y7/01-Me模块四Tab提升计划.md` — R-M4 的验收口径。

**Settled**

- 用 `react-native-pager-view`，不自写 ScrollView 分页（本轮已拍板）。
- 版本不手填：`npx expo install` 自动对齐 Expo SDK 57。

**Edges and seam**

- 只碰构建配置层（依赖声明、jest 替身注册）。不碰任何页面代码。
- Seam：全量 jest + typecheck，不新增用例。

**Run**

- `cd app && npx jest --runInBand`，然后 `npm run typecheck`。

**Unknowns**

- pager-view 包内官方 jest mock 的确切路径随版本变。装上后先到 `node_modules/react-native-pager-view` 里找 mock 文件；**若没有官方 mock，停下问，不手写**（违反 jest.setup.js 的惯例）。

## 3. The workflow

1. 读上面三个文件，用一句话重述本任务。
2. `npx expo install react-native-pager-view`，确认 package.json 出现该依赖且版本带 `~`。
3. 在 node_modules 里定位官方 jest mock。
4. 在 jest.setup.js 注册它，注释写明依据（照 AsyncStorage 先例）。
5. 跑全量 jest 与 typecheck，确认零回归。
6. Commit。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 装包后跑全量 jest | 全部用例保持绿，零新增失败 | jest |
| 2 | mock 注册后 `require('react-native-pager-view')` | 不抛原生桥错误 | jest.setup.js |
| 3 | typecheck | 无类型错误 | tsc |
