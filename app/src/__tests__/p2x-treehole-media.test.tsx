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
  treeholeMediaAspect,
  treeholeMediaKey,
  TreeholeMedia,
} from '@/features/campus/TreeholeMedia';
import { renderApp } from './helpers/renderApp';

const urls = ['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg'];

describe('P2X TreeholeMedia', () => {
  it('列表三图只显示首图和数量，不暴露切换控件', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="feed" />);
    expect(view.getByTestId('treehole-media-count')).toHaveTextContent('3 张图片');
    expect(view.getByTestId('treehole-media-feed-image').props.accessibilityLabel).toBe(
      '共 3 张图片，打开帖子查看'
    );
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.queryByTestId('treehole-media-preview')).toBeNull();
    expect(view.queryByTestId('treehole-media-drag-area')).toBeNull();
  });

  it('详情循环切图并显示当前位置', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 1 张，共 3 张');
    fireEvent.press(view.getByTestId('treehole-media-previous'));
    await waitFor(() =>
      expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 3 张，共 3 张')
    );
    fireEvent.press(view.getByTestId('treehole-media-next'));
    await waitFor(() =>
      expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 1 张，共 3 张')
    );
  });

  it('详情可以打开预览并关闭', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull();
    await fireEvent.press(view.getByTestId('treehole-media-preview'));
    await waitFor(() => expect(view.getByTestId('treehole-media-preview-dialog')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('关闭'));
    await waitFor(() => expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull());
  });

  it('单图详情没有切图控件', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="detail" />);
    expect(view.queryByTestId('treehole-media-previous')).toBeNull();
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.getByTestId('treehole-media-preview')).toBeTruthy();
  });

  it('详情拖拽阈值决定循环方向', () => {
    expect(resolveTreeholeSwipe(-60)).toBe('next');
    expect(resolveTreeholeSwipe(60)).toBe('previous');
    expect(resolveTreeholeSwipe(-12, -700)).toBe('next');
    expect(resolveTreeholeSwipe(59, 699)).toBeNull();
  });

  it('英文界面不会在媒体控件中混入中文', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />, {
      locale: 'en',
    });
    // 位置语义在前卡（可点的图像区）上，图片本身是装饰
    expect(view.getByTestId('treehole-media-drag-area').props.accessibilityLabel).toBe(
      'Image 1 of 3'
    );
    expect(view.getByTestId('treehole-media-previous')).toHaveTextContent('Previous image');
    expect(view.getByTestId('treehole-media-next')).toHaveTextContent('Next image');
    expect(view.getByTestId('treehole-media-preview')).toHaveTextContent('Preview image');
  });

  it('单图 4:3 限高，多图叠卡 4:5（设计文档 §媒体布局）', () => {
    expect(treeholeMediaAspect(1)).toBeCloseTo(4 / 3);
    expect(treeholeMediaAspect(2)).toBeCloseTo(4 / 5);
    expect(treeholeMediaAspect(3)).toBeCloseTo(4 / 5);
  });

  it('帖子 ID 或图片序列变化拥有新的重置键', () => {
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(8, urls));
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(7, [...urls].reverse()));
  });
});
