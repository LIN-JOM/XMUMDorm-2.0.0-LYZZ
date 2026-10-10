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
  it('广场用唯一 TopTabStrip 承接树洞和万能墙的二级导航', () => {
    const source = read('features', 'campus', 'CampusScreens.tsx');
    expect(source).toContain("import {TopTabStrip} from '@/components/ui/TopTabStrip'");
    expect(source).toContain("getSecondaryTabs('square')");
  });

  it('广场搜索页复用 SearchField 的全页检索与读屏语义', () => {
    const source = read('features', 'campus', 'CampusSearchScreen.tsx');
    expect(source).toContain("import {SearchField} from '@/components/ui/SearchField'");
    expect(source).toContain('appearance="full"');
    expect(source).toContain('testID="campus-search-field"');
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
