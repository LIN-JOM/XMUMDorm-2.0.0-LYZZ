export type MoodleIdentityResult = { requestId: string } & (
  | { status: 'confirmed'; userId: number }
  | { status: 'expired' | 'unknown' | 'wrong-origin' }
);
const IDENTITY_KIND = 'dorm:moodle:identity';

/** Moodle exposes the current user id on the authenticated navbar (`data-userid`); some builds
 * also mirror it in `M.cfg.userid`/`M.cfg.userId`. Both are accepted; the menu must prove login.
 * ⚠️ 本函数会被 `toString()` 注入 WebView，必须自包含：域名与选择器字面量只能内联。 */
export function inspectMoodleIdentity(root: Pick<Document, 'querySelector'>, origin: string, userId: unknown):
  { status: 'confirmed'; userId: number } | { status: 'expired' | 'unknown' | 'wrong-origin' } {
  if (origin !== 'https://l.xmu.edu.my') return { status: 'wrong-origin' };
  // A password field or the guest menu proves we are NOT the signed-in workspace.
  // The probe carries no history, so it cannot claim "expired"; the session layer owns that.
  if (root.querySelector('input[type=password]') || root.querySelector('.usermenu .login')) return { status: 'unknown' };
  const menu = root.querySelector('#user-menu-toggle')
    ?? root.querySelector('[data-region=usermenu] .usermenu #user-menu-toggle')
    ?? root.querySelector('.usermenu-container');
  if (!menu) return { status: 'unknown' };
  const declared = root.querySelector('#usernavigation [data-userid]')
    ?? root.querySelector('nav.navbar [data-userid]')
    ?? root.querySelector('.usermenu-container [data-userid]');
  const raw = declared?.getAttribute('data-userid') ?? null;
  let id = typeof userId === 'number' && Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  if (raw !== null) {
    const numeric = raw.trim();
    if (!/^\d+$/.test(numeric)) return { status: 'unknown' };
    id = Number(numeric);
  }
  if (id === null || !Number.isSafeInteger(id) || id <= 0) return { status: 'unknown' };
  return { status: 'confirmed', userId: id };
}

export function buildMoodleIdentityProbeScript(id: string): string | null {
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(id)) return null;
  return `(function(){var inspect=(${inspectMoodleIdentity.toString()});
    var result=inspect(document,window.location.origin,window.M&&window.M.cfg&&window.M.cfg.userId);
    var message={kind:${JSON.stringify(IDENTITY_KIND)},requestId:${JSON.stringify(id)},status:result.status};
    if(result.status==='confirmed')message.userId=result.userId;
    window.ReactNativeWebView.postMessage(JSON.stringify(message));})();true;`;
}

/** No password, Cookie, complete M.cfg, profile body or project JWT enters native. */
export function parseMoodleIdentityMessage(raw: string): MoodleIdentityResult | null {
  if (raw.length > 2000) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value?.kind !== IDENTITY_KIND || typeof value.requestId !== 'string'
      || !/^[a-zA-Z0-9:_-]{1,80}$/.test(value.requestId)) return null;
    if (value.status === 'confirmed' && typeof value.userId === 'number'
      && Number.isSafeInteger(value.userId) && value.userId > 0) {
      return { requestId: value.requestId, status: 'confirmed', userId: value.userId };
    }
    return value.status === 'expired' || value.status === 'unknown' || value.status === 'wrong-origin'
      ? { requestId: value.requestId, status: value.status } : null;
  } catch { return null; }
}
