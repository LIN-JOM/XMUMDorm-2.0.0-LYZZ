import { zh } from '@/i18n';

jest.mock('../../../shared/api/clubs', () => ({ createClubActivity: jest.fn() }));

import { createClubActivityPublishDescriptor } from '@/features/clubs/publishFields';

const api = require('../../../shared/api/clubs') as { createClubActivity: jest.Mock };
const CLUBS = [{ value: '7', label: 'Music Club' }];

describe('P3A3-06 社团活动发布描述符', () => {
  beforeEach(() => {
    api.createClubActivity.mockReset();
  });

  it('只接受服务端返回的可管理社团，并提交后进入新活动详情', async () => {
    api.createClubActivity.mockResolvedValue({ id: 31 });
    const descriptor = createClubActivityPublishDescriptor((key) => zh[key], CLUBS);

    expect(descriptor.id).toBe('clubActivity');
    expect(descriptor.sections[0].fields.find((field) => field.name === 'clubId')?.source).toEqual({
      kind: 'remote',
      options: CLUBS,
    });

    const result = await descriptor.submit({
      clubId: '7',
      title: 'Welcome session',
      summary: 'Bring your student card',
      location: 'Hall A',
      signupLink: 'https://example.test/signup',
      time: '2026-11-01T10:00:00.000Z',
      endTime: '2026-11-01T12:00:00.000Z',
      images: [],
    });

    expect(api.createClubActivity).toHaveBeenCalledWith(7, {
      title: 'Welcome session',
      summary: 'Bring your student card',
      location: 'Hall A',
      signupLink: 'https://example.test/signup',
      time: '2026-11-01T10:00:00.000Z',
      endTime: '2026-11-01T12:00:00.000Z',
    }, []);
    expect(descriptor.routeAfterSubmit(result)).toBe('/clubs/activity/31?published=1');
  });

  it('拒绝不在服务端可管理列表中的社团，不发创建请求', async () => {
    const descriptor = createClubActivityPublishDescriptor((key) => zh[key], CLUBS);

    await expect(descriptor.submit({
      clubId: '99', title: 'Unowned club', summary: '', location: '', signupLink: '', time: '', endTime: '', images: [],
    })).rejects.toEqual({ kind: 'validation' });
    expect(api.createClubActivity).not.toHaveBeenCalled();
  });

  it('不完整或无效的日期时间不能越过客户端表单校验', async () => {
    const descriptor = createClubActivityPublishDescriptor((key) => zh[key], CLUBS);

    await expect(descriptor.submit({
      clubId: '7', title: 'Broken time', summary: '', location: '', signupLink: '', time: 'local:2026-11-01|', endTime: '', images: [],
    })).rejects.toEqual({ kind: 'validation' });
    expect(api.createClubActivity).not.toHaveBeenCalled();
  });
});
