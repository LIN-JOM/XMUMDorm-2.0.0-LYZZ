# Web 桌宠设计（复刻 dsh-pet 工作流）

> 状态：v1.0 · 2026-10-24 · 归属 `dev-yjq`
> 参考项目：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT License），
> 全盘采用其「三件套工作流」与运行时架构，宿主换成 XMUMDorm web 前端。

## 1. 定位

一只住在厦马小筑网页里的桌宠——吉祥物**星铃**（梦幻星铃独角兽）。平时待机呼吸、
随机做小动作（打瞌睡、伸懒腰、哼歌……）、左右转向、屏幕漫游；点击有回应动画并 Q 弹、
可拖拽（弹簧跟手）、甩出去抛物线飞行 + 屏幕边缘反弹 + 落地 Q 弹；右键菜单可点播任意动作；
到点碎碎念弹气泡。**零素材可用**（内置 CSS 吉祥物），也**预留 AI 视频素材链**（与 dsh-pet
同一条「提示词 → 绿幕视频 → 透明 webm」管线），素材就位后配置一键换血。

## 2. 三件套工作流（自 dsh-pet 原样移植）

```
① 提示词（配方）    →  ② 素材生成链（引擎）     →  ③ 运行时（成品）
AI 生成动画的配方     绿幕源视频 → 透明动画的管线    Web 桌宠本体
```

| 件 | dsh-pet 原件 | 本项目对应 |
|---|---|---|
| ① 提示词 | `prompts/桌面宠物 10 秒动作提示词.md`（绿幕规范 + 按秒分解） | `frontend/public/pet/prompts/桌宠动作提示词.md`（角色替换为星铃，配方结构不变） |
| ② 素材链 | `chroma_step02.py` → `normalize_step03.py` → `encode_thumbs.py` | `scripts/pet/pet_pipeline.py`（单脚本、纯 ffmpeg：自动采键色 → **colorkey** RGB 色域抠像（0.18/0.04，这批 AI 素材带绿罩，chromakey/UV 色域会把角色键成半透明）→ despill → 方形裁剪 360×360 → VP9-Alpha 转码） |
| ③ 运行时 | DSH 插件（浏览器 overlay + Electron 桌面端） | `frontend/src/pet/engine/`（纯逻辑层）+ `frontend/src/components/pet/`（渲染层） |

## 3. 运行时架构（对应 dsh-pet 的分层）

```
frontend/src/pet/engine/          ← 纯逻辑层（无 DOM / React，可单测，对应 dsh-pet src/shared/）
├── physics.js   拖拽弹簧跟手 / 甩抛初速估算 / 抛体积分+反弹 / Q 弹挤压曲线（逐项移植 physics.ts）
├── pickers.js   加权掷骰 rollKind / 分类抽取 / 事件档位 pickSlot / noMirror 过滤
├── chain.js     动画链决策 decideNext（idle/turn/move/action）+ 漫游落点规划 planMove
└── config.js    内置默认配置（结构同 config.jsonc）+ /pet/config.json 加载与逐字段收窄合并

frontend/src/components/pet/      ← 渲染层（对应 dsh-pet client/pet.ts）
├── PetOverlay.jsx  容器：拉配置 → 渲染多只宠物；隐藏态持久化 + 角落召唤星
├── PetCard.jsx     单只宠物：双缓冲交叉淡入、动画链状态机、点击/拖拽/甩抛、
│                   漫游位移、碎碎念气泡、右键菜单、朝向镜像、reduced-motion 降级
├── Mascot.jsx      内置 CSS 吉祥物「星铃」（按人设表：独角/金铃/月牙尾/蕾丝裙）
├── PetMenu.jsx     右键菜单（分类 → 动作两级点播 + 工具项）
└── pet.css         overlay/气泡/菜单样式 + 吉祥物 15 个动画变体
```

### 关键机制（与 dsh-pet 同名同语义）

