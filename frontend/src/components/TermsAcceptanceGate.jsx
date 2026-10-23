import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import './TermsAcceptanceGate.css';

export default function TermsAcceptanceGate({
  isEn = false,
  version = '',
  loading = false,
  accepting = false,
  error = '',
  onAccept,
  onRetry,
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (loading) {
    return (
      <section className="terms-gate terms-gate--loading" aria-live="polite">
        <span className="terms-gate__loader" aria-hidden="true" />
        <div>
          <p className="terms-gate__eyebrow">{isEn ? 'PUBLISHING CHECK' : '发布前检查'}</p>
          <p className="terms-gate__loading-copy">{isEn ? 'Checking your terms status…' : '正在检查服务条款状态…'}</p>
        </div>
      </section>
    );
  }

  if (!version) {
    return (
      <section className="terms-gate terms-gate--error" role="alert">
        <div className="terms-gate__mark" aria-hidden="true">!</div>
        <div className="terms-gate__body">
          <p className="terms-gate__eyebrow">{isEn ? 'PUBLISHING CHECK' : '发布前检查'}</p>
          <h2 className="terms-gate__title">
            {isEn ? 'Terms status is unavailable' : '暂时无法读取服务条款状态'}
          </h2>
          <p className="terms-gate__copy">
            {error || (isEn ? 'Please try again before publishing.' : '请重试后再发布内容。')}
          </p>
          {onRetry ? (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {isEn ? 'Try again' : '重新检查'}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="terms-gate" aria-labelledby="terms-gate-title">
      <div className="terms-gate__mark" aria-hidden="true">§</div>
      <div className="terms-gate__body">
        <p className="terms-gate__eyebrow">{isEn ? 'ONE STEP BEFORE PUBLISHING' : '发布前需要确认一次'}</p>
        <h2 id="terms-gate-title" className="terms-gate__title">
          {isEn ? 'Accept the current terms to publish' : '接受当前服务条款后即可发布'}
        </h2>
        <p className="terms-gate__copy">
          {isEn
            ? 'Your post is user-generated content. Read the terms, then confirm that you agree to the rules for publishing and content moderation.'
            : '你发布的内容属于用户内容。请阅读服务条款，并确认你同意发布与内容管理规则。'}
        </p>
        <p className="terms-gate__version">
          {isEn ? `Current version: ${version}` : `当前版本：${version}`}
        </p>

        <label className="terms-gate__check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={accepting}
          />
          <span>
            {isEn ? 'I have read and agree to the current Terms of Service.' : '我已阅读并同意当前《用户服务协议》。'}
          </span>
        </label>

        {error ? <p className="terms-gate__error" role="alert">{error}</p> : null}

        <div className="terms-gate__actions">
          <Link className="terms-gate__link" to="/terms" target="_blank" rel="noreferrer">
            {isEn ? 'Read the full terms' : '查看完整服务条款'}
          </Link>
          <Button
            type="button"
            loading={accepting}
            disabled={!confirmed}
            onClick={onAccept}
          >
            {isEn ? 'Accept and continue' : '同意并继续'}
          </Button>
        </div>
      </div>
    </section>
  );
}
