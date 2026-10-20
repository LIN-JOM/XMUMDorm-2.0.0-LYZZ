import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { buildMoodleDetailReadScript, parseMoodleDetailMessage, authorizeMoodleDetail,
  extractMoodleDetail, projectMoodleFileHeaders, safeMoodleReadUrl,
  type MoodleDetailRequest } from '@/features/tools/moodle/detail';
import { EXTRACT_MOODLE_DETAIL_SOURCE, PROJECT_MOODLE_FILE_HEADERS_SOURCE,
  SAFE_MOODLE_URL_SOURCE } from '@/features/tools/moodle/injected-sources';
import { clearMoodleCache, moodleCacheGeneration, selectMoodleCourses, writeMoodleCache } from '@/features/tools/moodle/cache';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures/moodle/details', `${name}.html`), 'utf8');
const request = (kind: MoodleDetailRequest['kind']): MoodleDetailRequest => ({ kind, courseId: 1, moduleId: 101,
  url: kind === 'discussion' ? 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71'
    : `https://l.xmu.edu.my/mod/${kind}/view.php?id=101` });

async function run(kind: MoodleDetailRequest['kind'], options: { redirect?: boolean; changedIdentity?: boolean; fixtureName?: string } = {}) {
  const dom = new JSDOM(fixture('forum'), { url: 'https://l.xmu.edu.my/my/', runScripts: 'outside-only' });
  const messages: string[] = [];
  const win = dom.window;
  Object.assign(win, { M: { cfg: { userId: 123, sesskey: 'never-forward' } },
    ReactNativeWebView: { postMessage: (data: string) => messages.push(data) } });
  const fetch = jest.fn(async (_url: string, init: { method: string }) => {
    if (options.changedIdentity) (win as unknown as { M: { cfg: { userId: number } } }).M.cfg.userId = 124;
    return { type: options.redirect ? 'opaqueredirect' : 'basic', status: options.redirect ? 0 : 200,
      ok: !options.redirect, url: _url, text: async () => fixture(options.fixtureName ?? kind),
      headers: new Headers({ 'Content-Type': 'application/pdf; charset=UTF-8', 'Content-Length': '321',
        'Last-Modified': 'Sat, 10 Oct 2026 01:00:00 GMT', 'Content-Disposition': 'attachment; filename="notes.pdf"',
        'Set-Cookie': 'secret', ETag: 'private-hash', Location: 'https://outside.example/private' }) };
  });
  Object.assign(win, { fetch });
  win.eval(buildMoodleDetailReadScript('detail:1', request(kind), 123)!);
  for (let iteration = 0; iteration < 20 && messages.length === 0; iteration++) await Promise.resolve();
  const result = parseMoodleDetailMessage(messages[0] ?? '');
  dom.window.close();
  return { result, fetch, raw: messages[0] };
}

beforeEach(() => clearMoodleCache());

