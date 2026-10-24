// 动画链的纯决策层：掷骰 → 下一动画类别与名字、漫游落点规划。
// 对应 dsh-pet client/pet.ts 的 pickNext / planMove 中的可测部分（MIT License），
// 抽成纯函数以便脱离 DOM 单测；PetCard 只负责执行（rAF / setState / 换源播放）。
import { pick, pickCategoryAction, randomBetween, rollKind } from './pickers';

/** dsh-pet 的基准宠物宽：moves 的 minDist/maxDist 以它为准，运行时按实际 size 等比缩放 */
export const BASE_PET_SIZE = 462;

/** 移动距离按宠物实际宽度等比缩放（小宠物挪小步、大宠物挪大步） */
export const scaleMoveDist = (dist, size) => (size > 0 ? dist * (size / BASE_PET_SIZE) : dist);

/**
 * 动画链掷骰：roll ∈ [0,1) → { kind, name }。
 * kind ∈ idle / turn / move / action；move 无处可去时原地退化为 action（由调用方传入
 * planMove 的结果决定，这里只出决策）。current 用于避免连续重复。
 */
export const decideNext = ({ roll, weights, animations, facing, current, fixed = false }) => {
  const kind = rollKind(roll, weights, { fixed });
  if (kind === 'idle') {
    return { kind, name: pick(animations.idle, current) };
  }
  if (kind === 'turn') {
    if (!animations.turn.length) return { kind: 'idle', name: pick(animations.idle, current) };
    return { kind, name: pick(animations.turn, current) };
  }
  if (kind === 'move') {
    if (!animations.moves.actions.length) {
      return { kind: 'action', name: pickCategoryAction(animations.categories, animations.idle, facing, current).name };
    }
    const spec = pick(animations.moves.actions, current);
    return { kind, name: spec.name, params: { ...animations.moves.default, ...(spec.params || {}) } };
  }
  const act = pickCategoryAction(animations.categories, animations.idle, facing, current);
  return { kind, name: act.name };
};

/**
 * 漫游落点规划：朝朝向方向走 minDist~maxDist（按 size 缩放），clamp 在视口内（margin 贴边安全距，
 * 不随宠物缩放）。规划不出正距离（已贴边）→ null，调用方退化为原地动作。
 *
 * durationMs = 本次移动动画的总时长（视频取媒体时长、吉祥物取动画表）；leadMs/tailMs 为动画
 * 首尾原地不动的时长——中间的 [walkStartMs, walkEndMs] 窗口内线性位移（速度由窗口长度反推，
 * 动画多长都能走完规划距离，与 dsh-pet「按动画时长调速」同口径）。
 *
 * 返回 { fromX, toX, dir, walkStartMs, walkEndMs }。
 */
export const planMove = ({ x, facing, size, W, params, durationMs }) => {
  const margin = params.margin;
  const dist = scaleMoveDist(randomBetween(params.minDist, params.maxDist), size);
  const dir = facing === 'right' ? 1 : -1;
  const minX = margin;
  const maxX = Math.max(minX, W - size - margin);
  const fromX = x;
  let toX = x + dir * dist;
  if (toX < minX) toX = minX;
  if (toX > maxX) toX = maxX;
  const travel = Math.abs(toX - fromX);
  if (travel < 1) return null;
  const leadMs = (params.leadSec || 0) * 1000;
  const tailMs = (params.tailSec || 0) * 1000;
  const total = Math.max(durationMs, leadMs + tailMs + 200);
  return { fromX, toX, dir, walkStartMs: leadMs, walkEndMs: total - tailMs };
};
