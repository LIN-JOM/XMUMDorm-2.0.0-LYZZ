import { readMoodleCache } from './cache';
import { IDENTITY_INSPECT_SOURCE } from './identity';
import { EXTRACT_MOODLE_DETAIL_SOURCE, PROJECT_MOODLE_FILE_HEADERS_SOURCE,
  SAFE_MOODLE_URL_SOURCE } from './injected-sources';

export type MoodleDetailKind = 'forum' | 'discussion' | 'assign' | 'folder' | 'resource';
export type MoodleDetailRequest = { kind: MoodleDetailKind; courseId: number; moduleId: number; url: string };
export type MoodleFile = { name: string; url: string; mimeType: string | null; size: number | null;
  modifiedAt: string | null };
export type MoodleAnnouncement = { id: number; title: string; author: string | null; pinned: boolean; url: string };
export type MoodlePost = { id: number; title: string; author: string | null; createdAt: string | null;
  body: string; url: string; attachments: MoodleFile[] };
export type MoodleDetail = MoodleDetailRequest & { description: string } & (
  | { kind: 'forum'; announcements: MoodleAnnouncement[] }
  | { kind: 'discussion'; posts: MoodlePost[] }
  | { kind: 'assign'; submission: 'submitted' | 'draft' | 'reopened' | 'unknown';
      grading: 'graded' | 'not-graded' | 'unknown'; locked: boolean; rows: { label: string; value: string }[];
      /** School-provided "Opened:/Due:" text; not parsed into typed dates. */
      activityDates: string | null; attachments: MoodleFile[] }
  | { kind: 'folder'; files: MoodleFile[] }
  | { kind: 'resource'; file: MoodleFile | null }
);
export type MoodleDetailFailure = 'expired' | 'denied' | 'unavailable' | 'invalid-data' | 'timeout'
  | 'wrong-origin' | 'redirect-blocked';
export type MoodleDetailResult = { requestId: string } &
  ({ status: 'success'; data: MoodleDetail } | { status: MoodleDetailFailure });
const DETAIL_KIND = 'dorm:moodle:detail';

/** Strict read paths. Unknown or duplicate parameters are rejected, never silently stripped.
 * ⚠️ 本函数会被 `toString()` 注入 WebView，必须自包含：域名与路径字面量只能内联，不能改成模块常量。 */
export function safeMoodleReadUrl(value: unknown, file = false): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value, 'https://l.xmu.edu.my/');
    if (url.origin !== 'https://l.xmu.edu.my' || url.username || url.password) return null;
    const parameters = [...url.searchParams.keys()];
    if (new Set(parameters).size !== parameters.length) return null;
    if (file) {
      if (!/^\/pluginfile\.php\/\d+\/mod_(resource|folder|forum|assign)\/(content|attachment|post|submission_files)\/\d+\/.+/.test(url.pathname)
        || url.hash || parameters.some((key) => key !== 'forcedownload')
        || (url.searchParams.has('forcedownload') && !/^[01]$/.test(url.searchParams.get('forcedownload')!))) return null;
      const parts = url.pathname.split('/').slice(1);
      const component = parts[2], area = parts[3];
      // Campus 4.x serves assignment submissions under mod_assign/submission_files; other
      // components keep the content/attachment/post allow-list.
      const allowed = component === 'mod_forum' ? (area === 'attachment' || area === 'post')
        : component === 'mod_assign' ? area === 'submission_files'
          : area === 'content';
      if (!allowed) return null;
      for (const part of parts) {
        const decoded = decodeURIComponent(part);
        if (!decoded || decoded === '.' || decoded === '..' || /[\\/\x00-\x1f\x7f]/.test(decoded)) return null;
      }
    } else if (/^\/mod\/(forum|assign|folder|resource|page|url|choice|quiz)\/view\.php$/.test(url.pathname)) {
      const allowed = url.pathname === '/mod/forum/view.php' ? ['id', 'p'] : ['id'];
      if (url.hash || parameters.some((key) => !allowed.includes(key))
        || !/^[1-9]\d*$/.test(url.searchParams.get('id') ?? '')
        || (url.searchParams.has('p') && !/^\d+$/.test(url.searchParams.get('p')!))) return null;
    } else if (url.pathname === '/mod/forum/discuss.php') {
      if (parameters.some((key) => key !== 'd' && key !== 'parent')
        || !/^[1-9]\d*$/.test(url.searchParams.get('d') ?? '')
        || (url.searchParams.has('parent') && !/^[1-9]\d*$/.test(url.searchParams.get('parent')!))
        || (url.hash && !/^#p[1-9]\d*$/.test(url.hash))) return null;
    } else return null;
    return url.href;
  } catch { return null; }
}

