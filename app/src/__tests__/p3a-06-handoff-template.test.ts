import * as fs from 'fs';
import * as path from 'path';

const TEMPLATE = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'docs',
  'app',
  'task',
  'phase-3',
  '甲-Phase0',
  '乙丙集成交付单模板.md'
);

describe('P3A-06 乙丙集成交付单模板', () => {
  it('要求屏幕、路由、词条、测试、后端回滚和公共层变更申请', () => {
    const template = fs.readFileSync(TEMPLATE, 'utf8');
    for (const heading of ['屏幕导出', '路由清单', '词条清单', '测试证据', '后端、迁移与回滚', '公共层变更申请']) {
      expect(template).toContain(`## ${heading}`);
    }
  });

  it('将发布能力交给域描述符和甲的注册表，而非让域直接改公共宿主', () => {
    const template = fs.readFileSync(TEMPLATE, 'utf8');
    expect(template).toContain('publishFields.ts');
    expect(template).toContain('PUBLISH_DESCRIPTORS');
    expect(template).toContain('KNOWN_MISSING_DESCRIPTORS');
  });

  it('列出可执行的甲方验收与拒收条件', () => {
    const template = fs.readFileSync(TEMPLATE, 'utf8');
    expect(template).toContain('## 甲方验收');
    expect(template).toContain('## 拒收条件');
    expect(template).toContain('不得直接修改');
  });
});
