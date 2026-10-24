// 拖拽抛掷物理（弹簧跟手 + 甩抛 + 重力反弹）：纯计算，无 DOM / rAF / React。
// 移植自 dsh-pet（https://github.com/PC2005-cloud/dsh-pet）src/shared/physics.ts，
// MIT License。浏览器 overlay 只有一块「屏」（视口），故省去多屏 throwStepRegion，
// 保留单屏 throwStep；常量、曲线与手感参数与原版逐项一致。
//
// 坐标语义：全部为「宠物包围盒左上角」的视口 px 坐标。
// 初速估算的轨迹样本用指针绝对坐标（clientX/Y）——去掉常数偏移后速度一致。

/** 宠物包围盒高宽比（素材链方形裁剪 360×360 → h = w × 1）。
 *  dsh-pet 素材是 16:9 横幅故为 9/16；本项目角色占满画幅高度、左右留白已裁，
 *  方形盒让角色尽量大地填满包围盒，指针命中区与角色贴合。 */
export const PET_BOX_ASPECT = 1;

/** 拖拽弹簧刚度：越大跟手越紧 */
export const SPRING_K = 200;
/** 拖拽弹簧阻尼：ζ = c/(2√k) ≈ 1.06，过阻尼，不 overshoot */
export const SPRING_C = 30;

/** 拖拽轨迹保留窗口（ms）：只留最近这一段做初速估算 */
export const TRAIL_KEEP_MS = 200;
/** 初速估算窗口（ms） */
export const RELEASE_WINDOW_MS = 150;
/** 松手前停顿超过它 = 温柔放下（不带残余速度），即使之前甩过 */
export const RELEASE_STALE_MS = 150;
/** 窗口太短视为不可估算（ms） */
export const MIN_SPAN_MS = 20;
/** 分段速度的最小 dt（ms）：高回报率指针事件可低至 1ms，过小 dt 会把抖动放大成虚假峰值 */
export const SEG_MIN_DT_MS = 8;
/** 低于此速度 = 不抛（原地放下），px/s */
export const DEAD_ZONE_SPEED = 500;
/** 甩出速度软上限（px/s）：cap*(1-e^(-s/cap))，任意力度下仍单调可区分 */
export const MAX_THROW_SPEED = 3600;
/** 初速大小 = 端点均值*(1-w) + 窗口峰值*w */
export const PEAK_WEIGHT = 0.5;
/** 参考加速度（px/s²）：末段加速达到它即吃满增益 */
export const ACCEL_REF = 8000;
/** 加速度增益上限：仍在加速的甩动最多放大 60% */
export const ACCEL_GAIN_MAX = 0.6;

// ---- 抛掷物理默认值（= 默认配置 physics 段；运行时以配置成品为准） ----
/** 抛掷重力（px/s²） */
export const GRAVITY = 1400;
/** 碰边恢复系数：每次反弹保留约 78% 速度 */
export const RESTITUTION = 0.78;
/** 地面水平摩擦（/s） */
export const GROUND_FRICTION = 2.5;

/** 抛掷物理的默认参数（配置缺失时的兜底） */
export const DEFAULT_PHYSICS = {
  gravity: GRAVITY,
  restitution: RESTITUTION,
  groundFriction: GROUND_FRICTION,
  ceilingBounce: true,
  throwPower: 1,
};

/** 落地时 |vy| 小于它直接停竖直 */
export const REST_VY = 40;
/** 地面上 |vx| 小于它认为已静止 */
export const REST_VX = 15;
/** 单步最大 dt（s）：防后台标签页/卡顿后恢复的巨帧跳变 */
export const MAX_STEP_DT = 0.05;

// ---- Q 弹挤压（squash & stretch）：点击回应 / 抛掷落地时角色垂直压扁再回弹 ----
/** 下压幅度：高度压到 55% */
export const SQ_SQUASH = 0.55;
/** 挤压时长（ms） */
export const SQ_DURATION_MS = 220;
/** 落地冲击速度基准：低于此 = 轻落（按下限幅度） */
export const SQ_SOFT_SPEED = 300;
/** 落地冲击速度上限：达到/超过此 = 重砸（吃满最大下压） */
export const SQ_HARD_SPEED = 1500;
/** 落地最大下压幅度 */
export const SQ_MAX_SQUASH = 0.55;

