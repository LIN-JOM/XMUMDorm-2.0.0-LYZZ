# Web 桌宠实现记录

> 归属：[Web 桌宠设计](../03-Architecture/frontend-design/Web桌宠设计.md) · 2026-10-24 · 分支 `dev-yjq`

## 背景与调研

需求：在 web 端内置桌宠，全盘采用 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT）
的技术栈与工作流复刻自有实现。调研结论（源码级）：

- dsh-pet 是 DeepSeek Harness 插件「三件套」：①AI 视频提示词配方（绿幕 #00FF00、16:9、
  角色锚点固定、首尾帧标准站立）→ ②素材链（chromakey 抠像 → 2160×1215 归一化 → 640×360
  VP9-Alpha）→ ③插件运行时（TS 纯逻辑 shared 层 + React 浏览器 overlay + Electron 桌面壳）。
- 可移植核心 = **纯逻辑层**（`physics.ts` 586 行手感物理、`pickers.ts` 掷骰选择、
  `config.jsonc` 驱动的动画池/权重/事件）与**双缓冲视频渲染 + 动画链状态机**；
  不可移植部分 = DSH 宿主集成（配置服务、LLM 调用、余额/会话事件、Electron）。

## 交付清单

| 文件 | 说明 |
|---|---|
| `frontend/src/pet/engine/physics.js` | 手感物理逐项移植（弹簧 K200/C30、初速估算、抛体积分反弹、Q 弹曲线、软上限/死区） |
| `frontend/src/pet/engine/pickers.js` | pick/pickSlot/rollKind/pickWeightedCategory/pickCategoryAction/isEventAnim |
| `frontend/src/pet/engine/chain.js` | decideNext 动画链决策 + planMove 漫游规划（基准宽 462 等比缩放） |
| `frontend/src/pet/engine/config.js` | 内置默认配置 + `/pet/config.json` 合并收窄 + animUrl |
| `frontend/src/components/pet/PetOverlay.jsx` | 容器（配置拉取 / 多开 / 隐藏持久化 + 召唤星） |
| `frontend/src/components/pet/PetCard.jsx` | 单只宠物全行为（见设计文档 §3） |
| `frontend/src/components/pet/Mascot.jsx` | 内置吉祥物「星铃」DOM 骨架 |
| `frontend/src/components/pet/PetMenu.jsx` | 右键菜单两级点播 + 工具项 |
| `frontend/src/components/pet/pet.css` | overlay 样式 + 吉祥物人设实现（15 动画变体） |
| `frontend/src/components/shell/SiteShellRoute.jsx` | 挂载点（±3 行：import + 两分支渲染 `<PetOverlay />`） |
| `frontend/public/pet/config.json` | 外置配置（带注释说明全部字段） |
| `frontend/public/pet/prompts/桌宠动作提示词.md` | ①提示词配方（星铃版，11 个动作 + 扩写指引） |
| `frontend/public/pet/main-animation/webm/README.md` | ②素材放置说明 + 三件套流程 |
| `scripts/pet/pet_pipeline.py` | ②素材链：chromakey 抠像 → 640×360 归一化 → VP9-Alpha 转码（纯 ffmpeg） |
| `__tests__/petEngine.test.js` | 引擎单测 24 用例 |

## 实现要点与取舍

1. **双缓冲统一了 mascot 与 video 两种图层**：`AnimLayer` 对 mascot「挂载一帧即就绪」、
   对 video「canplay 后就绪并上报媒体时长」，链路调度（ended 定时）对两种来源无感知；
   video `onError` 逐动画回落 mascot（`failed` 集合），素材可渐进补齐。
2. **move 位移等时长就绪后再规划**：视频时长只有 `canplay` 才知道，故 `pendingMoveRef`
   先挂起、`handleReady` 时用 `planMove` 按实际时长开出行走窗口——动画多长都能走完规划距离。
3. **吉祥物 = 160×90 设计画布 × `--pet-scale`**：所有部件按 px 精绘一次，经 CSS 变量整体
   缩放到实际宠物尺寸（56~480px 都清晰）；月牙尾巴用 CSS `mask` radial-gradient 镂空实现
   （初版双圆叠加在非白背景会露白盘，已修复）。
