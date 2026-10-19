export type MoodleIdentityResult = { requestId: string } & (
  | { status: 'confirmed'; userId: number }
  | { status: 'expired' | 'unknown' | 'wrong-origin' }
);
const IDENTITY_KIND = 'dorm:moodle:identity';

/** ⚠️ Hermes 下 `Function.prototype.toString()` 返回 `"[bytecode]"`（本机 dev build 实测），
 * 注入 WebView 的源码必须是**字面量**，不得改回 `.toString()`。
 * 选择器来自校方实站：登录态由 `#user-menu-toggle`/`.usermenu-container` 证明，
 * 用户 id 在 `#usernavigation [data-userid]`（M.cfg 里没有 userId）。 */
export const IDENTITY_INSPECT_SOURCE = `function inspectMoodleIdentity(root, origin, userId) {
  if (origin !== 'https://l.xmu.edu.my') return { status: 'wrong-origin' };
  if (root.querySelector('input[type=password]') || root.querySelector('.usermenu .login')) return { status: 'unknown' };
  var menu = root.querySelector('#user-menu-toggle') || root.querySelector('[data-region=usermenu] .usermenu #user-menu-toggle') || root.querySelector('.usermenu-container');
  if (!menu) return { status: 'unknown' };
  var declared = root.querySelector('#usernavigation [data-userid]') || root.querySelector('nav.navbar [data-userid]') || root.querySelector('.usermenu-container [data-userid]');
  var raw = declared ? declared.getAttribute('data-userid') : null;
  var id = (typeof userId === 'number' && isFinite(userId) && userId > 0) ? userId : null;
  if (raw !== null) {
    if (!/^\\d+$/.test(String(raw).trim())) return { status: 'unknown' };
    id = Number(String(raw).trim());
  }
  if (id === null || !isFinite(id) || id <= 0) return { status: 'unknown' };
  return { status: 'confirmed', userId: id };
}`;

export function buildMoodleIdentityProbeScript(id: string): string | null {
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(id)) return null;
  return `(function(){var inspect=(${IDENTITY_INSPECT_SOURCE});
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
