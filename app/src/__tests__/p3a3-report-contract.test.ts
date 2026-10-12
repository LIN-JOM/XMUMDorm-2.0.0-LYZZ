import {reportErrand} from '../../../shared/api/errands';
import {reportMarketplaceItem} from '../../../shared/api/marketplace';
import {post} from '../../../shared/api/request';

jest.mock('../../../shared/api/request', () => ({post: jest.fn()}));

const api = post as jest.Mock;

beforeEach(() => api.mockReset());

it('sends marketplace and errand reports to the single server report endpoint', () => {
  reportMarketplaceItem(11, {reason: 'fraud', detail: 'listing mismatch'});
  reportErrand(12, {reason: 'spam', detail: 'duplicate task'});

  expect(api).toHaveBeenNthCalledWith(1, '/api/reports', {
    target_type: 'marketplace', target_id: 11, reason: 'fraud', detail: 'listing mismatch', screenshots: undefined,
  });
  expect(api).toHaveBeenNthCalledWith(2, '/api/reports', {
    target_type: 'errand', target_id: 12, reason: 'spam', detail: 'duplicate task', screenshots: undefined,
  });
});
