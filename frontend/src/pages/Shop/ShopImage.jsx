import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PRODUCT_IMAGE_PATH } from '@shared/api/config';
import ImagePreview from '../../components/ImagePreview';
import { shopImageUrl } from './shopImageUrl';

export function ShopImagePreview({ src, onClose }) {
  useEffect(() => {
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); onClose();
    };
    // Close only the top preview, preserving the product editor underneath.
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [onClose]);
  // Portals still bubble through React parents (including the product Router Link).
  return createPortal(<div onClick={event => event.stopPropagation()}>
    <ImagePreview urls={[shopImageUrl(src)]} onClose={onClose} />
  </div>, document.body);
}

export default function ShopImage({ src, alt, preview = true, className = '', ...props }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const [open, setOpen] = useState(false);
  const image = useRef(null);
  const url = shopImageUrl(src);
  const failed = failedUrl === url;
  const canPreview = preview && !!src && !failed;
  const show = event => {
    event.preventDefault(); event.stopPropagation();
    if (canPreview) setOpen(true);
  };
  const close = () => { setOpen(false); image.current?.focus(); };
  return <>
    <img {...props} ref={image} src={failed ? DEFAULT_PRODUCT_IMAGE_PATH : url} alt={alt}
      className={`${className}${canPreview ? ' shop-image-preview-trigger' : ''}`}
      role={canPreview ? 'button' : undefined} tabIndex={canPreview ? 0 : undefined}
      title={canPreview ? '查看大图 / View image' : undefined}
      onClick={canPreview ? show : undefined}
      onKeyDown={canPreview ? event => { if (event.key === 'Enter' || event.key === ' ') show(event); } : undefined}
      onError={() => setFailedUrl(url)} />
    {open && <ShopImagePreview src={src} onClose={close} />}
  </>;
}