4. **菜单打开暂停随机链**：`menuOpenRef` 下 `handleEnded` 改播待机 + 短定时，关菜单立即续链，
   避免宠物在用户点菜单时自己走掉。
5. **位置持久化**：拖拽/抛掷/回初始位置后写 localStorage，刷新原地出现；resize 时 clamp 回视口。
6. **不做后端改动**：配置走 public 静态文件；碎碎念用本地文案池（15 句，星铃人设）。
   接入 LLM 的口子已留（`whisper.phrases` 换成接口返回即可）。

## 验证记录

- `npx jest`：**68 suites / 967 tests 全绿**（含新增 `__tests__/petEngine.test.js` 24 例）。
- `npm run build:web`：Vite 构建通过（9.05s）。
- 吉祥物视觉：临时预览页（pet.css + 全 15 动画变体 + `--pet-scale:1.8`）浏览器截图逐项对照
  人设表校验，修复了月牙尾巴成环问题后通过。

## 第二轮修复（2026-10-24 下午）：透明感 / 太小 / 命中不准

用户实测反馈三个问题，根因诊断与修复：

1. **「有点透明」— 抠像参数误伤角色本体**。首转用 chromakey（UV 色域）+ 我目测猜的键色，
   这批 AI 源片角色带整体绿罩，白裙的 UV 被拉得贴近绿键，similarity 0.20 把角色键成了
   半透明幽灵（实测角色区域 alpha>200 的像素仅 3 个，本体中位 alpha ≈ 50/255）。
   **修复**：改 `colorkey`（RGB 色域，白裙距绿 155/441，余量充足）+ **每片自动采样键色**
   （AI 绿幕各片色差 #34B65B~#99D6A2，实测四角+顶中 5 点取中位）+ 抠后 despill 清绿边。
   参数 colorkey 0.18/0.04；重转后角色实体像素 11%~34%（此前 0%），合成图中心 92% 实体。
   经验已写进 `scripts/pet/pet_pipeline.py` 注释：**这批素材禁用 chromakey**。
2. **「太小 + 拖拽部位不准」— 16:9 画幅四周大透明边**。提示词构图角色仅占画面宽 ~45%，
   150px 盒子里角色身体只 ~60px；包围盒与角色身体偏差大，抓"空气"也拖走。
   **修复**：素材链加**方形裁剪 crop=360:360:140:0**（覆盖角色并集 x177..468 与提示词
   安全区 160..480），角色占画幅宽 45%→81%；引擎包围盒改方形（`PET_BOX_ASPECT=1`，
   physics.js 导出，throwBounds/PetCard 同源），默认尺寸 150→240。
3. **切换瞬间的半透明闪烁** — 双缓冲交叉淡入时两层同时处于中间透明度（0.5+0.5 叠加）。
   **修复**：改为「新层盖顶淡入（z-index:2 + keyframes 0.2s），旧层延迟 0.24s 再隐藏」，
   任意时刻必有一层全不透明。

验证：11 片重转 + alpha 校验（libvpx 强制解码，见脚本 check_alpha）；24 引擎单测全绿；
build:web 通过；ffmpeg 合成抽检中心 92% 实体像素、肤色饱和无混色。

## 第三轮修复（2026-10-24 晚）：指针体系对齐 dsh-pet + 视口边界钳制

用户实测：点击/拖拽手感差、可拖出网页边缘、命中部位不准。回读 dsh-pet `client/pet.ts`
的指针段（1694~1965 行）逐段对照，发现我第一版自作主张的地方不少，本轮全部按原版重写：

- **独立命中层**（dsh-pet 的 `.dsh-pet-hit`）：包围盒不再整体响应指针，按 `HIT_BOX`
  （素材画幅坐标的身体矩形，新 `engine/constants.js`，360×360 版按首批素材角色并集定）
  百分比铺一层命中 div，所有指针事件挂它——点哪是哪、抓哪是哪；root 盒 `pointer-events:none`。
