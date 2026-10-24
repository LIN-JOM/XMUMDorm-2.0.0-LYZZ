// 默认配置 + 外部配置加载/合并（对应 dsh-pet 的 assets/config.jsonc + host/config.ts 合并成品，
// MIT License；本项目的宿主是自己的 web 前端，故合并逻辑收在前端：启动时 fetch /pet/config.json，
// 失败/缺字段一律回落内置默认值，不让脏配置毁掉渲染）。
//
// 结构与 dsh-pet config.jsonc 同构：
//   animations { idle/turn/drag/clicks/moves/categories/events } + animationWeights { idle/turn/move }
//   + physics（gravity/restitution/groundFriction/ceilingBounce/throwPower）+ pets[]（多开）。
// 素材 = main-animation/webm/ 下的 VP9-Alpha 透明 webm（动画名 = 文件名），由 AI 视频生成
// + scripts/pet/pet_pipeline.py 素材链产出；**全部使用 AI 动画，无 CSS 兜底**——素材缺失时
// 引擎回落 idle 池（idle 也没有则保持上一段不换源），不上任何替代形象。
// 差异点（本项目特有）：
//   - whisper: { phrases: [] } 碎碎念本地文案池（dsh-pet 走 LLM 生成，本项目 v1 用本地池，
//     接入后端对话接口后可无缝替换）
import { DEFAULT_PHYSICS } from './physics';

/** 内置默认配置（= dsh-pet assets/config.jsonc 的本项目等价物；与 public/pet/config.json 同步维护） */
export const DEFAULT_PET_CONFIG = {
  source: 'video',
  assetRoot: 'main-animation',
  physics: { ...DEFAULT_PHYSICS },
  animationWeights: { idle: 10, turn: 5, move: 5 },
  eventsRefreshSec: { whisper: 180 },
  // 碎碎念本地文案池：到点随机抽一句弹气泡（对应 dsh-pet 的 whisperPrompt + LLM 链路）。
  // 人设 = 吉祥物「铃湾 Cornie」（梦幻星铃独角兽）：软萌独角兽少女，住在厦马小筑网页里。
  // phrases = 中文池，phrasesEn = 英文池（双语模式按 LanguageContext 的 lang 取）。
  whisper: {
    phrases: [
      '叮铃～今天也要闪闪发光哦！',
      '作业写完了吗？铃湾先替你愁一会儿。',
      '食堂三楼的糖醋排骨，是人间美味！',
      '窗外下雨了，最适合裹着毯子睡觉……呼……',
      '记得多喝水，别总抱着手机呀。',
      '有二手好物记得来小筑逛逛，铃湾帮你掌眼！',
      'Deadline 是第一生产力，但别熬太晚！独角会疼的。',
      '马来下午好热……铃湾想住进冰箱里。',
      '偷偷说：右键我可以点播动作哦！',
      '今天的心情余额还剩多少呀？',
      '再把奶茶放我头上，铃铛就要被喝掉了！',
      '图书馆抢到座了吗？没抢到别慌，铃湾陪你。',
      '呼——吸——呼——吸——（待机充电中）',
      '被你拖着甩来甩去……其实还挺好玩，再来一次！',
      '月底啦，生活费余额和铃湾的角一起发光（变少）……',
    ],
    phrasesEn: [
      'Ring ring~ shine bright today!',
      'Homework done yet? Cornie is worrying for you.',
      'The sweet-and-sour ribs on floor 3 are heaven!',
      'Rainy days are for blanket naps... zzz...',
      'Drink more water, put the phone down a bit!',
      'Got second-hand treasures? Cornie will check them for you!',
      'Deadlines fuel productivity, but no all-nighters — my horn aches!',
      "It's SO hot this afternoon... Cornie wants to live in a fridge.",
      'Psst: right-click me to pick an action!',
      "How's your mood balance today?",
      'Put more milk tea on my head and the bell gets drunk!',
      'Got a library seat? If not, Cornie keeps you company.',
      'Breathe in... breathe out... (idle charging)',
      'Being tossed around is... actually fun! Again!',
      'End of month — my allowance glows (fades) just like my horn...',
    ],
  },
  pets: [
    {
      id: 'main',
      name: '铃湾', // 中文显示名
      nameEn: 'Cornie', // 英文显示名（双语模式）
      size: 240, // 包围盒宽 px；方形盒（PET_BOX_ASPECT=1，素材链 360×360 方形裁剪）
      fixedEnabled: false, // true = 不自主转向/漫游
      display: 'both', // 与 dsh-pet 同字段：web/desktop/both/none（本端只有 web 生效）
      position: { corner: 'bottom-right', marginX: 24, marginY: 24 },
    },
  ],
  // 动画名 = webm 文件名（frontend/public/pet/main-animation/webm/<名>.webm）
  // 「轻声细语」已整体下线（灰影严重且非必需，2026-10-24 裁决；源 mp4 保留在 video/ 目录）
  animations: {
    idle: ['东张西望'], // 长期暂代待机呼吸（暂无生成预算，见实现记录）
    turn: ['东张西望'],
    drag: ['被吓一跳'],
    clicks: ['跳起来', '害羞', '生气傲娇', '挥手打招呼'],
    moves: {
      default: { minDist: 60, maxDist: 240, margin: 20, leadSec: 1.2, tailSec: 1.5 },
      actions: [{ name: '螃蟹走' }],
    },
    categories: [
      { id: '小动作', labelEn: 'Little moves', weight: 45, actions: ['伸懒腰', '睡觉'] },
      { id: '玩耍', labelEn: 'Play', weight: 35, actions: ['玩魔方', '挥手打招呼', '跳起来'] },
    ],
    events: {
      whisper: [], // 空 = 碎碎念只弹气泡，不联动切动画（原联动的轻声细语已下线）
    },
  },
};

