import { useEffect, useState } from 'react';
import PetCard from './PetCard';
import { loadPetConfig } from '../../pet/engine/config';
import { useLanguage } from '../../context/LanguageContextState';

const HIDDEN_KEY = 'dorm-pet-hidden';

const readHidden = () => {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * 桌宠容器（对应 dsh-pet client/pet.ts 的 PetMulti，MIT License 移植）：
 * 启动时拉取 /pet/config.json 成品配置 → 渲染全部 display 含 web 的宠物实例。
 * 「隐藏桌宠」持久化在 localStorage；隐藏后保留一个角落召唤星，点击唤回（对应 dsh-pet 的托盘位）。
 * 双语：跟随站点 LanguageContext（zh/en），菜单/工具项/碎碎念文案与宠物名按 lang 切换。
 */
export default function PetOverlay() {
  const { lang } = useLanguage();
  const [cfg, setCfg] = useState(null);
  const [hidden, setHidden] = useState(readHidden);

  useEffect(() => {
    let alive = true;
    loadPetConfig().then((c) => {
      if (alive) setCfg(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hide = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(HIDDEN_KEY, 'true');
    } catch { /* 隐私模式下不可持久化：仅本页生效 */ }
  };

  const show = () => {
    setHidden(false);
    try {
      window.localStorage.setItem(HIDDEN_KEY, 'false');
    } catch { /* 同上 */ }
  };

  if (!cfg) return null;
  const pets = cfg.pets.filter((p) => p.display === 'web' || p.display === 'both');

  return (
    <div className="pet-overlay">
      {hidden ? (
        <button
          type="button"
          className="pet-summon"
          onClick={show}
          title={lang === 'en' ? 'Bring back the pet' : '唤出桌宠'}
          aria-label={lang === 'en' ? 'Bring back the pet' : '唤出桌宠'}
        >
          ✦
        </button>
      ) : (
        pets.map((pet) => <PetCard key={pet.id} cfg={cfg} pet={pet} lang={lang} onHide={hide} />)
      )}
    </div>
  );
}
