# 厦门大学校徽（品牌头用）来源说明

- **获取日期**：2026-10-18
- **文件**：
  - `xmu-emblem.png` — 官方色彩（`#112D66`）+ 透明背景，512×512，104,822 B
  - `xmu-emblem-light.png` — 同形状反白变体（纯白 + 透明背景），512×512，80,117 B（**派生文件**，仅用于深色底）

## 1. 仓库内是否已有现成资源（结论：没有）

| 检查项 | 结果 |
| --- | --- |
| `git log --all --diff-filter=A --name-only -- '*.png' '*.svg' '*.jpg'` 过滤 `logo\|xmu\|xiamen\|徽\|校` | 0 命中（历史里只有 Expo 默认图标、`frontend/public/square/*.png` 模块配图、`frontend/temp_retroui/public/images/logo.png`、截图类 PNG） |
| 旧 tag `app-legacy-v1` 树内 `logo/brand/assets/xmu` 匹配 | 仅 `ios/App/.../Splash.imageset`、`android/.../splash.png`、`mobile/assets/*`（Expo 默认图标），**无校徽** |
| `app/assets/` | 仅 `icon.png` / `splash-icon.png` / `favicon.png` / `android-icon-*.png`，`icon.png` 实测是 Expo 默认字母图标（1024×1024），非校徽 |
| `docs/`、`frontend/` | 仅有**文字引用**（`docs/app/constitution/App设计宪法.md` 等把 `www.xmu.edu.cn/images/logo2.png` 当作品牌色锚点），**没有校徽图片文件** |

> 结论：仓库里没有可复用的校徽文件，走官方下载。

## 2. 最终采用的来源（官方 · 厦门大学官网）