/**
 * 落地冲击速度 → 下压幅度 scaleY 值（速度越大压得越狠）。
 */
export const landingSquash = (impactSpeed) => {
  const t = Math.min(Math.max((Math.abs(impactSpeed) - SQ_SOFT_SPEED) / (SQ_HARD_SPEED - SQ_SOFT_SPEED), 0), 1);
  return Math.min(0.8, 1 - t * (1 - SQ_MAX_SQUASH));
};

/**
 * Q 弹挤压曲线：u∈[0,1] 进度 → scaleY 值。
 * 下压段（0~0.45）ease-in 压缩；回弹段（0.45~1）easeOutBack 带回弹过冲（~4%）。
 */
export const squashScale = (u, squash = SQ_SQUASH) => {
  if (u < 0.45) {
    const p = u / 0.45;
    return 1 - (1 - squash) * p * p;
  }
  const p = (u - 0.45) / 0.55;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const f = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  return Math.min(1.12, squash + (1 - squash) * Math.max(f, 0));
};

/** 一次轨迹采样（t = performance.now() 时间戳 ms；x/y = 指针绝对坐标 px） */
export const trimTrail = (trail, now) => {
  const cutoff = now - TRAIL_KEEP_MS;
  let i = 0;
  while (i < trail.length && trail[i].t < cutoff) i++;
  return i === 0 ? trail : trail.slice(i);
};

/** 过阻尼弹簧单轴速度步进：调用方随后 x += v*dt。
 *  power = 总力度（K/C 同乘：收敛速度快 p 倍 = 跟手更贴/更松）。 */
export const springStep = (v, x, target, dt, power = 1) =>
  v + ((target - x) * SPRING_K - v * SPRING_C) * power * dt;

/** 软钳速：cap*(1-e^(-s/cap))，任意速度下单调可区分、渐近不超过 cap。 */
export const softClampSpeed = (speed) => {
  if (speed <= 0) return 0;
  return MAX_THROW_SPEED * (1 - Math.exp(-speed / MAX_THROW_SPEED));
};

/**
 * 由拖拽轨迹估算松手初速 (vx, vy)，px/s。
 * 方向：窗口首末端点位移方向（抗抖）。大小：端点平均与峰值按 PEAK_WEIGHT 加权，
 * 末段仍在加速时按 ACCEL_REF 比例增益，软钳速封顶。
 * 返回 null = 温柔放下（轨迹为空 / 停留过久 / 窗口太短 / 峰值速度低于死区），调用方不抛。
 */
export const estimateReleaseVelocity = (trail, now, physics = DEFAULT_PHYSICS) => {
  if (trail.length === 0) return null;
  const last = trail[trail.length - 1];
  if (now - last.t > RELEASE_STALE_MS) return null;
  const win = trail.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
  if (win.length < 2) return null;
  const t0 = win[0].t;
  const x0 = win[0].x;
  const y0 = win[0].y;
  const t1 = win[win.length - 1].t;
  const x1 = win[win.length - 1].x;
  const y1 = win[win.length - 1].y;
  const spanMs = t1 - t0;
  if (spanMs < MIN_SPAN_MS) return null;
  const baseVx = ((x1 - x0) / spanMs) * 1000;
  const baseVy = ((y1 - y0) / spanMs) * 1000;
  const baseSpeed = Math.hypot(baseVx, baseVy);
  if (baseSpeed < 1e-6) return null; // 窗口内几乎纯抖动：没有可靠方向，按原地放下处理
  // 分段速度（过密采样向前合并，dt 下限 SEG_MIN_DT_MS）
  const segSpeeds = [];
  let px = x0;
  let py = y0;
  let pt = t0;
  for (const s of win.slice(1)) {
    const dt = s.t - pt;
    if (dt >= SEG_MIN_DT_MS) {
      segSpeeds.push({ speed: (Math.hypot(s.x - px, s.y - py) / dt) * 1000, tEnd: s.t });
      px = s.x;
      py = s.y;
      pt = s.t;
    }
  }
  const peakSpeed = segSpeeds.length ? Math.max(...segSpeeds.map((v) => v.speed)) : baseSpeed;
  // 末段加速度：末段峰值速度相对首段的斜率（仍在加速的甩动放大初速）
  let accel = 0;
  if (segSpeeds.length >= 2) {
    const lastSeg = segSpeeds[segSpeeds.length - 1];
    const firstSeg = segSpeeds[0];
    accel = (lastSeg.speed - firstSeg.speed) / Math.max((lastSeg.tEnd - firstSeg.tEnd) / 1000, MIN_SPAN_MS / 1000);
  }
  const speedBeforeClamp =
    ((1 - PEAK_WEIGHT) * baseSpeed + PEAK_WEIGHT * peakSpeed) *
    (1 + Math.min(Math.max(accel, 0) / ACCEL_REF, 1) * ACCEL_GAIN_MAX);
  const speed = softClampSpeed(speedBeforeClamp) * physics.throwPower;
  if (speed < DEAD_ZONE_SPEED) return null;
  return { vx: (baseVx / baseSpeed) * speed, vy: (baseVy / baseSpeed) * speed };
};

