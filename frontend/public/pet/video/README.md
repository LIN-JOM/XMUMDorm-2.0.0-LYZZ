# video/ —— AI 生成的绿幕源片母带（不入库）

这里存放 AI 视频工具产出的 10 秒绿幕源视频（1920×1080 / 24fps，文件名 = 动画名），
是整条素材链的**母带**：`python scripts/pet/pet_pipeline.py <本目录>` 由此重制出
`main-animation/webm/` 下的播放素材（六点键色抠像 → 360×360 方形归一 → alpha 硬化
→ VP9-Alpha）。目录已加入 .gitignore（体积大、可由 AI 工具再生成）；已入库的 webm
是最终播放素材，与母带解耦。生成提示词配方见 `../prompts/桌宠动作提示词.md`。
