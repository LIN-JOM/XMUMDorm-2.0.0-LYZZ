import { fireEvent, waitFor } from '@testing-library/react-native';
import { TreeholeMedia } from '@/features/campus/TreeholeMedia';
import { renderApp } from './helpers/renderApp';

const urls = ['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg'];

describe('P2X TreeholeMedia', () => {
  it('列表三图只显示首图和数量，不暴露切换控件', async () => {
    const view = await renderApp(<TreeholeMedia urls={urls} mode="feed" />);
    expect(view.getByTestId('treehole-media-count').props.children).toBe('3 张图片');
    expect(view.queryByTestId('treehole-media-next')).toBeNull();
    expect(view.queryByTestId('treehole-media-preview')).toBeNull();
  });

  it('详情循环切图并能够打开预览', async () => {
    const view = await renderApp(<TreeholeMedia urls={urls} mode="detail" />);
    fireEvent.press(view.getByTestId('treehole-media-previous'));
    await waitFor(() => expect(view.getByTestId('treehole-media-detail-image').props.accessibilityLabel).toBe('第 3 张，共 3 张'));
    fireEvent.press(view.getByTestId('treehole-media-next'));
    await waitFor(() => expect(view.getByTestId('treehole-media-detail-image').props.accessibilityLabel).toBe('第 1 张，共 3 张'));
    fireEvent.press(view.getByTestId('treehole-media-preview'));
    await waitFor(() => expect(view.getByTestId('treehole-media-preview-state')).toBeTruthy());
  });
});