- 页面：[学校标识 - 厦门大学](https://www.xmu.edu.cn/sdgl/xxbs.htm)（「校徽」段落 + 「下载厦门大学校徽，LOGO」压缩包）
- 压缩包直链（HTTP 200，84,297 B）：
  `https://www.xmu.edu.cn/system/_content/download.jsp?urltype=news.DownloadAttachUrl&owner=1885466072&wbfileid=FC95E973DFE38833A67D801074F19C51`
- 包内文件：`xmu-logo.pdf`（**官方矢量图**，页面 800×800 pt，10 个矢量绘图对象、无位图）、`xmu-logo.jpg`（150×150 带白底位图）、`xmu-zi-jiageng.*` / `xmu-zi-luxun.*`（字体素材，未使用）

**选型理由**：官方 PDF 是唯一既「权威」又「矢量」的版本（官网页面上的校徽插图是 JPG，带白底；官网 `images/logo2.png` 是 289×83 的横版组合标，切出的校徽仅约 83 px，不够用）。矢量源可无损导出任意尺寸，且无白底、无文字水印。

**交叉核对（未采用）**：[Wikimedia Commons · File:Xiamen University logo.svg](https://commons.wikimedia.org/wiki/File:Xiamen_University_logo.svg)（公有领域 PD-1923 / PD-China，作者林文庆，名义 267×267，实测 SVG 50,783 B，渲染后色彩 `#122E66`）。与官方 PDF 图形一致、色彩仅差 1–2 级，但官方文件更权威，故最终以官方 PDF 为准；Commons 版留作备用核对源。

## 3. 处理步骤（可复现）

1. `Invoke-WebRequest` 带浏览器 UA 下载上面的 ZIP → 解出 `xmu-logo.pdf`。
2. PyMuPDF（`fitz`）以 `alpha=True` 渲染第 1 页：`Matrix(2400/800)` → 2400×2400 RGBA（矢量抗锯齿，背景 alpha=0）。
3. Pillow `LANCZOS` 降采样到 480×480（超采样 → 边缘更平滑），再贴进 512×512 透明画布，四周各留 **16 px 透明留白**（占 3.1%，避免圆形容器/圆角裁切时外环贴边）。
4. 把非全透明像素的 RGB 统一归一为实测墨色 `#112D66`（`rgb(17, 45, 102)`）——降采样是非预乘的，不归一会在浅色底上留黑边/灰边。
5. `optimize=True` 输出 PNG。
6. 反白变体：同一 alpha 通道，RGB 全部置 `#FFFFFF`（形状与透明区完全一致）。

## 4. 验收实测（2026-10-18，Pillow 12.2.0）

| 项 | `xmu-emblem.png` | `xmu-emblem-light.png` |
| --- | --- | --- |
| 文件头 / 格式 | `89 50 4E 47` / PNG | 同 |
| 色彩模式 | RGBA（8 bit/通道，带 alpha） | RGBA |
| 宽×高 | **512 × 512**（正方形） | 512 × 512 |
| 文件大小 | **104,822 B（约 102.4 KiB）** | 80,117 B（约 78.2 KiB） |
| 唯一 RGBA 颜色数 | **209**（≫10，非纯色） | 209 |
| alpha 范围 | 0–255（全透明 76.74%） | 0–255 |
| 内容包围盒 | (16,16)–(495,495) → 四边各 16 px 透明 | 同 |
| 主体墨色 | `#112D66` | `#FFFFFF` |
| 是否有白底 | **没有**（背景完全透明，无白色矩形） | 没有 |

> 注：`xmu-emblem.png` 的 102 KB 主要来自 alpha 抗锯齿的 209 级边缘；如需更小体积可做 64 色量化（≈22 KB，实测暗底最大色差 15，肉眼无感），本轮为保留原样未做。

## 5. 深色背景可用性判断（重要）

品牌暗色底为 `#12141a`（`tokens/design-tokens.css` 的 `--color-dark-canvas`）。

| 组合 | WCAG 对比度 | 判断 |
| --- | --- | --- |
| `xmu-emblem.png` 墨色 `#112D66` on 暗色 canvas `#12141a` | **1.39 : 1** | ❌ **几乎看不见**（校徽是深藏青线稿，不是亮蓝/金色） |
| `xmu-emblem.png` on 亮色 canvas `#f7f8fa` | 12.42 : 1 | ✅ 很清晰 |
| `xmu-emblem.png` 放在浅色 chip（如 `#f2f4f9`）上再置于暗底 | 12.42 : 1（chip 内） | ✅ 推荐做法 |
| `xmu-emblem-light.png` on 暗色 canvas `#12141a` | **18.41 : 1** | ✅ 很清晰 |
| `xmu-emblem-light.png` on 品牌蓝 `#173874` chip | ≈ 11.3 : 1 | ✅ 清晰 |

**结论**：官方色彩版本**不能直接压在暗色底上**（1.39:1，远低于 3:1 图形下限）。深色主题请二选一：

1. 用 `xmu-emblem-light.png`（反白变体，18.41:1）；或
2. 用 `xmu-emblem.png` + 浅色底 chip（`bg-brand-soft` / `#f2f4f9` 一类，12.4:1）。

另：校徽内部线稿很细，**显示尺寸建议 ≥ 56–64 px**；40 px 以下内圈文字（UNIVERSITAS AMOIENSIS / 止於至善）已糊成一片，品牌头若只有 ~32 px，建议只保留外环或配文字标题。

## 6. 色彩备注

- 本文件实测墨色 `#112D66`；官网 `images/logo2.png` 里切出的校徽实测为 `#0D2F6E`；设计文档里的品牌锚点 `#173874` 与两者均差 6–10 级（文档中的测量口径可能取了另一版资产/含抗锯齿均值）。**未对校徽重新上色**（保持官方原色），若要求与品牌 token 完全一致，需要产品侧决定是否统一改色。
- 商标说明：校徽属厦门大学标识，含商标性权利（Commons 亦挂 Trademarked 模板）。本 App 为校内学生项目，用于表明所属学校；对外发布/商用前请按学校视觉标识管理办法确认授权。

## 7. 登录页品牌画（2026-10-21）

- 文件：`login-hero.png`，1254×1254 PNG，随 App 本地打包，不请求外网。
- 来源：用户提供女孩和小山羊品牌参考，经 imagegen 生成并迭代的确认稿。
- 确认稿标识：`exec-9d222077-bb66-4b5c-b46b-4f8fb3b39f16.png`。
- 生成的装饰资源标识：`exec-4765c947-4302-4222-a3ba-31771237d827.png`。
- 内容：浅绿花卉、女孩、纯白微笑小羊及静态边缘玻璃；已移除所有文字、输入线、图标和按钮。
- 对齐：画中卡片两侧接触线约在图高 81%，仅用于装饰锚定；正文由真实原生组件渲染。
- 材质：使用静态边沿折射装饰与原生 SVG 主题渐变，不包含 Plasma UI 的浏览器 WebGL 运行时。
- 用户已授权按该设计图进行代码实现；本资源不替换上方登记的学校校徽。

### 登录插画清晰度修正（2026-10-21）

- 当前使用 `login-hero-sharp.png`；旧 `login-hero.png` 保留作原稿对照，不再被页面引用。
- 内置 imagegen 编辑原图，输出 `exec-e7922e97-7a75-4ce7-a5eb-67d527e45c73.png`。
- 实际输出仍为 1254×1254，未虚构升分辨率；主要改进是清晰线条、减少泛光和细碎纹理。
- 保留人物、姿势、配色和卡片接触线。原生图片使用硬件缩放；原生显示仍待设备验证。
- 精修提示词如下；工具使用内置模式，未调用 CLI/API。

```text
Edit this exact production illustration asset for sharper rendering in a 390px-wide mobile login header.
Preserve the composition, framing, pose, character identity, character proportions, hand and hoof contact
positions and the shallow arched glass rim EXACTLY. The white-haired blue-eyed girl with crystalline blue
horn is on the left, and a pure white smiling baby goat with small ears and blue crystalline horn is on
the right. Both lean on the rim, same expressions and gaze as the target. Keep the pale sage green floral
background. Keep the arched blank milky-white lower card region empty; the two side contact heights remain
at 81% of the square image and the arch crest remains around 69% of image height.
Improve only clarity: clean crisp controlled anime line art on the face, eyelashes, large readable hair
locks, ribbon shapes, bell contours, crystal facets, clear restrained local contrast. Remove painterly
smearing, white bloom and overexposed haze on characters. Simplify tiny noisy hair/fur texture so the
characters remain clean and legible at phone size. Goat fur stays very very pure white, short and simple,
not detailed strands. Background flowers can remain softly out of focus but subjects and glass rim are
tack sharp. No halos from artificial oversharpening. This is an asset edit, not a new UI mockup.
No text, icons, inputs, buttons, phone frame or watermark. Output a square high resolution PNG, target
2048 by 2048 or higher if supported, do not downsample.
```
