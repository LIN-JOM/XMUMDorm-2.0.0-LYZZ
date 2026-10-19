/**
 * P3A8 · 注册表与注入脚本说明（审计 P-12 / D-12）
 *
 * P18 内嵌网页容器已由 P0-08/P1-14 实现，组件文档不得再标「建议·待评审」。
 * 注入 WebView 的函数必须自包含，所以域名与 URL 白名单字面量只能内联——代码里要有这句说明。
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '..');
const DOC = path.resolve(APP_ROOT, '..', '..', 'docs', 'app', 'design', 'App组件类型定义.md');

it('p3a8 P18 is registered as implemented, not as a pending proposal', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  expect(doc).not.toContain('P18 内嵌网页容器【建议·待评审】');
  expect(doc).toContain('P18 内嵌网页容器【已实现】');
  expect(doc).not.toMatch(/\|\s*1\s*\|\s*\*\*`P18 内嵌网页容器` 是否批准为第 18 个原型\*\*/);
});

it.each([
  ['contract.ts'],
  ['detail.ts'],
  ['identity.ts'],
])('p3a8 %s explains why injected literals stay inline', (file) => {
  const source = fs.readFileSync(path.join(APP_ROOT, 'features', 'tools', 'moodle', file), 'utf8');
  expect(source).toContain('注入');
  expect(source).toMatch(/自包含|字面量/);
});