// ---- 收窄工具（形状不对 → 回落默认，与 dsh-pet「结构性缺失静默、显式写错告警」同哲学） ----
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x !== '') : []);
const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);

const normMoves = (moves) => {
  const src = moves && typeof moves === 'object' ? moves : {};
  const d = src.default && typeof src.default === 'object' ? src.default : {};
  const actions = Array.isArray(src.actions)
    ? src.actions
        .filter((a) => a && typeof a === 'object' && typeof a.name === 'string' && a.name !== '')
        .map((a) => ({ name: a.name, params: a.params && typeof a.params === 'object' ? a.params : undefined }))
    : [];
  return {
    default: {
      minDist: num(d.minDist, 60),
      maxDist: num(d.maxDist, 240),
      margin: num(d.margin, 20),
      leadSec: num(d.leadSec, 1.2),
      tailSec: num(d.tailSec, 1.5),
    },
    actions,
  };
};

const normAnimations = (a) => {
  const src = a && typeof a === 'object' ? a : {};
  const categories = Array.isArray(src.categories)
    ? src.categories
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({
          id: typeof c.id === 'string' && c.id ? c.id : '分类',
          labelEn: typeof c.labelEn === 'string' && c.labelEn ? c.labelEn : undefined,
          weight: num(c.weight, 10),
          noMirror: bool(c.noMirror, false),
          actions: strings(c.actions),
        }))
    : [];
  const eventsSrc = src.events && typeof src.events === 'object' ? src.events : {};
  const events = {};
  for (const [key, pool] of Object.entries(eventsSrc)) {
    if (!Array.isArray(pool)) continue;
    // 档位槽位：单个名字或候选数组，两种都合法
    events[key] = pool
      .map((slot) => (typeof slot === 'string' && slot !== '' ? slot : Array.isArray(slot) ? strings(slot) : null))
      .filter((slot) => (typeof slot === 'string' ? slot : slot.length > 0));
  }
  return {
    idle: strings(src.idle),
    turn: strings(src.turn),
    drag: strings(src.drag),
    clicks: strings(src.clicks),
    moves: normMoves(src.moves),
    categories,
    events,
  };
};

