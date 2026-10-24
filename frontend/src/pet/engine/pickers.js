// 纯选择逻辑：不依赖 React / DOM，可独立单测。
// 移植自 dsh-pet src/shared/pickers.ts（MIT License），保持同名同语义。

/** 从字符串池里等概率随机抽一个；exclude 排除某个名字（避免连续重复） */
export const pick = (pool, exclude) => {
  const entries = exclude ? pool.filter((n) => n !== exclude) : pool;
  // 排除后池空（单元素池 + 排除自己）：退回原池抽——宁可重复，也不要返回 undefined
  const src = entries.length ? entries : pool;
  return src[Math.floor(Math.random() * src.length)];
};

/**
 * 事件档位取值：字符串槽位原样返回（固定播放）；
 * 数组槽位 = 档内候选，随机抽 1 并尽量避开 exclude（避免连续重复）。
 */
export const pickSlot = (slot, exclude) => {
  if (typeof slot === 'string') return slot;
  const entries = exclude === undefined ? slot : slot.filter((n) => n !== exclude);
  const src = entries.length ? entries : slot;
  return src[Math.floor(Math.random() * src.length)];
};

/** 事件池（档位槽位数组）是否包含某动画名 */
export const poolIncludes = (pool, anim) =>
  pool.some((slot) => (typeof slot === 'string' ? slot === anim : slot.includes(anim)));

/** 整个 events 段是否包含某动画名（事件动画播完回 idle / 循环护栏共用） */
export const isEventAnim = (events, anim) =>
  events ? Object.values(events).some((pool) => poolIncludes(pool, anim)) : false;

/** 生成 [min, max) 区间内的随机整数 */
export const randomBetween = (min, max) => Math.floor(min + Math.random() * (max - min));

/**
 * 按权重在分类池中选一个分类；noMirror 分类在镜像(facing=right)时被排除，
 * 剩余权重自动归一化。分类池为空时返回 null。
 */
export const pickWeightedCategory = (categories, facing) => {
  const cats = categories.filter((c) => c.actions.length > 0);
  if (!cats.length) return null;
  const filtered = cats.filter((c) => !(c.noMirror && facing === 'right'));
  const eligible = filtered.length ? filtered : cats;
  const totalW = eligible.reduce((s, c) => s + c.weight, 0) || 1;
  let t = Math.random() * totalW;
  for (const c of eligible) {
    t -= c.weight;
    if (t <= 0) return c;
  }
  return eligible[eligible.length - 1];
};

/** 掷骰结果类别 */
export const rollKind = (roll, w, opts = {}) => {
  const turn = opts.fixed ? 0 : w.turn;
  const move = opts.fixed ? 0 : w.move;
  const topEnd = (w.idle + turn + move) / 100;
  if (roll < w.idle / 100) return 'idle';
  if (roll < (w.idle + turn) / 100) return 'turn';
  if (roll < topEnd) return 'move';
  return 'action';
};

/** 从分类池选一个动作；无可用分类时回退 idle 池（返回 {id, name}，纯函数）。
 *  facing 用于 noMirror 镜像过滤；current 用于避免连续重复（pick 的 exclude）。 */
export const pickCategoryAction = (categories, idlePool, facing, current) => {
  const cat = pickWeightedCategory(categories, facing);
  if (!cat) return { id: 'FALLBACK', name: pick(idlePool, current) };
  return { id: cat.id, name: pick(cat.actions, current) };
};