/** 抛掷边界：包围盒左上角的允许活动范围（视口内、「身体贴边」语义） */
export const throwBounds = (o) => {
  const h = o.size * PET_BOX_ASPECT;
  return { minX: -o.sideAllow, minY: 0, maxX: o.W - o.size + o.sideAllow, maxY: o.H - h };
};

/** 把包围盒左上角位置钳进取掷边界（拖拽目标 / 松手落点共用：拖不出视口，身体贴边为止） */
export const clampToThrowBounds = (p, b) => ({
  x: Math.min(Math.max(p.x, b.minX), b.maxX),
  y: Math.min(Math.max(p.y, b.minY), b.maxY),
});

/**
 * 抛体单步积分 + 边界反弹。返回更新后的状态与两个标志：
 * bounced = 本步是否碰边/落地；atRest = 贴地且低速（或碰边后整体低速），调用方应停止循环。
 */
export const throwStep = (s, dtRaw, b, physics = DEFAULT_PHYSICS) => {
  const dt = Math.min(Math.max(dtRaw, 0), MAX_STEP_DT);
  let { x, y, vx, vy } = s;
  vy += physics.gravity * dt;
  x += vx * dt;
  y += vy * dt;
  let bounced = false;
  if (x < b.minX) {
    x = b.minX;
    vx = Math.abs(vx) * physics.restitution;
    bounced = true;
  } else if (x > b.maxX) {
    x = b.maxX;
    vx = -Math.abs(vx) * physics.restitution;
    bounced = true;
  }
  if (y < b.minY) {
    // ceilingBounce=false：顶部无边界，不夹不弹——宠物飞出视口顶部，靠重力落回
    if (physics.ceilingBounce) {
      y = b.minY;
      vy = Math.abs(vy) * physics.restitution;
      bounced = true;
    }
  } else if (y >= b.maxY) {
    y = b.maxY;
    vx *= Math.max(0, 1 - physics.groundFriction * dt);
    if (Math.abs(vy) < REST_VY) vy = 0;
    else vy = -Math.abs(vy) * physics.restitution;
    bounced = true;
  }
  const speed = Math.hypot(vx, vy);
  const atRest =
    (y >= b.maxY - 1 && Math.abs(vy) < 1 && Math.abs(vx) < REST_VX) ||
    (bounced && speed < REST_VY && Math.abs(vy) < 1);
  return { x, y, vx, vy, bounced, atRest };
};

// ---- 积分细分（高初速下防止一帧跨过落地/反弹帧） ----
/** 单步允许的最大位移（px）：一帧位移超过它就拆成多步积分 */
export const SUBSTEP_PX = 8;
/** 单帧最多拆几步 */
export const SUBSTEP_MAX = 64;

/** 一帧该积几步（整数 ≥ 1）。N = 1 是常态。 */
export const throwSubsteps = (vx, vy, dt) => {
  const travel = Math.hypot(vx, vy) * Math.min(Math.max(dt, 0), MAX_STEP_DT);
  if (!(travel > SUBSTEP_PX)) return 1;
  return Math.min(SUBSTEP_MAX, Math.ceil(travel / SUBSTEP_PX));
};
