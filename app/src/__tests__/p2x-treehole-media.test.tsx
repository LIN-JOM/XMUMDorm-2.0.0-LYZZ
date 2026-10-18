/**
 * P2X TreeholeMedia（feed 静态 / detail 可切图）
 *
 * 旧实现的缺陷回归：
 * - feed 分支也实例化 PanResponder 与共享值（每行一份）：现在 feed 是**零状态**分支；
 * - 媒体块外面套了一层 HeroUI Card（Surface 套 Surface，图片只有 83.6% 宽）：现在不套卡。
 */

import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  resolveTreeholeSwipe,
  treeholeDeckLayers,
  treeholeMediaAspect,
  treeholeMediaKey,
  TreeholeMedia,
} from '@/features/campus/TreeholeMedia';
import { renderApp } from './helpers/renderApp';

const urls = ['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg'];

describe('P2X TreeholeMedia', () => {
  it('列表三图只显示前两张，第三张省略，不暴露切换控件', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="feed" />);
    // 2026-10-18 第七轮：不再堆叠，横向并排两张；第三张起省略
    expect(view.getByTestId('treehole-media-feed-image')).toBeTruthy();
    expect(view.getByTestId('treehole-media-feed-image-1')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-feed-image-2')).toBeNull();
    expect(view.queryByTestId('treehole-media-feed-back')).toBeNull();
    // 省略的图片用数量徽标说明总数
    expect(view.getByTestId('treehole-media-count')).toHaveTextContent('3 张图片');
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.queryByTestId('treehole-media-preview')).toBeNull();
    expect(view.queryByTestId('treehole-media-drag-area')).toBeNull();
  });

  it('列表两图并排且不需要数量徽标', async () => {
    const view = await renderApp(
      <TreeholeMedia postId={7} urls={[urls[0], urls[1]]} mode="feed" />
    );
    expect(view.getByTestId('treehole-media-feed-image')).toBeTruthy();
    expect(view.getByTestId('treehole-media-feed-image-1')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-feed-image-2')).toBeNull();
    expect(view.queryByTestId('treehole-media-count')).toBeNull();
  });

  it('列表单图没有第二张与数量徽标', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="feed" />);
    expect(view.getByTestId('treehole-media-feed-image')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-feed-image-1')).toBeNull();
    expect(view.queryByTestId('treehole-media-count')).toBeNull();
  });

  it('详情只用手势切图：没有左右箭头，读屏走 accessibilityActions', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    expect(view.queryByTestId('treehole-media-previous')).toBeNull();
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    const area = view.getByTestId('treehole-media-drag-area');
    expect(area.props.accessibilityActions).toEqual([
      { name: 'increment', label: '下一张' },
      { name: 'decrement', label: '上一张' },
    ]);
    expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 1 张，共 3 张');
    // 读屏"上一张"：2026-10-18 第六轮删掉箭头后，这是不靠手势也能切图的通道
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await waitFor(() =>
      expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 3 张，共 3 张')
    );
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await waitFor(() =>
      expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 1 张，共 3 张')
    );
  });

  it('详情可以打开预览并关闭', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull();
    // 预览入口 = 点图片（不再有独立的文字按钮）
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    await waitFor(() => expect(view.getByTestId('treehole-media-preview-dialog')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('关闭'));
    await waitFor(() => expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull());
  });

  it('单图详情没有切图控件与读屏动作，但仍可点图预览', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="detail" />);
    expect(view.queryByTestId('treehole-media-previous')).toBeNull();
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.queryByTestId('treehole-media-position')).toBeNull();
    expect(view.getByTestId('treehole-media-drag-area').props.accessibilityActions).toBeUndefined();
    expect(view.getByTestId('treehole-media-drag-area')).toBeTruthy();
  });

  it('详情拖拽阈值决定循环方向', () => {
    expect(resolveTreeholeSwipe(-60)).toBe('next');
    expect(resolveTreeholeSwipe(60)).toBe('previous');
    expect(resolveTreeholeSwipe(-12, -700)).toBe('next');
    expect(resolveTreeholeSwipe(59, 699)).toBeNull();
  });

  it('英文界面的读屏动作不混入中文', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />, {
      locale: 'en',
    });
    // 位置语义在前卡（可点的图像区）上，图片本身是装饰
    expect(view.getByTestId('treehole-media-drag-area').props.accessibilityLabel).toBe(
      'Image 1 of 3'
    );
    // 箭头删除后，切图动作只剩读屏动作：标签必须跟着语言走
    expect(view.getByTestId('treehole-media-drag-area').props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Next image' },
      { name: 'decrement', label: 'Previous image' },
    ]);
    expect(view.getByTestId('treehole-media-position')).toHaveTextContent('Image 1 of 3');
  });

  it('三图详情是两层后卡的叠卡', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    expect(view.getByTestId('treehole-media-back-1', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByTestId('treehole-media-back-2', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByTestId('treehole-media-drag-area')).toBeTruthy();
  });

  it('两图详情只有一层后卡；单图详情没有后卡', async () => {
    // renderApp 一个用例只允许调用一次，所以"2 图 / 1 图"拆成两条
    expect(treeholeDeckLayers(1)).toBe(1);
    expect(treeholeDeckLayers(2)).toBe(2);
    expect(treeholeDeckLayers(5)).toBe(3);
  });

  it('两图详情只有一层后卡', async () => {
    const view = await renderApp(
      <TreeholeMedia postId={8} urls={[urls[0], urls[1]]} mode="detail" />
    );
    expect(view.getByTestId('treehole-media-back-1', { includeHiddenElements: true })).toBeTruthy();
    expect(view.queryByTestId('treehole-media-back-2')).toBeNull();
  });

  it('单图详情没有后卡', async () => {
    const view = await renderApp(<TreeholeMedia postId={9} urls={[urls[0]]} mode="detail" />);
    expect(view.queryByTestId('treehole-media-back-1')).toBeNull();
    expect(view.queryByTestId('treehole-media-back-2')).toBeNull();
  });

  it('信息流统一 4:3 且半列宽；详情 16:9（2026-10-18 第六轮：详情不缩、信息流缩小到一屏 2 篇）', () => {
    // 信息流不再用 4:5 竖幅：竖幅会把一屏挤到只剩 1 篇
    expect(treeholeMediaAspect(1)).toBeCloseTo(4 / 3);
    expect(treeholeMediaAspect(2)).toBeCloseTo(4 / 3);
    expect(treeholeMediaAspect(3)).toBeCloseTo(4 / 3);
    expect(treeholeMediaAspect(1, 'detail')).toBeCloseTo(16 / 9);
    expect(treeholeMediaAspect(3, 'detail')).toBeCloseTo(16 / 9);
  });

  it('信息流单图按 40% 列宽、多图按 80%（两张并排）等比例缩小', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="feed" />);
    expect(JSON.stringify(view.getByTestId('treehole-media-feed').props.style)).toContain('"40%"');
  });

  it('信息流多图宽度为 80%（一屏 2 篇的算式不变）', async () => {
    const view = await renderApp(
      <TreeholeMedia postId={7} urls={[urls[0], urls[1]]} mode="feed" />
    );
    expect(JSON.stringify(view.getByTestId('treehole-media-feed').props.style)).toContain('"80%"');
  });

  it('帖子 ID 或图片序列变化拥有新的重置键', () => {
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(8, urls));
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(7, [...urls].reverse()));
  });
});
