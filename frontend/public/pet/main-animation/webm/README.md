# main-animation/webm —— 视频素材放置目录

把素材生成链（`scripts/pet/pet_pipeline.py`）产出的 **VP9-Alpha 透明 webm** 放在这里，
文件名 = 配置动画池里的动画名。放好后在 `frontend/public/pet/config.json` 把
`source` 改为 `"video"`，刷新页面即整体换血（引擎零改动；单个动画缺失自动回落内置吉祥物）。

## 素材规格（与 dsh-pet 一致）

- 容器：`.webm`，VP9 + Alpha（`yuva420p`），无音轨
- 分辨率：**640×360**（16:9）
- 内容：角色标准正面站立为第一帧，末帧回到同一姿态；角色脚底在画面垂直方向约 85% 处、
  头顶约 20% 处、左右边缘约 25%/75% 处（提示词配方里强制约束的构图锚点）
- 命名：动画名即文件名，如 `待机呼吸休闲.webm`、`点击回应-开心跃动.webm`

## 从零生成一只全新宠物（三件套工作流）

1. **① 提示词配方**：见 `frontend/public/pet/prompts/桌宠动作提示词.md`
   （绿幕规范 + 按秒动作分解，角色可整体替换，配方结构不变）
2. **② 素材生成链**：AI 视频工具（豆包/可灵/Runway 等）按配方逐动作生成 10 秒绿幕视频
   → `node scripts/pet/pet_pipeline.py`（绿幕抠像 → 归一化 → 640×360 VP9-Alpha 转码）
3. **③ 运行时**：webm 落入本目录 + 配置切 `source: "video"`

> pet pack（额外宠物种类）：复制本目录结构为 `<种类名>-animation/webm/`，
> 在 `config.json` 的 `pets[]` 里加一只 `id` 不同的实例即可（多实例共享素材）。