/** A discussion URL must first have been discovered in this module's accepted forum result. */
export function authorizeMoodleDetail(request: MoodleDetailRequest, discovered: readonly string[] = []): boolean {  const cache = readMoodleCache();
  const state = cache.states.find((item) => item.courseId === request.courseId);
  const module = state?.modules.find((item) => item.id === request.moduleId);
  if (!module || !module.visible || !module.userVisible || !cache.courses.some((item) => item.id === request.courseId)) return false;
  const expectedType = request.kind === 'discussion' ? 'forum' : request.kind;
  if (module.type !== expectedType || !module.url || !safeMoodleReadUrl(request.url)) return false;
  if (request.kind === 'discussion') return discovered.includes(request.url);
  return safeMoodleReadUrl(module.url) === request.url
    && Number(new URL(request.url).searchParams.get('id')) === module.id;
}

/** Executed inside the page against an inert fragment; source HTML never crosses the bridge. */
export function extractMoodleDetail(request: MoodleDetailRequest, root: ParentNode): MoodleDetail | null {
  function text(node: Element | null): string {
    if (!node) return '';
    const copy = node.cloneNode(true) as Element;
    copy.querySelectorAll('script,style,form,input,textarea,select,iframe,object,embed').forEach((child) => child.remove());
    return (copy.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 12000);
  }
  function link(node: Element | null, file = false) {
    return safeMoodleReadUrl(node?.getAttribute('href'), file);
  }
  function file(node: Element, component: string): MoodleFile | null {
    const url = link(node, true);
    if (!url || !new URL(url).pathname.includes(`/${component}/`)) return null;
    const name = text(node) || decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
    return { name: name.slice(0, 256), url, mimeType: null, size: null, modifiedAt: null };
  }
  const common = { courseId: request.courseId, moduleId: request.moduleId, url: request.url,
    description: text(root.querySelector('#intro.activity-description')) };
  if (request.kind === 'forum') {
    const announcements: MoodleAnnouncement[] = [];
    for (const row of Array.from(root.querySelectorAll('[data-region="discussion-list-item"][data-discussionid]')).slice(0, 200)) {
      const id = Number(row.getAttribute('data-discussionid'));
      const anchor = row.querySelector('th.topic a[href]');
      const url = link(anchor);
      const title = (anchor?.getAttribute('title') ?? text(anchor)).trim().slice(0, 1000);
      if (!Number.isSafeInteger(id) || id <= 0 || !title || !url
        || new URL(url).pathname !== '/mod/forum/discuss.php'
        || Number(new URL(url).searchParams.get('d')) !== id) continue;
      announcements.push({ id, title, author: text(row.querySelector('td.author .author-info > div:first-child')) || null,
        pinned: row.classList.contains('pinned'), url });
    }
    if (announcements.length === 0 && !root.querySelector('.forumnodiscuss')) return null;
    return { ...common, kind: 'forum', announcements };
  }
  if (request.kind === 'discussion') {
    const posts: MoodlePost[] = [];
    for (const article of Array.from(root.querySelectorAll('article[data-region="post"][data-post-id]')).slice(0, 200)) {
      const id = Number(article.getAttribute('data-post-id'));
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      function own(selector: string): Element | null {
        return Array.from(article.querySelectorAll(selector)).find((node) => node.closest('article') === article) ?? null;
      }
      const authorLink = Array.from(article.querySelectorAll('header a[href]')).find((node) => {
        if (node.closest('article') !== article) return false;
        try {
          const url = new URL(node.getAttribute('href')!, 'https://l.xmu.edu.my/');
          return url.origin === 'https://l.xmu.edu.my' && url.pathname === '/user/view.php'
            && /^[1-9]\d*$/.test(url.searchParams.get('id') ?? '');
        } catch { return false; }
      }) ?? null;
      const datetime = own('header time[datetime]')?.getAttribute('datetime');
      const timestamp = datetime && /^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(datetime) ? Date.parse(datetime) : NaN;
      const attachments = Array.from(article.querySelectorAll('a[href]')).filter((node) => node.closest('article') === article)
        .map((node) => file(node, 'mod_forum/attachment')).filter((item): item is MoodleFile => item !== null);
      const url = new URL(request.url); url.hash = `p${id}`;
      posts.push({ id, title: text(own('[data-region-content="forum-post-core-subject"]')),
        author: text(authorLink) || null, createdAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
        body: text(own(`#post-content-${id}`)), url: url.href, attachments });
    }
    return posts.length ? { ...common, kind: 'discussion', posts } : null;
  }
  if (request.kind === 'assign') {
    const table = root.querySelector('.submissionstatustable');
    if (!table) return null;
    const submission = table.querySelector('.submissionstatussubmitted') ? 'submitted'
      : table.querySelector('.submissionstatusdraft') ? 'draft'
      : table.querySelector('.submissionstatusreopened') ? 'reopened' : 'unknown';
    const grading = table.querySelector('.submissiongraded') ? 'graded'
      : table.querySelector('.submissionnotgraded') ? 'not-graded' : 'unknown';
    const rows = Array.from(table.querySelectorAll('tr')).slice(0, 50).map((row) => {
      const cells = row.querySelectorAll('th,td');
      return { label: text(cells[0] ?? null), value: text(cells[1] ?? null) };
    }).filter((row) => row.label || row.value);
    const activityDates = text(root.querySelector('.activity-dates')) || null;
    const seen = new Set<string>();
    const attachments: MoodleFile[] = [];
    const anchors = root.querySelectorAll(
      '[data-region="submission-attachment"] a[href*="/pluginfile.php/"], '
      + '.fileuploadsubmission a[href*="/pluginfile.php/"], '
      + '.submissionstatustable a[href*="/pluginfile.php/"]');
    for (const anchor of Array.from(anchors).slice(0, 50)) {
      const item = file(anchor, 'mod_assign');
      if (!item || seen.has(item.url)) continue;
      seen.add(item.url);
      attachments.push(item);
    }
    return { ...common, kind: 'assign', submission, grading, locked: !!table.querySelector('.submissionlocked'),
      rows, activityDates, attachments };
  }
  if (request.kind === 'folder') {
    const tree = root.querySelector('.foldertree');
    if (!tree) return null;
    const files = Array.from(tree.querySelectorAll('.fp-filename a[href]')).slice(0, 200)
      .map((node) => file(node, 'mod_folder/content')).filter((item): item is MoodleFile => item !== null);
    return { ...common, kind: 'folder', files };
  }
  return { ...common, kind: 'resource', file: (() => {
    // Campus 4.x no longer renders `.resourceworkaround`; the real entry is a pluginfile link
    // inside `#region-main` (verified on the campus site).
    const anchor = root.querySelector('.resourceworkaround a[href]')
      ?? root.querySelector('#region-main a[href*="/pluginfile.php/"]')
      ?? root.querySelector('[data-region="resource-content"] a[href*="/pluginfile.php/"]');
    return anchor ? file(anchor, 'mod_resource/content') : null;
  })() };
}

