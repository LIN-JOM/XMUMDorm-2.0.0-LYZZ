# P3A5-06 Web 质量门 CI

## 1. Where this task sits

- **甲 Phase 5 总集成进入上线收口**要求每个已交付前端都有可复现的合并门。
- **P3A5-06 Web 质量门 CI**将 Web 的安装、lint、构建和源码检查接入现有工作流。
- **开始前**：Web 锁文件存在，根目录 Jest 已暴露缺失 Web 依赖。**等待它**：完整根目录验证与候选包移交。

## 2. What the developer needs to know

**Read first**

- `.github/workflows/app-rulers-and-tests.yml` — 当前工作流、触发路径与 Node 版本。
- `frontend/package.json` — Web 安装、lint 和构建脚本。
- `frontend/package-lock.json` — CI 必须使用的锁定依赖。
- `__tests__/frontend/frontendSourceLint.test.js` — 根目录测试何时需要 Web 插件。

**Settled**

- Web 必须以 `npm ci` 安装，不能用本地残留模块替代。
- lint、构建和根目录源码守卫都必须在干净 runner 上执行。
- 只扩展现有工作流，不改 Web 产品代码或新增依赖。

**Edges and seam**

- 触及 `.github/workflows` 与 Web 验证命令。
- 接缝是 GitHub Actions 的独立 `web-quality` job；App 与后端 jobs 保持不变。

**Run**

- `cd frontend && npm ci && npm run lint && npm run build`
- `npm test -- --runInBand __tests__/frontend/frontendSourceLint.test.js --silent`

**Unknowns**

- 本地 `frontend/node_modules` 若缺包，只能通过锁文件安装验证。
- GitHub runner 的最终证据等待 PR 运行；若工作流语法无效，停止候选包移交。

## 3. The workflow

1. 阅读第二部分，并复述为“用锁文件在 CI 重现 Web 质量门”。
2. 用 `npm ci` 重建 Web 依赖，确认锁文件可安装。
3. 写入失败的工作流断言或最小现有检查，覆盖 Web job 与触发路径。
4. 增加 `web-quality` job，运行 lint、构建和源码守卫。
5. 运行 Web lint、构建和根目录源码守卫，确认它们使用真实插件。
6. 运行工作流静态检查与相关回归，记录结果。
7. 提交 CI 与验证变更。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| Web 改动 | `frontend/**` 变更 | 工作流被触发 | workflow paths |
| 干净安装 | `frontend/package-lock.json` | `npm ci` 成功 | web-quality |
| lint | Web 源码 | 无 ESLint 错误 | `npm run lint` |
| 构建 | Web 入口 | Vite 生产构建成功 | `npm run build` |
| 源码守卫 | 根目录 frontend 测试 | 无未定义变量 | root Jest |
