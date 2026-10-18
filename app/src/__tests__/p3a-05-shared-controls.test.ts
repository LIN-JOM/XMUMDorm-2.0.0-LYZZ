/**
 * P3A-05 · 三个代表页面只接线既有共享控件。
 *
 * 这里守住组合边界，而不是重复控件自身的交互测试：P1/P2 的控件用例
 * 已覆盖无障碍、令牌和错误态；此用例在断开代表页与唯一控件真源时失败。
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (...parts: string[]): string => fs.readFileSync(path.join(SRC, ...parts), 'utf8');

describe('P3A-05 代表页面复用共享控件', () => {
  it('广场用唯一 TopTabStrip 承接 7 个同页模块（集合来自注册表）', () => {
    const home = read('features', 'square', 'SquareHome.tsx');
    expect(home).toContain("from '@/components/ui/TopTabStrip'");
    expect(home).toContain('SQUARE_TABS');
    // ⛔ 集合不得在页面里再写一份（P2A-03 的源码扫描会拦）
    expect(home).not.toContain("labelKey: 'secondary.confession'");
  });

  it('树洞搜索复用 SearchField 的检索语义（就地展开，不再有独立搜索页）', () => {
    const bar = read('features', 'campus', 'TreeholeSearchBar.tsx');
    const feed = read('features', 'campus', 'TreeholeFeed.tsx');
    expect(bar).toContain("from '@/components/ui/SearchField'");
    expect(bar).toContain('appearance="full"');
    expect(bar).toContain('autoFocus');
    expect(feed).toContain('TreeholeSearchBar');
  });

  it('参数化发布描述符经 PublishMedia 复用唯一 MediaPicker，并保留各域额度', () => {
    const descriptors = read('features', 'publish', 'resolveDescriptor.tsx');
    const media = read('features', 'publish', 'PublishMedia.tsx');
    expect(descriptors).toContain("import { PublishMedia } from './PublishMedia'");
    expect(descriptors).toContain('mediaRender(4,false)');
    expect(descriptors).toContain('mediaRender(3,true)');
    expect(media).toContain("import {MediaPicker} from '@/components/ui/MediaPicker'");
    expect(media).toContain('testID={`publish-image-${index}`}');
  });
});
