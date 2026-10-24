// Web 桌宠引擎（frontend/src/pet/engine）纯逻辑单测。
// 移植自 dsh-pet 的 physics/pickers 语义（MIT License），用例覆盖手感曲线的锚点行为。
const {
  springStep,
  softClampSpeed,
  estimateReleaseVelocity,
  throwStep,
  throwSubsteps,
  squashScale,
  landingSquash,
  throwBounds,
  clampToThrowBounds,
  DEFAULT_PHYSICS,
  SQ_SQUASH,
  MAX_THROW_SPEED,
} = require('../frontend/src/pet/engine/physics');
const { pick, pickSlot, rollKind, pickWeightedCategory, pickCategoryAction, isEventAnim } = require('../frontend/src/pet/engine/pickers');
const { decideNext, planMove, scaleMoveDist, BASE_PET_SIZE } = require('../frontend/src/pet/engine/chain');
const { mergePetConfig, DEFAULT_PET_CONFIG, animUrl } = require('../frontend/src/pet/engine/config');

describe('桌宠物理（physics.js）', () => {
  test('softClampSpeed：零为 0，单调递增且渐近不超过 MAX_THROW_SPEED', () => {
    expect(softClampSpeed(0)).toBe(0);
    expect(softClampSpeed(-5)).toBe(0);
    expect(softClampSpeed(100)).toBeLessThan(softClampSpeed(1000));
    expect(softClampSpeed(1e9)).toBeLessThanOrEqual(MAX_THROW_SPEED);
  });

  test('springStep：过阻尼弹簧朝目标收敛', () => {
    // 在目标左侧时速度为正（向右追）
    expect(springStep(0, 0, 100, 0.016)).toBeGreaterThan(0);
    // 已在目标处且速度为 0 → 保持不动
    expect(springStep(0, 100, 100, 0.016)).toBe(0);
    // 阻尼保证单步位移不会越过目标（过阻尼，无 overshoot）
    let x = 0;
    let v = 0;
    for (let i = 0; i < 200; i++) {
      v = springStep(v, x, 100, 0.016);
      x += v * 0.016;
      expect(x).toBeLessThanOrEqual(100 + 1e-6);
    }
    expect(Math.abs(x - 100)).toBeLessThan(0.5);
  });

  test('estimateReleaseVelocity：静止放下 → null（温柔放下）', () => {
    const t = performance.now();
    const trail = [
      { t: t - 300, x: 100, y: 100 },
      { t, x: 101, y: 100 },
    ];
    expect(estimateReleaseVelocity(trail, t)).toBeNull();
  });

  test('estimateReleaseVelocity：快甩 → 抛掷初速方向正确且被软上限封顶', () => {
    const t = performance.now();
    const trail = [];
    for (let i = 0; i < 20; i++) {
      trail.push({ t: t - 150 + i * 8, x: 100 + i * 14, y: 100 });
    }
    const v = estimateReleaseVelocity(trail, t);
    expect(v).not.toBeNull();
    expect(v.vx).toBeGreaterThan(0); // 向右甩 → 向右飞
    expect(v.vy).toBe(0);
    expect(Math.hypot(v.vx, v.vy)).toBeLessThanOrEqual(MAX_THROW_SPEED);
  });

  test('throwStep：重力加速下落，落地反弹衰减直至静止', () => {
    const bounds = throwBounds({ W: 800, H: 600, size: 160, sideAllow: 16 });
    let s = { x: 400, y: 0, vx: 0, vy: 0 };
    let landed = false;
    for (let i = 0; i < 600 && !landed; i++) {
      s = throwStep(s, 1 / 60, bounds, DEFAULT_PHYSICS);
      landed = s.atRest;
    }
    expect(landed).toBe(true);
    expect(s.y).toBe(bounds.maxY); // 停在地面上
  });

  test('throwStep：左右越界反弹且位置被夹回', () => {
    const bounds = throwBounds({ W: 800, H: 600, size: 160, sideAllow: 0 });
    const s = throwStep({ x: 900, y: 100, vx: -100, vy: 0 }, 0.016, bounds, DEFAULT_PHYSICS);
    expect(s.x).toBe(bounds.maxX);
  });

  test('throwStep：ceilingBounce=false 时顶部放行（靠重力落回）', () => {
    const bounds = throwBounds({ W: 800, H: 600, size: 160, sideAllow: 0 });
    const physics = { ...DEFAULT_PHYSICS, ceilingBounce: false };
    const s = throwStep({ x: 400, y: -50, vx: 0, vy: -200 }, 0.016, bounds, physics);
    expect(s.y).toBeLessThan(0); // 不夹回
  });

  test('throwSubsteps：常规帧 1 步，高速帧拆多步', () => {
    expect(throwSubsteps(10, 10, 0.016)).toBe(1);
    expect(throwSubsteps(3000, 0, 0.016)).toBeGreaterThan(1);
  });

  test('clampToThrowBounds：拖拽目标/松手落点钳进边界（拖不出视口）', () => {
    const b = throwBounds({ W: 800, H: 600, size: 240, sideAllow: 30 });
    // 拖出四边都被钳回（允许 sideAllow 的身体越界余量）
    expect(clampToThrowBounds({ x: -500, y: -500 }, b)).toEqual({ x: b.minX, y: b.minY });
    expect(clampToThrowBounds({ x: 9999, y: 9999 }, b)).toEqual({ x: b.maxX, y: b.maxY });
    // 界内原样保留
    expect(clampToThrowBounds({ x: 300, y: 200 }, b)).toEqual({ x: 300, y: 200 });
  });

  test('squashScale：0 进度 = 1，下压段逼近 squash，回弹允许轻微过冲', () => {
    expect(squashScale(0)).toBe(1);
    expect(squashScale(0.45)).toBeCloseTo(SQ_SQUASH, 5);
    expect(squashScale(1)).toBeCloseTo(1, 2);
    expect(squashScale(1)).toBeLessThanOrEqual(1.12);
  });

  test('landingSquash：轻落幅度小，重砸吃满最大下压', () => {
    expect(landingSquash(100)).toBeCloseTo(0.8, 5);
    expect(landingSquash(2000)).toBeCloseTo(SQ_SQUASH, 5);
  });
});

