/**
 * Injected WebView sources for Moodle detail reads.
 *
 * ⚠️ These MUST stay literal strings. Hermes turns any function passed through
 * `Function.prototype.toString()` into `"[bytecode]"`, so runtime stringification of real
 * functions silently breaks injection on device (verified on Android 15 dev build).
 *
 * The TypeScript implementations in `detail.ts` remain the native/test reference; the
 * `p3y3-moodle-detail` consistency test runs both on the same fixtures to catch drift.
 */

export const SAFE_MOODLE_URL_SOURCE = `function safeMoodleReadUrl(value, file) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    var url = new URL(value, 'https://l.xmu.edu.my/');
    if (url.origin !== 'https://l.xmu.edu.my' || url.username || url.password) return null;
    var parameters = Array.from(url.searchParams.keys());
    if (new Set(parameters).size !== parameters.length) return null;
    if (file) {
      if (!/^\\/pluginfile\\.php\\/\\d+\\/mod_(resource|folder|forum|assign)\\/(content|attachment|post|submission_files)\\/\\d+\\/.+/.test(url.pathname)
        || url.hash || parameters.some(function (key) { return key !== 'forcedownload'; })
        || (url.searchParams.has('forcedownload') && !/^[01]$/.test(url.searchParams.get('forcedownload')))) return null;
      var parts = url.pathname.split('/').slice(1);
      var component = parts[2], area = parts[3];
      var allowed = component === 'mod_forum' ? (area === 'attachment' || area === 'post')
        : component === 'mod_assign' ? area === 'submission_files'
          : area === 'content';
      if (!allowed) return null;
      for (var i = 0; i < parts.length; i++) {
        var decoded = decodeURIComponent(parts[i]);
        if (!decoded || decoded === '.' || decoded === '..' || /[\\\\/\\x00-\\x1f\\x7f]/.test(decoded)) return null;
      }
    } else if (/^\\/mod\\/(forum|assign|folder|resource|page|url|choice|quiz)\\/view\\.php$/.test(url.pathname)) {
      var allowedKeys = url.pathname === '/mod/forum/view.php' ? ['id', 'p'] : ['id'];
      if (url.hash || parameters.some(function (key) { return allowedKeys.indexOf(key) < 0; })
        || !/^[1-9]\\d*$/.test(url.searchParams.get('id') || '')
        || (url.searchParams.has('p') && !/^\\d+$/.test(url.searchParams.get('p')))) return null;
    } else if (url.pathname === '/mod/forum/discuss.php') {
      if (parameters.some(function (key) { return key !== 'd' && key !== 'parent'; })
        || !/^[1-9]\\d*$/.test(url.searchParams.get('d') || '')
        || (url.searchParams.has('parent') && !/^[1-9]\\d*$/.test(url.searchParams.get('parent')))
        || (url.hash && !/^#p[1-9]\\d*$/.test(url.hash))) return null;
    } else return null;
    return url.href;
  } catch (error) { return null; }
}`;