- **按下语义**：只认左键；按下即 `stopThrow/stopMove/stopDragFollow`（飞行/漫游中可被
  空中抓住）+ pointer capture；抓取偏移按包围盒中心 `getBoundingClientRect` 量（不假设
  left/top 已同步）。
- **拖拽**：阈值 5px（`DRAG_THRESHOLD`，原 8px）；轨迹边推边 `trimTrail`（原先攒到松手）；
  弹簧跟随 dt 封顶 1/30（原 0.05）；悬空动画只播一次（原先循环）。
- **松手**：释放位置取弹簧跟随的**实际**包围盒位置（原先取指针位置——跟手滞后时落点会跳）；
  `justDragged` 100ms 抑制窗口防拖完误触点击回应（原版有我漏了）；点击改回 onClick 入口。
- **触屏长按 500ms** 派发 contextmenu 打开菜单（移动端此前没有菜单入口），移动 8px 取消。
- **视口边界钳制**（与 dsh-pet 的差异，按项目要求）：dsh-pet 明确允许拖出屏（桌面端有全局
  坐标语义）；浏览器 overlay 拖出视口就找不到了，故拖拽目标与温柔放下落点都经
  `clampToThrowBounds`（新引擎纯函数 + 单测）钳进 `throwBounds`——身体贴视口边为止，
  抛掷反弹边界本就是同一套。

验证：25 引擎单测全绿（新增 clampToThrowBounds 用例）；build:web 通过。

## 第四轮修复（2026-10-24 深夜）：灰边清根 + 全片尺寸归一

用户实测：睡觉/被吓一跳边缘有灰影；各动作角色大小不一。根因与修复（全部固化进
`scripts/pet/pet_pipeline.py` v5）：

1. **灰边 = 抠像后的半透明残余**（v2 实测睡觉半透明像素 8772px，为干净片的 4.4 倍）。
   修复：alpha 硬化（<110 → 0、>225 → 255、中间线性拉伸，alphaextract→lutrgb→alphamerge
   纯原生滤镜链）+ despill 提到 0.4。修后睡觉半透明 2273px（-74%），剩余为头发/裙摆的
   合法软边。
2. **尺寸不一 = 缺 dsh-pet 的 normalize_step03**（"统一站立居中"）。修复：逐片归一——
   锚点取**末帧**（t=9.5；提示词保证回到标准站姿，t=0 常带生成伪影），缩放使站立高=312、
   脚底=350、水平居中=180；动作并集超画布按上限收（极端动作片略小，如跳跃 271、玩魔方
   坐姿 310+脚底 334——动作本身的形态，非误差）。修后 11 片末帧高度 310~313（10/11 片 ±1.5px）。
3. **两个隐蔽工程坑**（踩了三轮才发现，都在脚本注释里立了牌）：
   - 测量包围盒必须用「alpha>200 **最大连通域**」：直接阈值会被压缩噪点（稀疏半透明点）
     和地面阴影带污染成全画幅；
   - ffmpeg 原生 vp9 解码器读不出 VP9 alpha，任何 alpha 校验必须 `-c:v libvpx-vp9`；
   - 期间还修了一版「测量在 640 坐标系、约束在 1920 坐标系」的单位混用 bug（pad 装不下
     → 编码静默失败 → 校验读到旧文件假阳性）。
4. 键色采样升为**六点级联**（左上/右上/顶中/左下/右下/左右腰）：AI 绿幕片内径向渐变大，
   双点键留大片未键区。

验证：末帧高度分布 [310×5, 311×3, 312×2, 313, 271(跳跃)]、脚底 345~350；品红合成 2×2
网格目检（角色实心、尺寸一致、脚线对齐、边缘干净）；引擎/前端本轮零改动。

## 第五轮（2026-10-24 夜）：点播竞态修复 + 更名铃湾/Cornie + 双语

1. **「点播 A 播出 B」**——双缓冲 stale-ready 竞态：旧请求的视频（多为正在缓冲的 idle）
   `canplay` 晚于新点播的 `switchTo` 到达时，`handleReady` 不校验新旧就把旧图层推上
   前台，把用户刚点的动作顶掉。修复：图层带 `seq`（=switchTo 的 token），`handleReady`/
   `handleVideoError` 一律 `layer.seq !== tokenRef.current → return`（dsh-pet 的 seq 同构）。
   顺带修了 PetMenu「走两步」子菜单打不开的 bug（openCat 拿分类 id 找移动池条目，
   永远 undefined；改为一级条目统一 key 查找，移动池用 `__moves` 保留前缀）。
