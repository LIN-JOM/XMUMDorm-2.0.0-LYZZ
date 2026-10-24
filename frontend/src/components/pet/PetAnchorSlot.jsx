import { useEffect, useRef, useState } from 'react';
import PetCard from './PetCard';
import { loadPetConfig } from '../../pet/engine/config';
import { useLanguage } from '../../context/LanguageContextState';
import './pet.css';

/**
 * 认证页（登录/注册/重置密码）的活体吉祥物槽位——替代原静态图 MascotHero。
 *
 * 布局上是一个空占位槽（保持卡片布局稳定、不随配置加载跳动），桌宠本体通过
 * PetCard 的 anchorEl 锚定在槽中心：初始位置取槽的视口矩形（不读 localStorage，
 * 也不落盘——登录页的铃湾是无状态的，与主壳桌宠的位置存储互不干扰）。
 * 交互完整保留：点击回应、拖拽、甩抛、右键点播；「回到初始位置」会回到槽中心。
 */
export default function PetAnchorSlot() {
  const { lang } = useLanguage();
  const [cfg, setCfg] = useState(null);
  const slotRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadPetConfig().then((c) => {
      if (alive) setCfg(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const pet = cfg && cfg.pets.find((p) => p.display === 'web' || p.display === 'both');

  return (
    <div className="flex w-full justify-center">
      <div ref={slotRef} className="pet-anchor-slot" />
      {pet ? (
        <div className="pet-overlay">
          <PetCard cfg={cfg} pet={pet} lang={lang} anchorEl={slotRef} />
        </div>
      ) : null}
    </div>
  );
}