- **动画链**：每段动画播完 `handleEnded` → `decideNext` 按权重掷骰（默认 idle 10 / turn 5 /
  move 5，余量归随机动作分类）；turn 池播完**翻转朝向**并立即同步 ref（新朝向参与 noMirror 过滤）；
  move 类先规划落点（minDist/maxDist 按 size/462 等比缩放、margin 贴边、lead/tail 首尾原地），
  等素材时长就绪后在 `[leadMs, duration-tailMs]` 窗口内线性位移。
- **双缓冲渲染**：两个 `pet-layer` 交叉淡入（0.18s），换源不空白帧。mascot 挂载一帧即就绪，
  video 等 `canplay`（时长一并上报给链路调度）；video 加载失败自动回落 mascot（逐动画降级）。
- **拖拽/甩抛**：pointer capture + 过阻尼弹簧跟手（K=200/C=30，`springStep`）；松手用
  `estimateReleaseVelocity`（轨迹窗口 + 峰值加权 + 加速增益 + 软上限 3600px/s + 死区 500px/s）
  决定「温柔放下」或 `startThrow`（`throwStep` 积分，重力 1400 / 恢复 0.78 / 地面摩擦 2.5，
  `ceilingBounce=false` 时顶部放行）；落地按冲击速度映射 Q 弹幅度（`landingSquash`）。
- **Q 弹挤压**：`squashScale` 曲线（下压段 ease-in + 回弹段 easeOutBack ~4% 过冲），
  施加在 `pet-stage` 的 `scaleY`（与朝向 `scaleX` 组合），`prefers-reduced-motion` 时跳过。
- **配置**：`/pet/config.json`（public 目录，改完刷新即生效）逐字段收窄合并，显式写错回落内置
  默认、结构性缺失静默——与 dsh-pet「字段缺失取内置默认值」同哲学。支持 `pets[]` 多开。

### 与 dsh-pet 的差异（本项目裁剪）

| 项 | dsh-pet | 本项目 v1 |
|---|---|---|
| 素材 | VP9-Alpha webm（100+ 段） | 内置 CSS 吉祥物 + webm 预留（`source: video` 切换） |
| 碎碎念/对话 | 宿主 LLM 生成 + 记忆持久化 | 本地文案池（`whisper.phrases`）；接后端对话接口后可替换 |
| 余额/工作状态联动 | 监听 DSH 会话事件 | 无对应事件源，不实现（字段与触发链已预留 `events.*`） |
| 桌面端（Electron） | 透明置顶窗 | 无（纯浏览器 overlay；`display` 字段保留 desktop 语义但不生效） |
| 多屏抛掷 | `throwStepRegion` 逐屏 AABB | 单视口 `throwStep`（浏览器只有一块「屏」） |

## 4. 页面集成

挂载在 `SiteShellRoute`（桌面与移动主壳共用，登录后的全部主页面可见），z-index 900
（内容之上、弹层之下）。「隐藏桌宠」写 localStorage（`dorm-pet-hidden`），隐藏后右下角保留
一颗**召唤星**点击唤回（对应 dsh-pet 的托盘位）。宠物位置拖拽/抛掷结束后持久化
（`dorm-pet-pos-<petId>`），刷新原地出现；移动端初始位避开底部 TabBar。

## 5. 测试与验收

- 引擎纯逻辑层 Jest 单测：`__tests__/petEngine.test.js`（24 用例：物理手感锚点、
  掷骰边界、noMirror 过滤、漫游 clamp、配置收窄合并）。
- 吉祥物视觉：按人设表逐项核对（独角星光 / 蓝蝴蝶结金铃 / 大眼腮红 / 腰间蝴蝶结 /
  月牙尾巴 mask 镂空 / 白蝴蝶结鞋），15 个动画变体截图校验。
- 构建门禁：`npm run build:web` 通过；全量 `npx jest` 通过。
