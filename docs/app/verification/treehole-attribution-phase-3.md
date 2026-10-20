# 树洞原创与转载声明：兼容与发布验收证据

日期：2026-10-20；版本：1.0。
检查代码：5ba9d93e；基线：3ed5c7c4；对应任务：树洞声明 Phase 3 兼容与发布验收。

自动检查和双端 JS 导出通过；真机验收尚未完成，线上公开响应也尚未提供声明字段。
这份记录不是上线通过证明。没有执行远端迁移、部署、推送或线上发帖。

## 1. 自动检查

| 编号 | 检查 | 实际结果 | 证据范围 |
|---|---|---|---|
| V-1 | App 完整回归 | 148 套件、1721 项通过 | 另有 2 套件、16 项跳过 |
| V-2 | 发帖、来源及条款接口 | 3 套件、52 项通过 | 本地隔离测试 |
| V-3 | 类型检查 | 退出码 0 | 当前 App 源码 |
| V-4 | lint 错误检查 | 退出码 0 | quiet 模式，不代表没有警告 |
| V-5 | 设计规则检查 | 四项命令退出码均为 0 | 债务、对比度、品牌色、令牌 |
| V-6 | Android JS 导出 | 成功，9,703,367 字节 | Hermes 包，不是 APK |
| V-7 | iOS JS 导出 | 成功，9,503,389 字节 | Hermes 包，不是 IPA |

运行入口：

```sh
# 仓库根目录
npm test -- --runInBand __tests__/routes/posts.test.js __tests__/shared/postAttribution.test.js __tests__/routes/termsPublishingGate.test.js --silent

# app 目录
npm run typecheck
npm run lint -- --quiet
npm run rulers
npm run test:ci -- --runInBand --silent
CI=1 ./node_modules/.bin/expo export --platform android --platform ios --output-dir /private/tmp/treehole-attribution-phase3.qX5zE1 --max-workers 2
```

导出目录是本机临时证据，不作为仓库产物保留。
其中 metadata.json 的打包器是 Metro，平台为 android、ios。
App 跳过项来自既有 live-backend-contract 与 live-api-layer 在线测试入口，本轮没有提供登录凭据。

## 2. 行为证据

| 编号 | 行为 | 结果 | 证据位置 |
|---|---|---|---|
| B-1 | 历史列表、详情缺声明 | 返回空声明，仍可读 | routes/posts.test.js |
| B-2 | 创建时缺任一声明列 | 返回 503 和迁移提示 | routes/posts.test.js |
| B-3 | 旧帖转换与匿名墙隔离 | 正文保留，不补造声明 | p2x-treehole-post-view-model.test.ts |
| B-4 | 中英文表单可访问名称 | 类型、来源、错误均可查询 | publish-attribution.test.tsx |
| B-5 | 主题与大字号属性 | 两种语言、两种主题通过 | p2x-treehole-post.test.tsx |
| B-6 | 必填读屏标签本地化 | 英文使用 required | p1-05-controls.test.tsx |

行为证据位于仓库现有测试目录：后端为 __tests__/routes，App 为 app/src/__tests__。
测试暴露英文输入框仍读中文“必填”；已在共享 Input、TextArea 与语言字典修复，未加依赖。

大字号用例模拟字体比例 2，检查允许字体缩放、没有缩放上限、详情不限制行数。
它验证属性和完整可访问名称，不验证实际换行、遮挡、焦点顺序或语音输出。

## 3. 线上只读检查

目标是 shared/api/config.js 的默认公开服务：
[XMUMDorm 公开服务](https://xmumdorm-200-lyzz-production.up.railway.app)。
仅请求一页一条帖子，再读取该条详情；未保存或输出帖子正文与作者资料。

| 请求 | HTTP | 业务状态 | content_origin | repost_source |
|---|---|---|---|---|
| GET /api/posts?page=1&pageSize=1 | 200 | 0 | 不存在 | 不存在 |
| GET /api/posts/:id | 200 | 0 | 不存在 | 不存在 |

采样响应还不满足本功能的新响应契约，不能据此宣称声明已在线上生效。
字段缺失不能单独证明数据库未迁移，也不能确定线上服务版本；本轮未检查远端数据库。

## 4. 尚未完成的设备证据

本机只有 Command Line Tools，没有可用 simctl；未找到完整 Xcode、Android Studio 或 Android SDK。
因此本轮没有 APK/IPA 构建、安装、真机截图、VoiceOver 或 TalkBack 朗读证据。

补齐测试设备和含声明字段的测试服务后，仍需实际检查：

1. 在 360dp 与 412dp 宽度切换浅色、深色主题和中文、英文，检查控件与发布按钮未被遮挡。
2. 字号调至 200%，选择自定义来源并打开键盘，检查必填错误、滚动和提交操作。
3. 发表转载与原创测试帖，返回列表并进入详情，确认 100 字符来源可在详情完整阅读。
4. 切换原创与转载并恢复草稿，确认隐藏来源不被误提交，匿名墙不显示声明。
5. 使用 TalkBack、VoiceOver 操作类型、来源和错误项，确认选中状态、全文与焦点顺序。

上述步骤尚未执行。上线仍需另外核实声明字段迁移 076、服务部署与端到端保存读取；本轮不代行这些操作。

## 变更记录

- 2026-10-20：记录本地回归、双端导出、公开响应与设备证据边界。
