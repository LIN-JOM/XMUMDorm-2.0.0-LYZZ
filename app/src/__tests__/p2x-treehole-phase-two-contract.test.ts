import * as fs from 'fs';
import * as path from 'path';

const appRoot = path.resolve(__dirname, '..', '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(appRoot, ...segments), 'utf8');

describe('P2X Treehole Phase 2 contract', () => {
  it('列表和详情经同一帖子业务组件接入', () => {
    const screen = read('src', 'features', 'campus', 'CampusScreens.tsx');
    expect(screen).toContain("import {TreeholePost} from './TreeholePost'");
    expect(screen).toContain('variant="feed"');
    expect(screen).toContain('variant="detail"');
  });

  it('列表多图是静态模式，详情才允许控制器', () => {
    const media = read('src', 'features', 'campus', 'TreeholeMedia.tsx');
    expect(media).toContain("if (mode === 'feed')");
    expect(media).toContain('treehole-media-next');
    expect(media).toContain('PanResponder');
    expect(media).toContain('theme.reduceMotion');
    expect(media).toContain('Dialog.Portal');
  });

  it('万能墙继续走匿名模板，不接入树洞帖子', () => {
    const screen = read('src', 'features', 'campus', 'CampusScreens.tsx');
    expect(screen).toContain("kind==='wall'?<ListItem");
    expect(screen).toContain('WallTemplateContent');
  });
});