const normPet = (p) => {
  const src = p && typeof p === 'object' ? p : {};
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const pos = src.position && typeof src.position === 'object' ? src.position : {};
  return {
    id: typeof src.id === 'string' && src.id ? src.id : 'main',
    name: typeof src.name === 'string' && src.name ? src.name : '铃湾',
    nameEn: typeof src.nameEn === 'string' && src.nameEn ? src.nameEn : undefined,
    size: Math.min(480, Math.max(56, num(src.size, 240))),
    fixedEnabled: bool(src.fixedEnabled, false),
    display: ['web', 'desktop', 'both', 'none'].includes(src.display) ? src.display : 'both',
    position: {
      corner: corners.includes(pos.corner) ? pos.corner : 'bottom-right',
      marginX: num(pos.marginX, 24),
      marginY: num(pos.marginY, 24),
    },
  };
};

/**
 * 外部配置（fetch 到的 JSON）→ 填满的成品配置。整段校验逐字段收窄，缺失回落内置默认。
 * 注意 pets[] 是**整段替换**：外部写了就用外部的（与 dsh-pet 同口径），没写用内置默认。
 */
export const mergePetConfig = (raw) => {
  const base = DEFAULT_PET_CONFIG;
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(base));
  const out = {
    source: 'video',
    assetRoot: typeof raw.assetRoot === 'string' && raw.assetRoot ? raw.assetRoot : base.assetRoot,
    physics: {
      gravity: num(raw.physics?.gravity, base.physics.gravity),
      restitution: Math.min(1, Math.max(0, num(raw.physics?.restitution, base.physics.restitution))),
      groundFriction: num(raw.physics?.groundFriction, base.physics.groundFriction),
      ceilingBounce: bool(raw.physics?.ceilingBounce, base.physics.ceilingBounce),
      throwPower: Math.max(0.1, num(raw.physics?.throwPower, base.physics.throwPower)),
    },
    animationWeights: {
      idle: num(raw.animationWeights?.idle, base.animationWeights.idle),
      turn: num(raw.animationWeights?.turn, base.animationWeights.turn),
      move: num(raw.animationWeights?.move, base.animationWeights.move),
    },
    eventsRefreshSec: {
      whisper: Math.max(30, num(raw.eventsRefreshSec?.whisper, base.eventsRefreshSec.whisper)),
    },
    whisper: {
      phrases: strings(raw.whisper?.phrases).length ? strings(raw.whisper?.phrases) : base.whisper.phrases,
      phrasesEn: strings(raw.whisper?.phrasesEn).length ? strings(raw.whisper?.phrasesEn) : base.whisper.phrasesEn,
    },
    pets: Array.isArray(raw.pets) && raw.pets.length ? raw.pets.map(normPet) : base.pets,
    animations: normAnimations(raw.animations),
  };
  // 池子被外部清空时回落内置默认（链路里空池会抽不出动画）
  const a = out.animations;
  if (!a.idle.length) a.idle = base.animations.idle;
  if (!a.drag.length) a.drag = base.animations.drag;
  if (!a.moves.actions.length) a.moves.actions = base.animations.moves.actions;
  if (!a.clicks.length) a.clicks = base.animations.clicks;
  return out;
};

/** 拉取 /pet/config.json（cache: no-store，改配置刷新即生效）；任何失败回落内置默认。 */
export const loadPetConfig = async () => {
  try {
    const res = await fetch('/pet/config.json', { cache: 'no-store' });
    if (!res.ok) return mergePetConfig(null);
    const raw = await res.json();
    return mergePetConfig(raw);
  } catch {
    return mergePetConfig(null);
  }
};

/** 动画名 → 素材地址。名字即文件名，与 dsh-pet 同口径；
 *  assetRoot 即素材目录名（如 main-animation → /pet/main-animation/webm/<名>.webm）。 */
export const animUrl = (cfg, name) => `/pet/${cfg.assetRoot}/webm/${encodeURIComponent(name)}.webm`;