describe('p3y3 official-derived synthetic detail DOM and generated page command', () => {
  it('reads only forum topic rows, excluding write links and private content', async () => {
    const { result, raw, fetch } = await run('forum');
    expect(result).toMatchObject({ status: 'success', data: { kind: 'forum',
      announcements: [{ id: 71, title: 'Full announcement', author: 'Dr One', pinned: true }] } });
    expect(raw).not.toMatch(/sesskey|never-forward|privateValue|subscribe.php/);
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', mode: 'same-origin',
      credentials: 'same-origin', redirect: 'manual' });
  });
  it('isolates each discussion post subject author date body and attachment', async () => {
    const { result } = await run('discussion');
    expect(result).toMatchObject({ status: 'success', data: { posts: [
      { id: 81, title: 'Main announcement', author: 'Dr One', body: 'Read the brief carefully.',
        createdAt: '2026-10-10T01:00:00.000Z', attachments: [{ name: 'brief.pdf' }] },
      { id: 82, title: 'Reply', author: 'Student Two', body: 'Reply body.' },
    ] } });
  });
  it('reads machine assignment status without guessing localized dates', async () => {
    const { result } = await run('assign');
    expect(result).toMatchObject({ status: 'success', data: { description: 'Submit a written report.',
      submission: 'submitted', grading: 'not-graded', rows: expect.any(Array) } });
    expect(result).not.toHaveProperty('data.deadline');
  });
  it('reads the campus assign activity dates and submission attachments', async () => {
    const { result } = await run('assign', { fixtureName: 'assign-real' });
    expect(result).toMatchObject({ status: 'success', data: { kind: 'assign',
      submission: 'submitted', grading: 'not-graded',
      activityDates: expect.stringContaining('Due: Sunday, 28 December 2025'),
      attachments: [{ name: 'hw.pdf',
        url: 'https://l.xmu.edu.my/pluginfile.php/9/mod_assign/submission_files/100/hw.pdf' }] } });
  });
  it('finds the campus 4.x resource link outside the legacy resourceworkaround wrapper', async () => {
    const { result, fetch } = await run('resource', { fixtureName: 'resource-real' });
    expect(fetch.mock.calls.map((call) => call[1].method)).toEqual(['GET', 'HEAD']);
    expect(result).toMatchObject({ status: 'success', data: { kind: 'resource',
      file: { name: 'notes.pdf', mimeType: 'application/pdf' } } });
  });
  it('reads folder file links without directory or archive actions', async () => {
    const { result } = await run('folder');
    expect(result).toMatchObject({ status: 'success', data: { files: [{ name: 'brief.pdf' }] } });
    if (result?.status === 'success' && result.data.kind === 'folder') expect(result.data.files).toHaveLength(1);
  });
  it('HEADs only a discovered resource and projects the header whitelist', async () => {
    const { result, fetch, raw } = await run('resource');
    expect(fetch.mock.calls.map((call) => call[1].method)).toEqual(['GET', 'HEAD']);
    expect(result).toMatchObject({ status: 'success', data: { file: { name: 'notes.pdf',
      mimeType: 'application/pdf', size: 321, modifiedAt: '2026-10-10T01:00:00.000Z' } } });
    expect(raw).not.toMatch(/Set-Cookie|private-hash|Location|headers/);
  });
  it('blocks redirects and account changes without forwarding their responses', async () => {
    expect((await run('forum', { redirect: true })).result).toMatchObject({ status: 'redirect-blocked' });
    expect((await run('forum', { changedIdentity: true })).result).toMatchObject({ status: 'expired' });
    expect(buildMoodleDetailReadScript('detail:1', { ...request('assign'),
      url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101&action=submit' }, 123)).toBeNull();
  });
  it('requires a selected visible module matching native course type id and exact URL', () => {
    selectMoodleCourses([1]);
    const generation = moodleCacheGeneration();
    writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course', visible: true }], nextOffset: 0 }, generation);
    writeMoodleCache('state', { courseId: 1, sections: [{ id: 1, number: 0, title: 'General', moduleIds: [101] }], modules: [{ id: 101, sectionId: 1,
      type: 'assign', name: 'Homework', url: request('assign').url, visible: true, userVisible: true, accessVisible: true }] }, generation);
    expect(authorizeMoodleDetail(request('assign'))).toBe(true);
    expect(authorizeMoodleDetail({ ...request('assign'), courseId: 2 })).toBe(false);
    expect(authorizeMoodleDetail(request('forum'))).toBe(false);
    expect(authorizeMoodleDetail({ ...request('assign'), moduleId: 102 })).toBe(false);
    expect(authorizeMoodleDetail({ ...request('assign'), url: 'https://l.xmu.edu.my/mod/assign/view.php?id=102' })).toBe(false);
    expect(authorizeMoodleDetail(request('discussion'))).toBe(false);
  });
});

describe('injected literal sources match the native reference implementations', () => {
  const evaluate = <T,>(source: string, dependencies: Record<string, unknown> = {}): T => {
    const names = Object.keys(dependencies);
    const values = names.map((name) => dependencies[name]);
    return new Function(...names, `return (${source});`)(...values) as T;
  };
  const literalSafe = evaluate<typeof safeMoodleReadUrl>(SAFE_MOODLE_URL_SOURCE);
  const literalExtract = evaluate<typeof extractMoodleDetail>(EXTRACT_MOODLE_DETAIL_SOURCE,
    { safeMoodleReadUrl: literalSafe });
  const literalHeaders = evaluate<typeof projectMoodleFileHeaders>(PROJECT_MOODLE_FILE_HEADERS_SOURCE);

  const urls = [
    'https://l.xmu.edu.my/mod/assign/view.php?id=101',
    'https://l.xmu.edu.my/mod/assign/view.php?id=101&action=submit',
    'https://l.xmu.edu.my/mod/forum/discuss.php?d=71',
    'https://l.xmu.edu.my/mod/forum/discuss.php?d=71#p81',
    'https://l.xmu.edu.my/course/view.php?id=42',
    'https://outside.example/mod/assign/view.php?id=1',
    'https://l.xmu.edu.my/pluginfile.php/9/mod_assign/submission_files/100/hw.pdf',
    'https://l.xmu.edu.my/pluginfile.php/9/mod_resource/content/1/notes.pdf',
    'https://l.xmu.edu.my/pluginfile.php/9/mod_folder/content/1/notes.pdf',
  ] as const;

  it('keeps the read-only URL whitelist byte-identical for pages and files', () => {
    for (const url of urls) {
      expect(literalSafe(url)).toBe(safeMoodleReadUrl(url));
      expect(literalSafe(url, true)).toBe(safeMoodleReadUrl(url, true));
    }
  });

  it('extracts identical details from the four synthetic fixture kinds', () => {
    for (const kind of ['forum', 'discussion', 'assign', 'folder', 'resource'] as const) {
      const dom = new JSDOM(`<body>${fixture(kind)}</body>`);
      const root = dom.window.document;
      expect(literalExtract(request(kind), root)).toEqual(extractMoodleDetail(request(kind), root));
      dom.window.close();
    }
  });

  it('projects identical file headers', () => {
    const file = { name: 'notes.pdf', url: 'https://l.xmu.edu.my/pluginfile.php/9/mod_resource/content/1/notes.pdf',
      mimeType: null, size: null, modifiedAt: null };
    const headers = new Headers({ 'Content-Type': 'application/pdf; charset=UTF-8', 'Content-Length': '321',
      'Last-Modified': 'Sat, 10 Oct 2026 01:00:00 GMT', 'Content-Disposition': 'attachment; filename="notes.pdf"' });
    expect(literalHeaders(file, headers)).toEqual(projectMoodleFileHeaders(file, headers));
  });
});