2. **更名**：吉祥物定名**铃湾（Cornie）**（人设仍依据《梦幻星铃独角兽Q版角色设定表》）。
   `pets[].name/nameEn` 贯穿：配置、悬浮提示、aria-label、碎碎念文案、生成提示词配方。
3. **双语**：接入站点 `LanguageContext`（PetOverlay 取 lang 下传）——右键菜单（走两步/
   分类标题 labelEn/工具项/召唤星 title）、碎碎念 `whisper.phrases/phrasesEn`（英文池
   缺失回落中文）、宠物名中英切换；具体动作名 = 素材文件名不翻译（与 dsh-pet
   「名字即文件名」同口径）。

验证：25 单测全绿（新增 name/nameEn/phrasesEn 断言）；build:web 通过。

## 第六轮（2026-10-24 夜）：「轻声细语」整体下线

用户裁决：轻声细语灰影严重且非必需，动作整体下线——webm 已删（源 mp4 保留在
`video/` 可随时重制），idle 改用东张西望（与 turn 池共用，最安静的"无所事事"感），
`events.whisper` 置空 = 碎碎念只弹气泡、不联动切动画（当前动画继续播）。
待机呼吸仍是有预算后第一优先补的素材。25 单测全绿、构建通过。

## 第七轮（2026-10-24 夜）：点播被随机链顶掉 + 菜单点外关闭

用户实测：点「玩耍 → 玩魔方」播出「睡觉」。根因：点播路径是 `onPlay(name) → onClose()`，
而 `closeMenu` 里强制 `startChain()` 立即掷骰子——随机链（小动作类权重 45，睡觉高频）
把刚点播的动画顶掉。修复：**closeMenu 不再续链**（菜单期间 handleEnded 一直在短待机循环
并重排定时器，关菜单后下一次 ended 自然回链；点播动画播完一次也自然回链，与 dsh-pet
同语义）。顺带补齐：菜单加全屏点外关闭背板（此前只能点菜单项才能关菜单）。
全链路复查（点播顺序 / stale-ready seq / whisper 事件池已空 / 定时器清理）无其他问题。

## 已知限制 / 后续

- **2026-10-24 素材首批接入（AI 动画全面替代 CSS 吉祥物）**：11 段 AI 生成绿幕视频
  （1920×1080/10s/24fps，Vidu 渠道生成）经 `pet_pipeline` 素材链
  （chromakey=0x2E8B00:0.20:0.10 + despill → 640×360 归一化 → VP9-Alpha webm）入库
  `frontend/public/pet/main-animation/webm/`；`source` 切 `video`，**Mascot.jsx 与全部 CSS
  吉祥物动画已删除**（约 400 行），素材缺失回落 idle 池而非替代形象。动画池映射：
  idle=轻声细语（暂代，待补专属「待机呼吸」）、turn=东张西望、drag=被吓一跳、
  clicks=跳起来/害羞/生气傲娇/挥手打招呼、move=螃蟹走、分类=伸懒腰/睡觉/玩魔方。
  验证：webm 在 overlay 结构内透明播放实测通过（640×360、readyState 4、进度正常）。
- 待补素材（**2026-10-24 裁决：暂无生成预算，长期沿用暂代方案**，有预算时再按
  [桌宠动作提示词.md](../frontend/public/pet/prompts/桌宠动作提示词.md) 补）：
  待机呼吸（idle，由轻声细语长期代——出镜率高但与碎碎念人设意外契合）、
  被拖拽悬空（drag，由被吓一跳长期代——被抓起的惊吓反馈本就贴切）。
- 碎碎念/对话接 LLM、工作状态联动（如「资料预览网关转码完成」类事件）为后续增强方向。
- Safari 不认 webm alpha（与 dsh-pet 同限制）。