export const EXTRACT_MOODLE_DETAIL_SOURCE = `function extractMoodleDetail(request, root) {
  function text(node) {
    if (!node) return '';
    var copy = node.cloneNode(true);
    copy.querySelectorAll('script,style,form,input,textarea,select,iframe,object,embed').forEach(function (child) { child.remove(); });
    return (copy.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 12000);
  }
  function link(node, file) {
    return safeMoodleReadUrl(node ? node.getAttribute('href') : null, file === true);
  }
  function file(node, component) {
    var url = link(node, true);
    if (!url || new URL(url).pathname.indexOf('/' + component + '/') < 0) return null;
    var name = text(node) || decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return { name: name.slice(0, 256), url: url, mimeType: null, size: null, modifiedAt: null };
  }
  var common = { courseId: request.courseId, moduleId: request.moduleId, url: request.url,
    description: text(root.querySelector('#intro.activity-description')) };
  if (request.kind === 'forum') {
    var announcements = [];
    var rows = Array.from(root.querySelectorAll('[data-region="discussion-list-item"][data-discussionid]')).slice(0, 200);
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var id = Number(row.getAttribute('data-discussionid'));
      var anchor = row.querySelector('th.topic a[href]');
      var url = link(anchor);
      var title = (anchor && anchor.getAttribute('title') ? anchor.getAttribute('title') : text(anchor)).trim().slice(0, 1000);
      if (!Number.isSafeInteger(id) || id <= 0 || !title || !url
        || new URL(url).pathname !== '/mod/forum/discuss.php'
        || Number(new URL(url).searchParams.get('d')) !== id) continue;
      announcements.push({ id: id, title: title,
        author: text(row.querySelector('td.author .author-info > div:first-child')) || null,
        pinned: row.classList.contains('pinned'), url: url });
    }
    if (announcements.length === 0 && !root.querySelector('.forumnodiscuss')) return null;
    return Object.assign({}, common, { kind: 'forum', announcements: announcements });
  }
  if (request.kind === 'discussion') {
    var posts = [];
    var articles = Array.from(root.querySelectorAll('article[data-region="post"][data-post-id]')).slice(0, 200);
    for (var a = 0; a < articles.length; a++) {
      var article = articles[a];
      var pid = Number(article.getAttribute('data-post-id'));
      if (!Number.isSafeInteger(pid) || pid <= 0) continue;
      var own = function (selector) {
        return Array.from(article.querySelectorAll(selector)).find(function (node) { return node.closest('article') === article; }) || null;
      };
      var authorLink = Array.from(article.querySelectorAll('header a[href]')).find(function (node) {
        if (node.closest('article') !== article) return false;
        try {
          var candidate = new URL(node.getAttribute('href'), 'https://l.xmu.edu.my/');
          return candidate.origin === 'https://l.xmu.edu.my' && candidate.pathname === '/user/view.php'
            && /^[1-9]\\d*$/.test(candidate.searchParams.get('id') || '');
        } catch (error) { return false; }
      }) || null;
      var datetimeNode = own('header time[datetime]');
      var datetime = datetimeNode ? datetimeNode.getAttribute('datetime') : null;
      var timestamp = datetime && /^\\d{4}-\\d\\d-\\d\\dT.+(?:Z|[+-]\\d\\d:\\d\\d)$/.test(datetime) ? Date.parse(datetime) : NaN;
      var attachments = Array.from(article.querySelectorAll('a[href]'))
        .filter(function (node) { return node.closest('article') === article; })
        .map(function (node) { return file(node, 'mod_forum/attachment'); })
        .filter(function (item) { return item !== null; });
      var postUrl = new URL(request.url); postUrl.hash = 'p' + pid;
      posts.push({ id: pid, title: text(own('[data-region-content="forum-post-core-subject"]')),
        author: text(authorLink) || null,
        createdAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
        body: text(own('#post-content-' + pid)), url: postUrl.href, attachments: attachments });
    }
    return posts.length ? Object.assign({}, common, { kind: 'discussion', posts: posts }) : null;
  }
  if (request.kind === 'assign') {
    var table = root.querySelector('.submissionstatustable');
    if (!table) return null;
    var submission = table.querySelector('.submissionstatussubmitted') ? 'submitted'
      : table.querySelector('.submissionstatusdraft') ? 'draft'
        : table.querySelector('.submissionstatusreopened') ? 'reopened' : 'unknown';
    var grading = table.querySelector('.submissiongraded') ? 'graded'
      : table.querySelector('.submissionnotgraded') ? 'not-graded' : 'unknown';
    var levelRows = Array.from(table.querySelectorAll('tr')).slice(0, 50).map(function (row) {
      var cells = row.querySelectorAll('th,td');
      return { label: text(cells[0] || null), value: text(cells[1] || null) };
    }).filter(function (row) { return row.label || row.value; });
    var activityDates = text(root.querySelector('.activity-dates')) || null;
    var seen = new Set();
    var submissionFiles = [];
    var anchors = root.querySelectorAll('[data-region="submission-attachment"] a[href*="/pluginfile.php/"], '
      + '.fileuploadsubmission a[href*="/pluginfile.php/"], '
      + '.submissionstatustable a[href*="/pluginfile.php/"]');
    var anchorList = Array.from(anchors).slice(0, 50);
    for (var s = 0; s < anchorList.length; s++) {
      var item = file(anchorList[s], 'mod_assign');
      if (!item || seen.has(item.url)) continue;
      seen.add(item.url);
      submissionFiles.push(item);
    }
    return Object.assign({}, common, { kind: 'assign', submission: submission, grading: grading,
      locked: !!table.querySelector('.submissionlocked'), rows: levelRows,
      activityDates: activityDates, attachments: submissionFiles });
  }
  if (request.kind === 'folder') {
    var tree = root.querySelector('.foldertree');
    if (!tree) return null;
    var folderFiles = Array.from(tree.querySelectorAll('a[href*="/pluginfile.php/"]')).slice(0, 200)
      .map(function (node) { return file(node, 'mod_folder/content'); })
      .filter(function (item) { return item !== null; });
    return Object.assign({}, common, { kind: 'folder', files: folderFiles });
  }
  var anchorNode = root.querySelector('.resourceworkaround a[href]')
    || root.querySelector('#region-main a[href*="/pluginfile.php/"]')
    || root.querySelector('[data-region="resource-content"] a[href*="/pluginfile.php/"]');
  return Object.assign({}, common, { kind: 'resource',
    file: anchorNode ? file(anchorNode, 'mod_resource/content') : null });
}`;

export const PROJECT_MOODLE_FILE_HEADERS_SOURCE = `function projectMoodleFileHeaders(file, headers) {
  var contentType = (headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() || undefined;
  var length = headers.get('Content-Length');
  var size = length && /^\\d+$/.test(length) ? Number(length) : NaN;
  var modified = headers.get('Last-Modified');
  var time = modified ? Date.parse(modified) : NaN;
  var disposition = headers.get('Content-Disposition');
  var filenameMatch = disposition && (
    /filename\\*=UTF-8''([^;]+)/i.exec(disposition)
    || /filename="([^"]+)"/i.exec(disposition)
    || /filename=([^;]+)/i.exec(disposition));
  var filename = filenameMatch ? filenameMatch[1] : undefined;
  if (filename) { try { filename = decodeURIComponent(filename.trim()); } catch (error) { filename = undefined; } }
  if (filename && /[\\\\/\\x00-\\x1f\\x7f]/.test(filename)) filename = undefined;
  return { name: (filename ? filename.slice(0, 256) : '') || file.name, url: file.url,
    mimeType: contentType && /^[a-z0-9!#$&^_.+-]+\\/[a-z0-9!#$&^_.+-]+$/.test(contentType) ? contentType : null,
    size: Number.isSafeInteger(size) && size >= 0 ? size : null,
    modifiedAt: Number.isFinite(time) ? new Date(time).toISOString() : null };
}`;
