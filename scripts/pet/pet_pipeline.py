#!/usr/bin/env python3
"""桌宠素材生成链（step01 绿幕源视频 → 播放用 VP9-Alpha webm，360×360 方形归一）。

移植自 dsh-pet 的素材管线思路（MIT License）+ 本项目实测调参。纯 ffmpeg 实现，无第三方依赖。

用法：
    python scripts/pet/pet_pipeline.py <step01目录> [输出目录]

  <step01目录>  存放 AI 生成的 10 秒绿幕源视频（*.mp4 / *.mov / *.webm，16:9，1920×1080 佳），
                文件名 = 动画名（将成为 webm 文件名）。
  [输出目录]    默认 frontend/public/pet/main-animation/webm

管线（全部经验来自 2026-10-24 首批 11 段 Vidu 素材的实测）：
  ① 采键色   六点采样（左上/右上/顶中/左下/右下/左右腰，避开中央角色区）各取中位 RGB。
              AI 绿幕各片色差大（实测 #34B65B~#99D6A2）且片内有径向渐变，单点/双点键
              都会留大片未键区域——必须六键级联。
  ② 抠像     colorkey（RGB 色域 0.18/0.04）×6 级联 + despill 0.4 清绿边。
              ⚠ 禁用 chromakey（UV 色域）：这批素材角色带整体绿罩，白裙 UV 被拉得贴近
              绿键，chromakey 会把角色键成半透明幽灵（实测实体像素只剩 0~1%）。
  ③ 归一化   逐片统一尺寸（对应 dsh-pet 的 normalize_step03"统一站立居中"）：
              锚点 = 末帧（t=9.5，提示词保证回到标准站姿；t=0 常带生成伪影不可靠）；
              缩放使站立高 = 312、脚底 = 350、水平居中 = 180；动作并集超出画布时按
              上限收（头 ≥4 / 宽 ≤350），极端动作片会略小于 312（如跳跃、玩魔方坐姿）。
              角色包围盒测量用「alpha>200 最大 4 连通域」——直接阈值会被压缩噪点
              （稀疏 alpha 点）和地面阴影带污染成全画幅，连通域天然免疫。
  ④ alpha 硬化  <110 → 0，>225 → 255，中间线性拉伸：收掉半透明灰边与噪点。
  ⑤ 转码     libvpx-vp9 + yuva420p（VP9-Alpha，透明视频）。

⚠ 校验注意：ffmpeg 原生 vp9 解码器读不出 VP9 alpha（BlockAdditional 层），
  任何 alpha 分析/抽帧都必须带 -c:v libvpx-vp9 强制解码。

依赖：ffmpeg 4.3+（需带 libvpx）。
"""

import subprocess
import sys
import tempfile
import os
from collections import deque
from pathlib import Path

FPS = 25
CANVAS = 360
FEET_Y = 350
TARGET_H = 312
TOP_MIN = 4
MAX_W = 350
SIMILARITY = 0.18
BLEND = 0.04
HARDEN_LO = 110
HARDEN_HI = 225
SAMPLE_TIMES = ("0", "2", "4", "6", "8", "9.5")
# 六个背景采样点（320×180 缩略图坐标；避开中央角色区）
BG_SPOTS = [
    [(6, 6), (40, 6)],            # 左上
    [(280, 6), (306, 6)],         # 右上
    [(156, 6), (170, 6)],         # 顶中
    [(6, 166), (6, 140)],         # 左下
    [(306, 166), (306, 140)],     # 右下
    [(6, 86), (306, 86)],         # 左右腰
]
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "pet" / "main-animation" / "webm"
SOURCE_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}


def run_checked(cmd, what):
    cmd = [str(c) for c in cmd]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit(f"[FAIL] {what}\n{r.stderr[-800:]}")


