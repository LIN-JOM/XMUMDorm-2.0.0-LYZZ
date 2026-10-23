import { useLanguage } from '../context/LanguageContextState';
import { postAttributionLabel } from '../utils/postAttribution';
import './PostAttribution.css';

export default function PostAttribution({ post, compact = false }) {
  const { lang } = useLanguage();
  const label = postAttributionLabel(post, lang);
  return label ? (
    <span className={`post-attribution${compact ? ' post-attribution--compact' : ''}`} title={label}>
      {label}
    </span>
  ) : null;
}
