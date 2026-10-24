import { useState } from 'react';

/**
 * 桌宠右键菜单（对应 dsh-pet 的 buildMenuTree：动作 → 分类 → 具体动画 三级点播 + 工具项）。
 * 简化为两级面板：一级 = 分类 / 工具项；点分类进入二级动作列表（带返回）。
 * 点播语义：移动类动画点播会真实走一段（PetCard 的 playRequested 统一判定）。
 * 双语：分类标题用 labelEn（缺失回落 id），走两步/返回按钮按 lang 切换；
 * 具体动作名 = 素材文件名，保持原语言（与 dsh-pet「名字即文件名」同口径）。
 */
export default function PetMenu({ animations, lang = 'zh', onPlay, tools, onClose }) {
  const [openKey, setOpenKey] = useState(null);
  const isEn = lang === 'en';

  // 一级条目：移动池 + 各分类。key 唯一（移动池用保留前缀 __moves，避免与分类 id 撞车）
  const items = [];
  if (animations.moves.actions.length) {
    items.push({
      key: '__moves',
      label: isEn ? 'Take a walk' : '走两步',
      actions: animations.moves.actions.map((a) => a.name),
    });
  }
  for (const c of animations.categories) {
    if (!c.actions.length) continue;
    items.push({
      key: 'cat:' + c.id,
      label: isEn && c.labelEn ? c.labelEn : c.id,
      actions: c.actions,
    });
  }

  const item = items.find((it) => it.key === openKey) || null;

  const handlePick = (name) => {
    onPlay(name);
    onClose();
  };

  return (
    <div className="pet-menu" onContextMenu={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
      {item ? (
        <>
          <button type="button" className="pet-menu__item pet-menu__item--back" onClick={() => setOpenKey(null)}>
            ‹ {item.label}
          </button>
          {item.actions.map((name) => (
            <button key={name} type="button" className="pet-menu__item" onClick={() => handlePick(name)}>
              {name}
            </button>
          ))}
        </>
      ) : (
        <>
          {items.map((it) => (
            <button key={it.key} type="button" className="pet-menu__item" onClick={() => setOpenKey(it.key)}>
              {it.label} ›
            </button>
          ))}
          {(tools || []).map((t) => (
            <button
              key={t.label}
              type="button"
              className="pet-menu__item pet-menu__item--tool"
              onClick={() => {
                t.onClick();
                onClose();
              }}
            >
              {t.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
