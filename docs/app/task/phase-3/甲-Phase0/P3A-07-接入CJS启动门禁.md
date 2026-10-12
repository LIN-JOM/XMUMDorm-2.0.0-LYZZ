# P3A-07 · 接入 CJS 启动门禁

## 1. Where this task sits

- **甲 Phase 0 绿基线与公共契约先成立**，目标是新五格可运行，公共契约已冻结。
- **本任务推进甲-R1 恢复绿基线并守住后端启动边界**：把已复盘的 CJS/ESM 风险变成合并门。
- **开始前**：无。**等待本任务**：所有触及后端路由或共享层的交付。

## 2. What the developer needs to know

**Read first**

- `docs/experience/2026-10-09-cjs-esm-route-startup-incident.md` — 事故根因、边界和检查要求。
- `.github/workflows/app-rulers-and-tests.yml` — 当前持续集成覆盖哪些路径。
- `server.js` — 后端如何在启动时加载全部路由。
- `routes/marketplace.js` — 已修复路由的 CommonJS 边界示例。

**Settled**

- `routes/**` 保持 CommonJS，不能静态导入 ESM 共享模块。
- 小型稳定枚举可在后端保留副本，不能为消重破坏启动边界。
- 检查使用 Node 22，并必须在合并前执行。

**Edges and seam**

- 触及根项目脚本、持续集成和后端路由加载；不迁移整个后端到 ESM。
- Seam：Node 22 CommonJS 解析、全部路由加载和健康检查。

**Run**

- `Get-ChildItem routes -Filter '*.js' | ForEach-Object { Get-Content -Raw $_ | node --input-type=commonjs --check - }`
- `npm test -- --runInBand __tests__/routes`

**Unknowns**

- 若加载 `server.js` 需要数据库，先建立不连库的路由加载入口；不要伪造数据库成功。
- Railway 的 watch-path 仍需控制台证据，不能从本地脚本推断。

## 3. The workflow

1. 阅读第 2 部分，并复述：检查阻止路由语法破坏，不迁移模块体系。
2. 为含静态 ESM 导入的临时路由写失败检查。
3. 将全部路由的 CommonJS 解析封装为根项目脚本。
4. 加入不连库的启动加载检查，覆盖 `server.js` 加载图。
5. 将两个检查接入现有 Node 22 持续集成。
6. 运行路由测试、语法检查和现有共享层测试。
7. 提交本任务。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 现有全部路由 | 都可按 CommonJS 解析 | Node 22 语法检查 |
| 2 | 临时静态 ESM 导入 | 检查以非零退出 | Node 22 语法检查 |
| 3 | 路由加载图 | 不在 listen 前抛模块错误 | 启动加载检查 |
| 4 | CI 变更 | 根路由改动触发检查 | 工作流路径 |
| 5 | Railway 健康端点 | 部署后返回 `ok` | 发布检查 |
