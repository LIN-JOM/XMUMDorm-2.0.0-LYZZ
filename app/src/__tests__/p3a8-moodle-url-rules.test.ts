/**
 * P3A8 · 同源 URL 两份实现的一致性守卫（审计 P-12 / D-12）
 *
 * `contract.ts` 的投影 `safeUrl` 与 `detail.ts` 的只读 `safeMoodleReadUrl` 都必须自包含
 * （会被 toString() 注入 WebView，见 T12 说明），因此不能合并成一份。
 * 这里用表驱动把两者的共同底线钉住：外域/带凭据一律拒绝；只读侧接受的 URL，投影侧必须也能接受。
 */
import { parseMoodleResponse } from '@/features/tools/moodle/contract';
import { safeMoodleReadUrl } from '@/features/tools/moodle/detail';

const projectCourseUrl = (url: string): string | null => {
  const projected = parseMoodleResponse('courses', {
    courses: [{ id: 42, fullname: 'Course', visible: true, viewurl: url }],
    nextoffset: 0,
  });
  return projected?.courses[0].url ?? null;
};

it.each([
  'https://outside.example/course/view.php?id=42',
  'https://user:pass@l.xmu.edu.my/course/view.php?id=42',
])('p3a8 both url rules reject %s', (url) => {
  expect(projectCourseUrl(url)).toBeNull();
  expect(safeMoodleReadUrl(url)).toBeNull();
});

it('p3a8 strips credentials from the projected course url', () => {
  expect(projectCourseUrl('https://l.xmu.edu.my/course/view.php?id=42&sesskey=secret'))
    .toBe('https://l.xmu.edu.my/course/view.php?id=42');
  expect(safeMoodleReadUrl('https://l.xmu.edu.my/course/view.php?id=42&sesskey=secret')).toBeNull();
});

it('p3a8 every module url accepted by detail can also be projected by the course whitelist', () => {
  const readUrls = [
    'https://l.xmu.edu.my/mod/assign/view.php?id=100',
    'https://l.xmu.edu.my/mod/forum/view.php?id=101',
    'https://l.xmu.edu.my/mod/folder/view.php?id=106',
  ];
  for (const url of readUrls) {
    expect(safeMoodleReadUrl(url)).toBe(url);
    expect(projectCourseUrl(url)).not.toBeNull();
  }
  // 语义差异：课程首页可以出现在投影里，但不是详情读取目标。
  expect(projectCourseUrl('https://l.xmu.edu.my/course/view.php?id=42')).not.toBeNull();
  expect(safeMoodleReadUrl('https://l.xmu.edu.my/course/view.php?id=42')).toBeNull();
});

it('p3a8 both url rules keep the same origin-only floor for plugin files', () => {
  const file = 'https://l.xmu.edu.my/pluginfile.php/9/mod_resource/content/1/notes.pdf';
  expect(safeMoodleReadUrl(file, true)).toBe(file);
  expect(projectCourseUrl(file)).not.toBeNull();
  expect(safeMoodleReadUrl('https://outside.example/pluginfile.php/9/x', true)).toBeNull();
});
