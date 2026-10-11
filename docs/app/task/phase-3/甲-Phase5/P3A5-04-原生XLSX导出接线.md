# P3A5-04 原生 XLSX 导出接线

## 1. Where this task sits

- **甲 Phase 5 总集成进入上线收口**，目标是让已授权管理员取得报名名单。
- **P3A5-04 原生 XLSX 导出接线**把已有受权二进制响应保存后交给系统分享面板。
- **开始前**：服务端导出和管理入口已存在。**等待它**：Android、iOS 真机证据。

## 2. What the developer needs to know

**Read first**

- `routes/clubs.js` — 导出接口的鉴权、文件头和 MIME 类型。
- `shared/api/request.js` — 下载必须与 App 注入地址共用鉴权路径。
- `shared/api/clubs.js` — 唯一的报名名单下载入口。
- `app/src/features/clubs/ClubScreens.tsx` — 管理权限与活动详情的现有边界。
- `app/app.json` — Expo CNG 插件必须声明，不能手改原生目录。

**Settled**

- 只用服务端返回的 Blob 和文件名，不在客户端生成名单。
- 原生端保存至应用 Documents 后调用系统分享；Web 保持浏览器下载。
- 分享能力不可用或保存失败时必须报错，不能显示假成功。
- Expo 57 使用官方 `expo-file-system` 与 `expo-sharing` 模块。

**Edges and seam**

- 触及下载请求、文件宿主和社团管理员操作。
- 不改导出权限、名单数据、社团状态机或原生工程目录。

**Run**

- `npm run test:ci -- --runInBand p3a5-xlsx-export --silent`
- `npm run typecheck`，再 `npm run lint -- --quiet`

**Unknowns**

- Android/iOS 保存与分享仍要真机验收；无 EAS 和设备时保持外部阻塞。
- 若 Expo 模块安装结果与 SDK 57 不兼容，停止并保留安装输出。

## 3. The workflow

1. 阅读第二部分，并复述为“服务端名单只保存和分享，不在 App 重算”。
2. 写下载地址、文件名和平台分支的失败测试。
3. 用 Expo SDK 57 的官方模块实现原生保存和系统分享。
4. 将管理员操作接到现有活动详情，沿用服务端 `canManage`。
5. 补齐 Web 下载降级和不可分享错误的测试。
6. 运行本任务测试、类型检查和 lint。
7. 更新阻塞记录，只保留真机证据缺口并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 注入地址 | App 注入 API 地址 | 下载请求使用注入地址 | `download()` |
| 原生导出 | Blob 与服务端文件名 | 写入 Documents 后打开分享 | 文件宿主 |
| 非管理员 | `canManage=false` | 不显示导出操作 | 活动详情 |
| 文件名 | 含路径字符的响应名 | 仅生成安全 `.xlsx` 名称 | 文件宿主 |
| 不可分享 | 系统不支持分享 | 抛出可处理错误 | 文件宿主 |
