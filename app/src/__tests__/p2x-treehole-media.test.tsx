import { fireEvent, waitFor } from '@testing-library/react-native';
import { resolveTreeholeSwipe, treeholeMediaKey, TreeholeMedia } from '@/features/campus/TreeholeMedia';
import { renderApp } from './helpers/renderApp';

const urls = ['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg'];

describe('P2X TreeholeMedia', () => {
  it('列表三图只显示首图和数量，不暴露切换控件', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="feed" />);
    expect(view.getByTestId('treehole-media-count').props.children).toBe('3 张图片');
    expect(view.getByTestId('treehole-media-feed-image').props.accessibilityLabel).toBe('共 3 张图片，打开帖子查看');
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.queryByTestId('treehole-media-preview')).toBeNull();
  });

  it('详情循环切图并能够打开预览', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    fireEvent.press(view.getByTestId('treehole-media-previous'));
    await waitFor(() => expect(view.getByTestId('treehole-media-detail-image').props.accessibilityLabel).toBe('第 3 张，共 3 张'));
    fireEvent.press(view.getByTestId('treehole-media-next'));
    await waitFor(() => expect(view.getByTestId('treehole-media-detail-image').props.accessibilityLabel).toBe('第 1 张，共 3 张'));
    expect(view.getByTestId('treehole-media-preview')).toBeTruthy();
  });

  it('详情拖拽阈值决定循环方向', () => {
    expect(resolveTreeholeSwipe(-60)).toBe('next');
    expect(resolveTreeholeSwipe(60)).toBe('previous');
    expect(resolveTreeholeSwipe(-12, -700)).toBe('next');
    expect(resolveTreeholeSwipe(59, 699)).toBeNull();
  });

  it('英文界面不会在媒体控件中混入中文', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />, { locale: 'en' });
    expect(view.getByTestId('treehole-media-detail-image').props.accessibilityLabel).toBe('Image 1 of 3');
    expect(view.getByTestId('treehole-media-previous')).toHaveTextContent('Previous image');
    expect(view.getByTestId('treehole-media-next')).toHaveTextContent('Next image');
    expect(view.getByTestId('treehole-media-preview')).toHaveTextContent('Preview image');
  });

  it('帖子 ID 或图片序列变化拥有新的重置键', () => {
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(8, urls));
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(7, [...urls].reverse()));
  });
});
