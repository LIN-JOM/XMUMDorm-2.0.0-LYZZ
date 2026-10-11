import { zh } from '@/i18n';

jest.mock('../../../shared/api/clubs', () => ({ createClubPost: jest.fn() }));

import { createClubPostPublishDescriptor } from '@/features/clubs/publishFields';

const api = require('../../../shared/api/clubs') as { createClubPost: jest.Mock };
const CLUBS = [{ value: '8', label: 'Tech Club' }];

describe('P3A3-07 社团帖子发布描述符', () => {
  beforeEach(() => {
    api.createClubPost.mockReset();
  });

  it('只发布到服务端确认的管理社团，并使用成功回执进入帖子详情', async () => {
    api.createClubPost.mockResolvedValue({ id: 41 });
    const descriptor = createClubPostPublishDescriptor((key) => zh[key], CLUBS);

    expect(descriptor.id).toBe('clubPost');
    const result = await descriptor.submit({
      clubId: '8',
      title: 'Weekly notes',
      content: 'Meet in Room 301.',
      images: [],
    });

    expect(api.createClubPost).toHaveBeenCalledWith(8, {
      title: 'Weekly notes',
      content: 'Meet in Room 301.',
    }, []);
    expect(descriptor.routeAfterSubmit(result)).toBe('/clubs/post/41?published=1');
  });

  it('正文为空或社团不在管理列表时不请求服务端', async () => {
    const descriptor = createClubPostPublishDescriptor((key) => zh[key], CLUBS);

    await expect(descriptor.submit({ clubId: '8', title: '', content: '', images: [] })).rejects.toEqual({ kind: 'validation' });
    await expect(descriptor.submit({ clubId: '99', title: 'No access', content: 'Cannot publish', images: [] })).rejects.toEqual({ kind: 'validation' });
    expect(api.createClubPost).not.toHaveBeenCalled();
  });
});
