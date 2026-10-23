const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('资料预览模式只切换固定 GET 接口，并阻止资料写入口', () => {
  const api = read('shared/api/materials.js');
  const routes = read('frontend/src/routes/layoutRoutes.jsx');
  const card = read('frontend/src/components/materials/MaterialCard.jsx');

  expect(api).toContain("'/api/preview/materials'");
  expect(api).toContain("'/api/preview/materials/courses'");
  expect(api).toContain('new URL(path, window.location.origin)');
  expect(routes).toContain('isMaterialsPreviewMode ? <Navigate to="/materials" replace />');
  expect(card).toContain('if (!isMaterialsPreviewMode) return countDownload(item.path).catch(() => {});');
});