describe('桌宠选择器（pickers.js）', () => {
  test('rollKind：权重边界与 fixed 档位归零', () => {
    const w = { idle: 10, turn: 5, move: 5 };
    expect(rollKind(0.05, w)).toBe('idle');
    expect(rollKind(0.12, w)).toBe('turn');
    expect(rollKind(0.18, w)).toBe('move');
    expect(rollKind(0.5, w)).toBe('action');
    expect(rollKind(0.12, w, { fixed: true })).toBe('action'); // fixed 时 turn/move 份额归入 action
    expect(rollKind(0.05, w, { fixed: true })).toBe('idle');
  });

  test('pick：exclude 排除后不重复；池空时退回原池', () => {
    const pool = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(pick(pool, 'a')).not.toBe('a');
    }
    expect(pick(['a'], 'a')).toBe('a');
  });

  test('pickSlot：字符串槽位原样返回；数组槽位尽量避开 exclude', () => {
    expect(pickSlot('x')).toBe('x');
    for (let i = 0; i < 50; i++) {
      expect(pickSlot(['a', 'b'], 'a')).not.toBe('a');
    }
  });

  test('pickWeightedCategory：noMirror 分类在镜像朝向被排除', () => {
    const cats = [
      { id: 'a', weight: 10, actions: ['a1'] },
      { id: 'b', weight: 0, noMirror: true, actions: ['b1'] },
    ];
    for (let i = 0; i < 50; i++) {
      expect(pickWeightedCategory(cats, 'right').id).toBe('a');
    }
    expect(pickWeightedCategory(cats, 'left')).not.toBeNull();
  });

  test('pickCategoryAction：空分类池回退 idle 池', () => {
    const r = pickCategoryAction([], ['idle1', 'idle2'], 'left', 'idle1');
    expect(r).toEqual({ id: 'FALLBACK', name: 'idle2' });
  });

  test('isEventAnim：识别事件池（含数组档位）里的动画', () => {
    const events = { whisper: ['a', ['b', 'c']] };
    expect(isEventAnim(events, 'b')).toBe(true);
    expect(isEventAnim(events, 'd')).toBe(false);
  });
});