def bg_keys(ffmpeg, src) -> list[str]:
    """t=1 帧缩略图上六点采背景键色（各点 8×8 块中位 RGB）。"""
    raw = tempfile.mktemp(suffix=".bin")
    run_checked([ffmpeg, "-y", "-ss", "1", "-i", src, "-frames:v", "1",
                 "-vf", "scale=320:180", "-pix_fmt", "rgb24", "-f", "rawvideo", raw], "采键色")
    d = open(raw, "rb").read()
    os.unlink(raw)
    W, H = 320, 180
    keys = []
    for spots in BG_SPOTS:
        pxs = []
        for cx, cy in spots:
            for y in range(cy, cy + 8):
                for x in range(cx, cx + 8):
                    i = (y * W + x) * 3
                    pxs.append((d[i], d[i + 1], d[i + 2]))
        r = sorted(p[0] for p in pxs); g = sorted(p[1] for p in pxs); b = sorted(p[2] for p in pxs)
        n = len(pxs) // 2
        keys.append(f"0x{r[n]:02X}{g[n]:02X}{b[n]:02X}")
    return keys


def key_chain(keys) -> str:
    return "".join(f"colorkey={k}:{SIMILARITY}:{BLEND}," for k in keys)


def cc_bbox(mask, W, H, thr=200):
    """alpha>thr 的最大 4 连通域包围盒（角色实体核心；免疫噪点与阴影带）。"""
    grid = bytearray(1 if v > thr else 0 for v in mask)
    best = None
    best_n = 0
    seen = bytearray(W * H)
    for start in range(W * H):
        if not grid[start] or seen[start]:
            continue
        n = 0
        x0 = y0 = 10**9
        x1 = y1 = -1
        q = deque([start])
        seen[start] = 1
        while q:
            i = q.popleft()
            n += 1
            x, y = i % W, i // W
            if x < x0: x0 = x
            if x > x1: x1 = x
            if y < y0: y0 = y
            if y > y1: y1 = y
            if x > 0 and grid[i - 1] and not seen[i - 1]: seen[i - 1] = 1; q.append(i - 1)
            if x < W - 1 and grid[i + 1] and not seen[i + 1]: seen[i + 1] = 1; q.append(i + 1)
            if y > 0 and grid[i - W] and not seen[i - W]: seen[i - W] = 1; q.append(i - W)
            if y < H - 1 and grid[i + W] and not seen[i + W]: seen[i + W] = 1; q.append(i + W)
        if n > best_n:
            best_n = n
            best = (x0, y0, x1, y1)
    return best


def src_bbox(ffmpeg, src, keys, t):
    """源(1920×1080)坐标的角色 bbox：640×360 连通域 ×3（±3px 误差由裁剪余量吸收）。"""
    raw = tempfile.mktemp(suffix=".bin")
    run_checked([ffmpeg, "-y", "-ss", t, "-i", src, "-frames:v", "1",
                 "-vf", key_chain(keys) + "scale=640:360,format=yuva420p,alphaextract",
                 "-pix_fmt", "gray", "-f", "rawvideo", raw], f"bbox {t}")
    a = open(raw, "rb").read()
    os.unlink(raw)
    b = cc_bbox(a, 640, 360)
    return None if not b else (b[0] * 3, b[1] * 3, b[2] * 3, b[3] * 3)