/** Only four non-secret file fields are read. Inaccessible or opaque headers stay unknown. */
export function projectMoodleFileHeaders(file: MoodleFile, headers: Pick<Headers, 'get'>): MoodleFile {
  const contentType = headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  const length = headers.get('Content-Length');
  const size = length && /^\d+$/.test(length) ? Number(length) : NaN;
  const modified = headers.get('Last-Modified');
  const time = modified ? Date.parse(modified) : NaN;
  const disposition = headers.get('Content-Disposition');
  let filename = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    ?? disposition?.match(/filename="([^"]+)"/i)?.[1] ?? disposition?.match(/filename=([^;]+)/i)?.[1];
  if (filename) { try { filename = decodeURIComponent(filename.trim()); } catch { filename = undefined; } }
  if (filename && /[\\/\x00-\x1f\x7f]/.test(filename)) filename = undefined;
  return { name: filename?.slice(0, 256) || file.name, url: file.url,
    mimeType: contentType && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(contentType) ? contentType : null,
    size: Number.isSafeInteger(size) && size >= 0 ? size : null,
    modifiedAt: Number.isFinite(time) ? new Date(time).toISOString() : null };
}

export function buildMoodleDetailReadScript(id: string, request: MoodleDetailRequest, userId: number): string | null {
  const url = safeMoodleReadUrl(request.url);
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(id) || !url || !Number.isSafeInteger(userId) || userId <= 0
    || !Number.isSafeInteger(request.courseId) || request.courseId <= 0
    || !Number.isSafeInteger(request.moduleId) || request.moduleId <= 0
    || !['forum', 'discussion', 'assign', 'folder', 'resource'].includes(request.kind)) return null;
  const path = new URL(url).pathname;
  if (request.kind === 'discussion' ? path !== '/mod/forum/discuss.php'
    : path !== `/mod/${request.kind}/view.php` || Number(new URL(url).searchParams.get('id')) !== request.moduleId) return null;
  return `(function(){
    var request=${JSON.stringify(request)}, done=false, timer, controller=new AbortController();
    var safeMoodleReadUrl=(${SAFE_MOODLE_URL_SOURCE});
    var extractMoodleDetail=(${EXTRACT_MOODLE_DETAIL_SOURCE});
    var projectMoodleFileHeaders=(${PROJECT_MOODLE_FILE_HEADERS_SOURCE});
    var inspectIdentity=(${IDENTITY_INSPECT_SOURCE});
    var expectedUser=${userId};
    function send(status,data){if(done)return;done=true;clearTimeout(timer);controller.abort();
      var message={kind:${JSON.stringify(DETAIL_KIND)},requestId:${JSON.stringify(id)},status:status};
      if(status==='success')message.data=data;window.ReactNativeWebView.postMessage(JSON.stringify(message));}
    function identity(){var result=inspectIdentity(document,window.location.origin,window.M&&window.M.cfg&&window.M.cfg.userId);
      return result.status==='confirmed'&&result.userId===expectedUser;}
    if(window.location.origin!=='https://l.xmu.edu.my'){send('wrong-origin');return;}
    if(!identity()){send('expired');return;}
    if(typeof window.fetch!=='function'){send('unavailable');return;}
    timer=setTimeout(function(){send('timeout');},10000);
    function read(url,method){return window.fetch(url,{method:method,mode:'same-origin',credentials:'same-origin',
      redirect:'manual',signal:controller.signal}).then(function(response){
        if(!identity()){send('expired');return null;}
        if(response.type==='opaqueredirect'||response.status>=300&&response.status<400){send('redirect-blocked');return null;}
        if(response.url&&response.url!==url){send('redirect-blocked');return null;}
        if(!response.ok){send(response.status===401?'expired':response.status===403?'denied':'unavailable');return null;}
        return response;});}
    read(request.url,'GET').then(function(response){if(!response||done)return null;return response.text();})
      .then(function(html){if(html==null||done)return null;
        if(!identity()){send('expired');return null;}
        if(html.length>2000000){send('invalid-data');return null;}
        var template=document.createElement('template');template.innerHTML=html;
        if(template.content.querySelector('input[type=password]')){send('expired');return null;}
        var data=extractMoodleDetail(request,template.content);
        if(!data){send('invalid-data');return null;}
        if(data.kind!=='resource'||!data.file){send('success',data);return null;}
        return read(data.file.url,'HEAD').then(function(head){if(!head||done)return;
          data.file=projectMoodleFileHeaders(data.file,head.headers);if(!identity())send('expired');else send('success',data);});
      }).catch(function(){if(!done)send('unavailable');});
  })();true;`;
}

