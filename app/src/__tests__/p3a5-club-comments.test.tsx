import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ isSignedIn: true, handleAuthFailure: jest.fn() }),
}));
jest.mock('@/features/clubs/useClubLike', () => ({
  useClubLike: () => ({ liked: false, count: 0, state: 'idle', toggle: jest.fn() }),
}));
jest.mock('@/features/clubs/useClubActivityRegistration', () => ({
  useClubActivityRegistration: () => ({
    snapshot: { activityId: 9, registered: false, count: 0, deadline: null },
    state: 'idle',
    register: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('../../../shared/api/clubs', () => ({
  getActivityDetail: jest.fn(),
  getClubPostDetail: jest.fn(),
  getClubActivityComments: jest.fn(),
  getClubPostComments: jest.fn(),
  createClubActivityComment: jest.fn(),
  createClubPostComment: jest.fn(),
}));

const api = require('../../../shared/api/clubs') as {
  getActivityDetail: jest.Mock;
  getClubPostDetail: jest.Mock;
  getClubActivityComments: jest.Mock;
  getClubPostComments: jest.Mock;
  createClubActivityComment: jest.Mock;
  createClubPostComment: jest.Mock;
};
const { ClubActivityDetailScreen, ClubPostDetailScreen } = require('@/features/clubs/ClubScreens') as typeof import('@/features/clubs/ClubScreens');

const ACTIVITY = {
  id: 9, title: 'Jam session', tag: null, summary: 'Bring an instrument', cover: null, images: [],
  time: null, endTime: null, location: null, clubId: 7, clubName: 'Music Club', status: 'upcoming', signupLink: null,
  registration: { count: 0, registered: false, deadline: null }, stats: { likes: 0, views: 0, comments: 2 }, viewer: { liked: false, canManage: false },
};
const POST = {
  id: 10, clubId: 7, clubName: 'Music Club', title: 'Practice notes', content: 'Meet in Hall A', images: [], createdAt: null,
  stats: { likes: 0, views: 0, comments: 0 }, viewer: { liked: false, canManage: false },
};
const COMMENTS = [{
  id: 101, parent_id: null, content: 'Root comment', created_at: '2026-10-11',
  author: { nickname: 'Alice' },
  replies: [{ id: 102, parent_id: 101, content: 'Reply comment', created_at: '2026-10-11', author: { username: 'Bob' } }],
}];

beforeEach(() => {
  jest.clearAllMocks();
  api.getActivityDetail.mockResolvedValue(ACTIVITY);
  api.getClubPostDetail.mockResolvedValue(POST);
  api.getClubActivityComments.mockResolvedValue(COMMENTS);
  api.getClubPostComments.mockResolvedValue([]);
});

describe('P3A5-07 社团评论复用接线', () => {
  it('活动详情按服务端顺序显示一级评论和回复，且只给一级评论回复入口', async () => {
    const view = await renderApp(<ClubActivityDetailScreen activityId="9" />);

    await waitFor(() => expect(view.getByTestId('club-activity-detail-comments-101')).toBeTruthy());
    expect(view.getByTestId('club-activity-detail-comments-102')).toBeTruthy();
    expect(view.getAllByLabelText('回复')).toHaveLength(1);
    expect(api.getClubActivityComments).toHaveBeenCalledWith(9);
  });

  it('活动根评论以服务器回执追加，并在成功后清空草稿', async () => {
    api.createClubActivityComment.mockResolvedValue({
      id: 103, parent_id: null, content: 'New comment', created_at: '2026-10-11', author: { username: 'Carol' },
    });
    const view = await renderApp(<ClubActivityDetailScreen activityId="9" />);

    await waitFor(() => expect(view.getByTestId('club-activity-detail-comments-101')).toBeTruthy());
    fireEvent.changeText(view.getByPlaceholderText('写评论'), '  New comment  ');
    fireEvent.press(view.getByTestId('club-composer-send'));

    await waitFor(() => expect(api.createClubActivityComment).toHaveBeenCalledWith(9, { content: 'New comment' }));
    await waitFor(() => expect(view.getByText('New comment')).toBeTruthy());
    expect(view.getByPlaceholderText('写评论').props.value).toBe('');
  });

  it('回复一级评论时只提交该一级评论的 parent_id', async () => {
    api.createClubActivityComment.mockResolvedValue({
      id: 104, parent_id: 101, content: 'A reply', created_at: '2026-10-11', author: { username: 'Carol' },
    });
    const view = await renderApp(<ClubActivityDetailScreen activityId="9" />);

    await waitFor(() => expect(view.getByTestId('club-activity-detail-comments-101')).toBeTruthy());
    fireEvent.press(view.getByLabelText('回复'));
    fireEvent.changeText(view.getByPlaceholderText('写评论'), 'A reply');
    fireEvent.press(view.getByTestId('club-composer-send'));

    await waitFor(() => expect(api.createClubActivityComment).toHaveBeenCalledWith(9, { content: 'A reply', parent_id: 101 }));
  });

  it('写入失败保留草稿并显示可改正状态', async () => {
    api.createClubActivityComment.mockRejectedValue(new Error('network'));
    const view = await renderApp(<ClubActivityDetailScreen activityId="9" />);

    await waitFor(() => expect(view.getByTestId('club-activity-detail-comments-101')).toBeTruthy());
    fireEvent.changeText(view.getByPlaceholderText('写评论'), 'Keep this draft');
    fireEvent.press(view.getByTestId('club-composer-send'));

    await waitFor(() => expect(view.getByText('评论未发送，请重试')).toBeTruthy());
    expect(view.getByPlaceholderText('写评论').props.value).toBe('Keep this draft');
  });

  it('帖子详情只读取和创建帖子评论，不误用活动接口', async () => {
    api.createClubPostComment.mockResolvedValue({
      id: 201, parent_id: null, content: 'Post comment', created_at: '2026-10-11', author: { username: 'Dana' },
    });
    const view = await renderApp(<ClubPostDetailScreen postId="10" />);

    await waitFor(() => expect(api.getClubPostComments).toHaveBeenCalledWith(10));
    fireEvent.changeText(view.getByPlaceholderText('写评论'), 'Post comment');
    fireEvent.press(view.getByTestId('club-composer-send'));

    await waitFor(() => expect(api.createClubPostComment).toHaveBeenCalledWith(10, { content: 'Post comment' }));
    expect(api.createClubActivityComment).not.toHaveBeenCalled();
  });
});
