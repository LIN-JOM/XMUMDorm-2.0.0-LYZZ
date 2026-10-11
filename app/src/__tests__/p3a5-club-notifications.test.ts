import { resolveNotificationRoute } from '@/features/mailbox/MailboxScreen';
import type { NotificationRow } from '@/features/mailbox/notifications';

function row(target: Partial<NotificationRow['target']>): NotificationRow {
  return {
    id: 1,
    type: 'club_like',
    isRead: false,
    title: null,
    target: { type: 'club', id: 7, title: null, path: '/about/club/7', available: true, ...target },
    category: 'interaction',
    module: 'clubs',
    fromName: null,
    createdAt: null,
  };
}

describe('P3A5-05 社团通知接线', () => {
  it.each([
    ['club', 7, '/clubs/7'],
    ['club_activity', 9, '/clubs/activity/9'],
    ['club_post', 10, '/clubs/post/10'],
  ])('将服务端 %s 目标映射到 App 路由', (type, id, route) => {
    expect(resolveNotificationRoute(row({ type, id }))).toBe(route);
  });

  it('拒绝不可用、未知或无效目标，不将 Web path 作为 App 路由', () => {
    expect(resolveNotificationRoute(row({ available: false }))).toBeNull();
    expect(resolveNotificationRoute(row({ type: 'unknown', path: '/clubs/7' }))).toBeNull();
    expect(resolveNotificationRoute(row({ id: 0, path: '/about/club/0' }))).toBeNull();
  });
});
