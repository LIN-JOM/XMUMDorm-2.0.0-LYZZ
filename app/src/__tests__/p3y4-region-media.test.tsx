import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { RegionShops, normalizeRanked } from '@/features/square/RegionShops';
import { CanteenMedia } from '@/features/square/CanteenMedia';
import * as canteenApi from '../../../shared/api/canteen';
const mockTargets: unknown[] = [];
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: '1' }), useRouter: () => ({ push: (target: unknown) => mockTargets.push(target) }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('../../../shared/api/canteen', () => ({ getRegionTopProducts: jest.fn(), getShopsByRegion: jest.fn() }));
const api = jest.mocked(canteenApi);
beforeEach(() => {
  jest.clearAllMocks(); mockTargets.length = 0;
  api.getRegionTopProducts.mockResolvedValue([{ id: 7, name: 'Rice', rank: 1, comprehensive_score: 8 }]);
  api.getShopsByRegion.mockResolvedValue([{ id: 8, name: 'Kitchen', logo: '/uploads/shop.png' }]);
});
it('keeps raw rank and shop metadata with the correct valid product', () => {
  expect(normalizeRanked([{ id: null, shop_name: 'Wrong', rank: 1 }, { id: 7, name: 'Rice', shop_name: 'Kitchen', rank: 2 }])[0]).toMatchObject({ id: 7, shopName: 'Kitchen', rank: 2 });
});
it('expands the region top ten to the full bounded ranking without inventing a route', async () => {
  const view = await renderApp(<RegionShops />);
  await waitFor(() => expect(view.getByTestId('region-top-7')).toBeTruthy());
  expect(api.getRegionTopProducts).toHaveBeenCalledWith(1, { limit: 10 });
  await fireEvent.press(view.getByTestId('region-ranking-all'));
  await waitFor(() => expect(api.getRegionTopProducts).toHaveBeenCalledWith(1, { limit: 50 }));
  await waitFor(() => expect(view.getByTestId('region-ranking-product-7')).toBeTruthy());
  await fireEvent.press(view.getByTestId('region-ranking-product-7'));
  expect(mockTargets).toEqual([{ pathname: '/canteen/product/[id]', params: { id: '7' } }]);
  await fireEvent.press(view.getByTestId('region-ranking-close'));
  await waitFor(() => expect(view.getByTestId('region-shop-8')).toBeTruthy());
});
it('shows the shop logo and retains the shop detail target', async () => {
  const view = await renderApp(<RegionShops />);
  await waitFor(() => expect(view.getByTestId('region-shop-media-8-image')).toBeTruthy());
  await fireEvent.press(view.getByTestId('region-shop-8'));
  expect(mockTargets).toEqual([{ pathname: '/canteen/shop/[id]', params: { id: '8' } }]);
});
it('retains an accessible placeholder when no image exists', async () => {
  const view = await renderApp(<CanteenMedia uri={null} name="Kitchen" testID="media" />);
  expect(view.getByTestId('media-placeholder')).toBeTruthy();
  expect(view.getByLabelText('Kitchen')).toBeTruthy();
});
it('replaces a failed image with the same placeholder', async () => {
  const view = await renderApp(<CanteenMedia uri="https://example.invalid/shop.png" name="Kitchen" testID="media" />);
  await fireEvent(view.getByTestId('media-image'), 'error', { nativeEvent: { error: 'unavailable' } });
  expect(view.getByTestId('media-placeholder')).toBeTruthy();
  expect(view.queryByTestId('media-image')).toBeNull();
});
