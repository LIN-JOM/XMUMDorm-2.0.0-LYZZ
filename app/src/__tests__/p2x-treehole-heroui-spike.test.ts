import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '..', '..');

function readAppFile(...segments: string[]): string {
  return fs.readFileSync(path.join(APP_ROOT, ...segments), 'utf8');
}

describe('P2X 树洞 HeroUI Native spike', () => {
  it('将 HeroUI 与最小构建链依赖锁入 App', () => {
    const pkg = JSON.parse(readAppFile('package.json')) as {
      dependencies?: Record<string, string>;
    };
    const dependencies = pkg.dependencies ?? {};

    expect(dependencies['heroui-native']).toBe('1.0.10');
    expect(dependencies.uniwind).toBe('1.12.0');
    expect(dependencies['react-native-gesture-handler']).toBeDefined();
  });

  it('在唯一安全区根内挂载 HeroUI 与手势根', () => {
    const layout = readAppFile('src', 'app', '_layout.tsx');

    expect(layout).toContain('HeroUINativeProvider');
    expect(layout).toContain('GestureHandlerRootView');
    expect(layout).toContain('<SafeAreaProvider>');
  });

  it('让 Metro 与全局 CSS 交给 Uniwind 和 HeroUI', () => {
    const metro = readAppFile('metro.config.js');
    const css = readAppFile('global.css');

    expect(metro).toContain('withUniwindConfig');
    expect(metro).toContain("cssEntryFile: './global.css'");
    expect(css).toContain("@import 'uniwind'");
    expect(css).toContain("@import 'heroui-native/styles'");
  });

  it('由树洞业务组件取代 Phase 1 tracer', () => {
    const screen = readAppFile('src', 'features', 'campus', 'CampusScreens.tsx');

    expect(screen).toContain('TreeholePost');
    expect(screen).toContain('useCampusActions');
    expect(screen).toContain('TreeholeCommentThread');
    expect(screen).toContain('TreeholeReport');
    expect(screen).not.toContain('TreeholeHeroUITracer');
  });

  it('将 HeroUI 亮暗语义色映射到 Campus token，且不把黄色情绪色当页面背景', () => {
    const css = readAppFile('global.css');

    expect(css).toContain('Campus semantic bridge');
    expect(css).toContain('--accent: #2452a6');
    expect(css).toContain('--treehole-action-accent: #ffc300');
    expect(css).toContain('@variant light');
    expect(css).toContain('@variant dark');
    expect(css).not.toContain('--background: #ffc300');
  });
});