describe('动画链（chain.js）', () => {
  const animations = {
    idle: ['idle1', 'idle2'],
    turn: ['look1'],
    drag: ['dangle1'],
    clicks: ['hop'],
    moves: {
      default: { minDist: 100, maxDist: 100, margin: 20, leadSec: 0.6, tailSec: 0.8 },
      actions: [{ name: 'walk1' }, { name: 'walk2', params: { minDist: 40 } }],
    },
    categories: [{ id: '小动作', weight: 100, actions: ['act1'] }],
    events: { whisper: ['murmur'] },
  };
  const weights = { idle: 10, turn: 5, move: 5 };

  test('decideNext：三类掷骰各归其位', () => {
    expect(decideNext({ roll: 0.05, weights, animations, facing: 'left', current: '' }).kind).toBe('idle');
    expect(decideNext({ roll: 0.12, weights, animations, facing: 'left', current: '' }).name).toBe('look1');
    const mv = decideNext({ roll: 0.18, weights, animations, facing: 'left', current: '' });
    expect(mv.kind).toBe('move');
    // 随机抽 walk1/walk2 之一；default 与动作 params 已合并
    expect([100, 40]).toContain(mv.params.minDist);
    expect(mv.params.margin).toBe(20);
    expect(decideNext({ roll: 0.5, weights, animations, facing: 'left', current: '' }).name).toBe('act1');
  });

  test('decideNext：turn 池为空时退化为 idle', () => {
    const a = { ...animations, turn: [] };
    expect(decideNext({ roll: 0.12, weights, animations: a, facing: 'left', current: '' }).kind).toBe('idle');
  });

  test('scaleMoveDist：按实际宽度等比缩放', () => {
    expect(scaleMoveDist(100, BASE_PET_SIZE)).toBe(100);
    expect(scaleMoveDist(100, BASE_PET_SIZE / 2)).toBe(50);
  });

  test('planMove：朝朝向方向走并 clamp 在视口内', () => {
    const size = 160;
    const params = { minDist: 100, maxDist: 100, margin: 20, leadSec: 0.5, tailSec: 0.5 };
    // 已贴右边界（x = W - size - margin）仍朝右走 → 无处可去 → null
    expect(planMove({ x: 620, facing: 'right', size, W: 800, params, durationMs: 3000 })).toBeNull();
    // 越界停在右侧（body 探出边界）时朝右走 → clamp 后被拉回边界
    const back = planMove({ x: 700, facing: 'right', size, W: 800, params, durationMs: 3000 });
    expect(back).not.toBeNull();
    expect(back.toX).toBe(620);
    // 朝左走有空间
    const plan = planMove({ x: 700, facing: 'left', size, W: 800, params, durationMs: 3000 });
    expect(plan).not.toBeNull();
    expect(plan.toX).toBeLessThan(700);
    expect(plan.dir).toBe(-1);
    expect(plan.walkStartMs).toBe(500);
    expect(plan.walkEndMs).toBe(2500);
  });
});

describe('配置合并（config.js）', () => {
  test('无外部配置 → 完整回落内置默认', () => {
    const cfg = mergePetConfig(null);
    expect(cfg.source).toBe('video');
    expect(cfg.pets).toHaveLength(1);
    expect(cfg.pets[0].name).toBe('铃湾');
    expect(cfg.pets[0].nameEn).toBe('Cornie');
    expect(cfg.whisper.phrasesEn.length).toBeGreaterThan(0);
    expect(cfg.animations.idle).toEqual(DEFAULT_PET_CONFIG.animations.idle);
    expect(cfg.physics.gravity).toBe(1400);
  });

  test('显式写错/缺失逐字段回落默认', () => {
    const cfg = mergePetConfig({
      source: 'video',
      physics: { gravity: 'abc', restitution: 5 },
      animationWeights: { idle: 20 },
      animations: { idle: ['x'], clicks: [], categories: [{ id: 'c', weight: 'n', actions: ['a'] }] },
    });
    expect(cfg.source).toBe('video');
    expect(cfg.physics.gravity).toBe(1400); // 非数字回落
    expect(cfg.physics.restitution).toBe(1); // 越界钳取
    expect(cfg.animationWeights.idle).toBe(20);
    expect(cfg.animationWeights.turn).toBe(DEFAULT_PET_CONFIG.animationWeights.turn); // 缺失回落
    expect(cfg.animations.clicks).toEqual(DEFAULT_PET_CONFIG.animations.clicks); // 空池回落
    expect(cfg.animations.categories[0].weight).toBe(10); // 非数字权重回落
    expect(cfg.animations.idle).toEqual(['x']); // 合法字段整段采纳
  });

  test('pets 数量与尺寸钳取', () => {
    const cfg = mergePetConfig({ pets: [{ id: 'b', size: 9999 }, { size: 10 }] });
    expect(cfg.pets).toHaveLength(2);
    expect(cfg.pets[0].size).toBe(480);
    expect(cfg.pets[1].size).toBe(56);
    expect(cfg.pets[1].id).toBe('main'); // 缺 id 回落
  });

  test('animUrl：名字即文件名', () => {
    const cfg = { assetRoot: 'main-animation' };
    expect(animUrl(cfg, '待机呼吸休闲')).toBe('/pet/main-animation/webm/%E5%BE%85%E6%9C%BA%E5%91%BC%E5%90%B8%E4%BC%91%E9%97%B2.webm');
  });
});