/** Native messages are reprojected again; extra fields and raw headers cannot survive. */
export function parseMoodleDetailMessage(raw: string): MoodleDetailResult | null {
  if (typeof raw !== 'string' || raw.length > 2_000_000) return null;
  try {
    const message = JSON.parse(raw) as Record<string, unknown>;
    if (message?.kind !== DETAIL_KIND || typeof message.requestId !== 'string'
      || !/^[a-zA-Z0-9:_-]{1,80}$/.test(message.requestId)) return null;
    if (message.status !== 'success') {
      const failures: MoodleDetailFailure[] = ['expired', 'denied', 'unavailable', 'invalid-data', 'timeout', 'wrong-origin', 'redirect-blocked'];
      return failures.includes(message.status as MoodleDetailFailure)
        ? { requestId: message.requestId, status: message.status as MoodleDetailFailure } : null;
    }
    const data = projectMoodleDetail(message.data);
    return data ? { requestId: message.requestId, status: 'success', data } : null;
  } catch { return null; }
}

export function projectMoodleDetail(raw: unknown): MoodleDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const integer = (item: unknown): item is number => typeof item === 'number' && Number.isSafeInteger(item) && item > 0;
  const text = (item: unknown, length = 12000) => typeof item === 'string' ? item.slice(0, length) : '';
  const datetime = (item: unknown) => typeof item === 'string' && Number.isFinite(Date.parse(item))
    ? new Date(item).toISOString() : null;
  const url = safeMoodleReadUrl(value.url);
  if (!integer(value.courseId) || !integer(value.moduleId) || !url) return null;
  const common = { courseId: value.courseId, moduleId: value.moduleId, url, description: text(value.description) };
  function file(item: unknown): MoodleFile | null {
    if (!item || typeof item !== 'object') return null;
    const source = item as Record<string, unknown>, fileUrl = safeMoodleReadUrl(source.url, true);
    if (!fileUrl) return null;
    return { name: text(source.name, 256), url: fileUrl,
      mimeType: typeof source.mimeType === 'string' && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(source.mimeType)
        ? source.mimeType : null,
      size: typeof source.size === 'number' && Number.isSafeInteger(source.size) && source.size >= 0 ? source.size : null,
      modifiedAt: datetime(source.modifiedAt) };
  }
  const list = (item: unknown) => Array.isArray(item) ? item.slice(0, 200) as Record<string, unknown>[] : [];
  if (value.kind === 'forum') {
    const announcements = list(value.announcements).flatMap((row) => {
      if (!row || !integer(row.id)) return [];
      const rowUrl = safeMoodleReadUrl(row.url);
      return rowUrl && new URL(rowUrl).pathname === '/mod/forum/discuss.php'
        && Number(new URL(rowUrl).searchParams.get('d')) === row.id
        ? [{ id: row.id, title: text(row.title, 1000), author: text(row.author, 1000) || null, pinned: row.pinned === true, url: rowUrl }] : [];
    });
    return { ...common, kind: 'forum', announcements };
  }
  if (value.kind === 'discussion') {
    const posts = list(value.posts).flatMap((row) => {
      if (!row || !integer(row.id)) return [];
      const rowUrl = safeMoodleReadUrl(row.url);
      if (!rowUrl || new URL(rowUrl).pathname !== '/mod/forum/discuss.php'
        || new URL(rowUrl).hash !== `#p${row.id}`) return [];
      return [{ id: row.id, title: text(row.title, 1000), author: text(row.author, 1000) || null,
        createdAt: datetime(row.createdAt), body: text(row.body), url: rowUrl,
        attachments: list(row.attachments).map(file).filter((item): item is MoodleFile => item !== null) }];
    });
    return { ...common, kind: 'discussion', posts };
  }
  if (value.kind === 'assign') {
    const submission = value.submission === 'submitted' || value.submission === 'draft' || value.submission === 'reopened'
      ? value.submission : 'unknown';
    const grading = value.grading === 'graded' || value.grading === 'not-graded' ? value.grading : 'unknown';
    return { ...common, kind: 'assign', submission, grading, locked: value.locked === true,
      rows: list(value.rows).filter((row) => !!row).slice(0, 50).map((row) => ({ label: text(row.label), value: text(row.value) })),
      activityDates: text(value.activityDates, 1000) || null,
      attachments: list(value.attachments).map(file).filter((item): item is MoodleFile => item !== null) };
  }
  if (value.kind === 'folder') return { ...common, kind: 'folder', files: list(value.files).map(file).filter((item): item is MoodleFile => item !== null) };
  if (value.kind === 'resource') return { ...common, kind: 'resource', file: file(value.file) };
  return null;
}
