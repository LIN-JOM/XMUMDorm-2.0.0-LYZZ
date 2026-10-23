import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildMoodleReadScript } from '@/features/tools/moodle/bridge';
import { buildMoodleDetailReadScript } from '@/features/tools/moodle/detail';
import { buildMoodleIdentityProbeScript } from '@/features/tools/moodle/identity';

/**
 * Hermes 下 `Function.prototype.toString()` 返回 `"[bytecode]"`（Android 15 dev build 实测），
 * 因此任何把「函数源码」拼进 WebView 注入脚本的写法都会在真机失效，而 Node/Jest 看不出来。
 * 本用例把「注入源码不得来自 toString」钉死；以后新增注入点必须先写成字面量。
 */
const root = join(__dirname, '../features/tools');
const sources = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  if (statSync(full).isDirectory()) return sources(full);
  return /\.(ts|tsx)$/.test(name) ? [full] : [];
});
const stripComments = (source: string): string => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('p3a8 WebView injection guard (Hermes toString)', () => {
  it('never builds injected scripts from Function.prototype.toString', () => {
    const offenders = sources(root).filter((file) => /\.toString\(\)/.test(stripComments(readFileSync(file, 'utf8'))));
    expect(offenders).toEqual([]);
  });

  it('keeps every generated script literal and bytecode-free', () => {
    const scripts = [
      buildMoodleIdentityProbeScript('identity:1')!,
      buildMoodleReadScript('read:1', { method: 'courses' }, 123)!,
      buildMoodleDetailReadScript('detail:1', { kind: 'assign', courseId: 1, moduleId: 101,
        url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101' }, 123)!,
    ];
    for (const script of scripts) {
      expect(script).not.toContain('[bytecode]');
      expect(script).not.toContain('.toString()');
      expect(script).toContain('function');
    }
    expect(scripts[2]).toContain('function extractMoodleDetail');
    expect(scripts[2]).toContain('#usernavigation [data-userid]');
  });
});