def convert(ffmpeg, src, dst):
    keys = bg_keys(ffmpeg, src)
    bs = {t: src_bbox(ffmpeg, src, keys, t) for t in SAMPLE_TIMES}
    bs = {t: b for t, b in bs.items() if b}
    if not bs:
        raise SystemExit(f"{src.name}: 角色包围盒测量全空（键控失败？）")
    anchor = bs.get("9.5") or bs.get("0")  # 末帧标准站姿锚点
    H0 = anchor[3] - anchor[1]
    feet_y = anchor[3]
    cx = (anchor[0] + anchor[2]) / 2
    UX0 = min(b[0] for b in bs.values()); UY0 = min(b[1] for b in bs.values())
    UX1 = max(b[2] for b in bs.values()); UY1 = max(b[3] for b in bs.values())
    s = min(TARGET_H / H0, (FEET_Y - TOP_MIN) / (feet_y - UY0), MAX_W / (UX1 - UX0))
    CW = min(1920, UX1 - UX0 + 24); CH = min(1080, UY1 - UY0 + 24)
    CX = max(0, UX0 - 12); CY = max(0, UY0 - 12)
    CW = min(CW, 1920 - CX); CH = min(CH, 1080 - CY)
    SW = max(2, min(CANVAS, int(CW * s) // 2 * 2))
    SH = max(2, min(CANVAS, int(CH * s) // 2 * 2))
    ox = max(0, min(CANVAS - SW, int(180 - (cx - CX) * s)))
    oy = max(0, min(CANVAS - SH, int(FEET_Y - (feet_y - CY) * s)))

    step03 = tempfile.mktemp(suffix=".mov")
    try:
        vf = (key_chain(keys)
              + f"despill=type=green:mix=0.4,"
              + f"crop={CW}:{CH}:{CX}:{CY},scale={SW}:{SH},"
              + f"pad={CANVAS}:{CANVAS}:{ox}:{oy}:color=black@0.0,fps={FPS}")
        run_checked([ffmpeg, "-y", "-i", src, "-vf", vf,
                     "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
                     "-an", step03], f"{src.name} 抠像+归一化")
        expr = f"if(lt(val,{HARDEN_LO}),0,if(gt(val,{HARDEN_HI}),255,(val-{HARDEN_LO})*255/{HARDEN_HI - HARDEN_LO}))"
        fc = (f"[0:v]format=yuva420p,split[base][a];[a]alphaextract,format=rgb24,"
              f"lutrgb=r='{expr}':g='{expr}':b='{expr}',format=gray[al];[base][al]alphamerge")
        run_checked([ffmpeg, "-y", "-i", step03, "-filter_complex", fc,
                     "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                     "-b:v", "0", "-crf", "10", "-row-mt", "1", "-threads", "4",
                     "-an", dst], f"{src.name} 转码")
    finally:
        os.unlink(step03)

    # 校验：末帧站立高/脚底线（强制 libvpx 解码读 alpha）
    raw = tempfile.mktemp(suffix=".bin")
    run_checked([ffmpeg, "-y", "-c:v", "libvpx-vp9", "-ss", "9.5", "-i", dst, "-frames:v", "1",
                 "-vf", "alphaextract", "-pix_fmt", "gray", "-f", "rawvideo", raw], f"{dst} 校验")
    a = open(raw, "rb").read()
    os.unlink(raw)
    bb = cc_bbox(a, CANVAS, CANVAS)
    if not bb:
        return "成品 alpha 为空！"
    return f"站立高 {bb[3] - bb[1]}（目标 {TARGET_H}）  脚底 y={bb[3]}（目标 {FEET_Y}）"


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    src_dir = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    if not src_dir.is_dir():
        raise SystemExit(f"源目录不存在：{src_dir}")
    ffmpeg = "ffmpeg"
    try:
        subprocess.run([ffmpeg, "-version"], capture_output=True, check=True)
    except Exception:
        raise SystemExit("找不到 ffmpeg，请先安装（Windows 建议 gyan.dev full build）")

    sources = sorted(p for p in src_dir.iterdir() if p.suffix.lower() in SOURCE_EXTS)
    if not sources:
        raise SystemExit(f"源目录里没有视频：{src_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"素材生成链：{len(sources)} 个动作 → {out_dir}\n")
    for src in sources:
        dst = out_dir / f"{src.stem}.webm"
        print(f"▶ {src.stem}")
        info = convert(ffmpeg, src, dst)
        print(f"  ✔ {info}\n")
    print("完成。素材为 360×360 方形（站立高 312 / 脚底 350 / 水平居中），引擎侧 HIT_BOX 与之配套。")


if __name__ == "__main__":
    main()
