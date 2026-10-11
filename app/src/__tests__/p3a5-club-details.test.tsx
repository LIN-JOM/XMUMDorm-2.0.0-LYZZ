import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';

jest.mock('expo-router', () => {
  const state = { replaced: [] as unknown[] };
  return {
    __state: state,
    useRouter: () => ({ replace: (target: unknown) => state.replaced.push(target), back: () => undefined, canGoBack: () => false }),
  };
});
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ isSignedIn: true, handleAuthFailure: jest.fn() }) }));
jest.mock('../../../shared/api/clubs', () => ({
  getActivityDetail: jest.fn(), getClubPostDetail: jest.fn(), getClubActivityComments: jest.fn(), getClubPostComments: jest.fn(),
  createClubActivityComment: jest.fn(), createClubPostComment: jest.fn(),
}));
jest.mock('@/features/clubs/useClubLike', () => ({ useClubLike: jest.fn() }));
jest.mock('@/features/clubs/useClubActivityRegistration', () => ({ useClubActivityRegistration: jest.fn() }));

const api = require('../../../shared/api/clubs') as {
  getActivityDetail: jest.Mock; getClubPostDetail: jest.Mock; getClubActivityComments: jest.Mock; getClubPostComments: jest.Mock;
};
const like = require('@/features/clubs/useClubLike').useClubLike as jest.Mock;
const registration = require('@/features/clubs/useClubActivityRegistration').useClubActivityRegistration as jest.Mock;
const routerState = require('expo-router').__state as { replaced: unknown[] };
const { ClubActivityDetailScreen, ClubPostDetailScreen } = require('@/features/clubs/ClubScreens') as typeof import('@/features/clubs/ClubScreens');

const ACTIVITY = {
  id: 9, title: 'Jam session', tag: null, summary: 'Bring an instrument', cover: null, images: [],
  time: null, endTime: null, location: null, clubId: 7, clubName: 'Music Club', status: 'upcoming', signupLink: null,
  registration: { count: 2, registered: false, deadline: null }, stats: { likes: 3, views: 0, comments: 0 }, viewer: { liked: false, canManage: false },
};
const POST = {
  id: 10, clubId: 7, clubName: 'Music Club', title: 'Practice notes', content: 'Meet in Hall A', images: [], createdAt: null,
  stats: { likes: 3, views: 0, comments: 0 }, viewer: { liked: false, canManage: false },
};

beforeEach(() => {
  api.getActivityDetail.mockReset();
  api.getClubPostDetail.mockReset();
  api.getClubActivityComments.mockReset().mockResolvedValue([]);
  api.getClubPostComments.mockReset().mockResolvedValue([]);
  like.mockReset().mockReturnValue({ liked: true, count: 3, state: 'success', toggle: jest.fn() });
  registration.mockReset().mockReturnValue({ snapshot: { activityId: 9, registered: true, count: 8, deadline: null }, state: 'registered', register: jest.fn(), cancel: jest.fn() });
  routerState.replaced.length = 0;
});

describe('P3A5-03 社团详情接线', () => {
  it('活动页显示报名 Hook 的服务端回执，并使用取消报名动作', async () => {
    api.getActivityDetail.mockResolvedValue(ACTIVITY);
    const view = await renderApp(<ClubActivityDetailScreen activityId="9" />);

    await waitFor(() => expect(view.getByTestId('club-activity-registration')).toBeTruthy());
    expect(view.getByTestId('club-activity-registration').props.accessibilityLabel).toContain('8');
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('club-activity-registration'));
    expect(registration.mock.results[0].value.cancel).toHaveBeenCalledTimes(1);
  });

  it('帖子点赞只调用丙的 Hook，计数由 Hook 回执展示', async () => {
    api.getClubPostDetail.mockResolvedValue(POST);
    const view = await renderApp(<ClubPostDetailScreen postId="10" />);

    await waitFor(() => expect(view.getByTestId('club-post-detail-like')).toBeTruthy());
    expect(view.getByTestId('club-post-detail-like').props.accessibilityLabel).toContain('3');
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('club-post-detail-like'));
    expect(like.mock.results[0].value.toggle).toHaveBeenCalledTimes(1);
  });

  it('详情冷启动返回所属社团，而不是未注册的通知路径', async () => {
    api.getActivityDetail.mockResolvedValue(ACTIVITY);
    const view = await renderApp(<ClubActivityDetailScreen activityId="9" />);

    await waitFor(() => expect(view.getByTestId('club-activity-detail-back')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('club-activity-detail-back'));
    expect(routerState.replaced).toEqual(['/clubs/7']);
  });
});
