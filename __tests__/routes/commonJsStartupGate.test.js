const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const {
  checkCommonJsSource,
  checkRoutes,
} = require('../../scripts/check-commonjs-routes');

describe('CommonJS 路由启动门禁', () => {
  it('静态 ESM import 不能作为 CommonJS 路由通过解析', () => {
    const result = checkCommonJsSource("import { value } from '../shared/value.js';\nmodule.exports = value;", 'fixture-route.js');
    expect(result.status).not.toBe(0);
  });

  it('现有 routes/** 都能按 CommonJS 解析', () => {
    const failures = checkRoutes(path.join(ROOT, 'routes'));
    expect(failures).toEqual([]);
  });

  it('真实 server.js 能加载完整路由图而不监听端口', () => {
    const result = spawnSync(process.execPath, ['scripts/check-server-load.js'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
  });

  it('Node 22 CI 在后端路径变化时执行两个门禁和路由测试', () => {
    const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'app-rulers-and-tests.yml'), 'utf8');
    expect(workflow).toContain("- 'routes/**'");
    expect(workflow).toContain('backend-route-gate:');
    expect(workflow).toContain("node-version: '22'");
    expect(workflow).toContain('npm run check:routes-cjs');
    expect(workflow).toContain('npm run check:server-load');
    expect(workflow).toContain('npm test -- --runInBand __tests__/routes');
  });
});
