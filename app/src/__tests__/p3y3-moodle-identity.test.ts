import { JSDOM } from 'jsdom';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildMoodleIdentityProbeScript, parseMoodleIdentityMessage } from '@/features/tools/moodle/identity';
import { clearMoodleCache, confirmMoodleSchoolIdentity, closeMoodleCache, prepareMoodlePage,
  persistMoodleSnapshot, restoreMoodleSnapshot, settleMoodleStorage, selectMoodleCourses,
  writeMoodleCache, readMoodleCache, moodleCacheGeneration } from '@/features/tools/moodle/cache';

const mockDisk = new Map<string, string>();
let mockWriteGate: Promise<void> | null = null;
let mockReadGate: Promise<void> | null = null;
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {
  getItem: jest.fn(async (key: string) => { if (mockReadGate) await mockReadGate; return mockDisk.get(key) ?? null; }),
  setItem: jest.fn(async (key: string, value: string) => { if (mockWriteGate) await mockWriteGate; mockDisk.set(key, value); }),
  getAllKeys: jest.fn(async () => [...mockDisk.keys()]),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((key) => mockDisk.delete(key)); }),
} }));

async function probe(html: string, userId: unknown) {
  const dom = new JSDOM(html, { url: 'https://l.xmu.edu.my/my/', runScripts: 'outside-only' });
  const messages: string[] = [];
  Object.assign(dom.window, { M: { cfg: { userId, sesskey: 'never-forward' } },
    ReactNativeWebView: { postMessage: (value: string) => messages.push(value) } });
  dom.window.eval(buildMoodleIdentityProbeScript('identity:1')!);
  dom.window.close();
  return { result: parseMoodleIdentityMessage(messages[0]), raw: messages[0] };
}
const menu = '<div data-region="usermenu"><div class="usermenu"><button id="user-menu-toggle">User</button></div></div>';
function populate() {
  selectMoodleCourses([1]);
  writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course', visible: true }], nextOffset: 0 }, moodleCacheGeneration());
}

beforeEach(async () => {
  mockWriteGate = null; mockReadGate = null;
  clearMoodleCache(); await settleMoodleStorage(); mockDisk.clear();
});

describe('p3y3 school identity and local snapshot', () => {
  it('reads only M.cfg.userId plus the authenticated official menu', async () => {
    const { result, raw } = await probe(menu, 123);
    expect(result).toEqual({ requestId: 'identity:1', status: 'confirmed', userId: 123 });
    expect(raw).not.toMatch(/sesskey|never-forward|cfg/);
    expect((await probe(menu, '123')).result?.status).toBe('unknown');
    expect((await probe('<div class="usermenu"><div class="login">Guest</div></div>', 1)).result?.status).toBe('expired');
    expect((await probe(menu + '<input type="password" value="private">', 123)).result?.status).toBe('expired');
  });
  it('restores only after the current probe matches the stored school identity', async () => {
    confirmMoodleSchoolIdentity(123); populate();
    expect(await persistMoodleSnapshot()).toBe(true);
    expect(closeMoodleCache(true)).toBe(true);
    await settleMoodleStorage();
    expect(readMoodleCache().courses).toEqual([]);
    expect(await restoreMoodleSnapshot()).toBe(false);
    expect(confirmMoodleSchoolIdentity(123)).toBe(true);
    expect(await restoreMoodleSnapshot()).toBe(true);
    expect(readMoodleCache().courses.map((item) => item.id)).toEqual([1]);
    expect([...mockDisk.keys()][0]).toContain('l.xmu.edu.my:123');
    confirmMoodleSchoolIdentity(124);
    expect(await restoreMoodleSnapshot()).toBe(false);
    expect(readMoodleCache().courses).toEqual([]);
  });
  it('retains the default close clear and never saves an unconfirmed school account', async () => {
    populate(); expect(await persistMoodleSnapshot()).toBe(false);
    expect(closeMoodleCache(true)).toBe(false);
    confirmMoodleSchoolIdentity(123); populate(); await persistMoodleSnapshot();
    closeMoodleCache(false); await settleMoodleStorage();
    expect(mockDisk.size).toBe(0);
    prepareMoodlePage(); expect(await restoreMoodleSnapshot()).toBe(false);
  });
  it('orders clear after an in-flight write so private data cannot reappear', async () => {
    confirmMoodleSchoolIdentity(123); populate();
    let release!: () => void;
    mockWriteGate = new Promise<void>((resolve) => { release = resolve; });
    const save = persistMoodleSnapshot();
    for (let count = 0; count < 4; count++) await Promise.resolve();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    clearMoodleCache(); release();
    await save; await settleMoodleStorage();
    expect(mockDisk.size).toBe(0);
    expect(readMoodleCache().courses).toEqual([]);
  });
  it('rejects a delayed restore after clear', async () => {
    confirmMoodleSchoolIdentity(123); populate(); await persistMoodleSnapshot();
    prepareMoodlePage(); confirmMoodleSchoolIdentity(123);
    let release!: () => void;
    mockReadGate = new Promise<void>((resolve) => { release = resolve; });
    const restore = restoreMoodleSnapshot();
    for (let count = 0; count < 4; count++) await Promise.resolve();
    clearMoodleCache(); release();
    expect(await restore).toBe(false);
    await settleMoodleStorage();
    expect(readMoodleCache().courses).toEqual([]);
  });
});
