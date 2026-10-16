import { fireEvent, screen } from '@testing-library/react-native';
import { TreeholePost } from '@/features/campus/TreeholePost';
import { renderApp } from './helpers/renderApp';

const post = { id: 7, title: '标题', content: '正文', authorName: '小蓝', authorId: 9, authorLevel: 3, authorBadge: 'contributor', avatarUrl: null, createdAt: null, liked: false, likeCount: 2, commentCount: 3, mediaUrls: [], tags: [{ id: 1, slug: 'help', nameZh: '求助', nameEn: 'Help' }] };

describe('P2X TreeholePost', () => {
  it('以业务组件渲染列表密度', async () => {
    const feed = await renderApp(<TreeholePost post={post} variant="feed" />);
    expect(feed.getByTestId('treehole-post-feed')).toBeTruthy();
    expect(feed.getByTestId('treehole-tags')).toBeTruthy();
    expect(feed.getByTestId('treehole-author-level')).toBeTruthy();
  });

  it('以相同业务组件渲染详情密度', async () => {
    await renderApp(<TreeholePost post={post} variant="detail" />);
    expect(screen.getByTestId('treehole-post-detail')).toBeTruthy();
  });

  it('动作仅调用传入回调', async () => {
    const onLike = jest.fn();
    const onReply = jest.fn();
    await renderApp(<TreeholePost post={post} variant="feed" onLike={onLike} onReply={onReply} />);
    fireEvent.press(screen.getByTestId('treehole-like'));
    fireEvent.press(screen.getByTestId('treehole-reply'));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onReply).toHaveBeenCalledTimes(1);
  });
});
