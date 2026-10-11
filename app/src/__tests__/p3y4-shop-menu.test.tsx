import * as React from 'react';
import { clearNamespace } from '@/shared/storage';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ShopMenu } from '@/features/square/ShopMenu';
import * as canteenApi from '../../../shared/api/canteen';
const mockTargets: unknown[] = [];
const mockParams = { id: '8' };
let mockRepaint: () => void;
function Harness() { const [, repaint] = React.useReducer((value: number) => value + 1, 0); React.useEffect(() => { mockRepaint = repaint; }, [repaint]); return <ShopMenu />; }
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, useRouter: () => ({ push: (target: unknown) => mockTargets.push(target) }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('../../../shared/api/canteen', () => ({ getShop: jest.fn(), getProducts: jest.fn(), getShopHotProducts: jest.fn() }));
const api = jest.mocked(canteenApi);
beforeEach(async () => {
  await clearNamespace();
  jest.clearAllMocks(); mockTargets.length = 0; mockParams.id = '8';
  api.getShop.mockResolvedValue({ id: 8, name: 'Kitchen', logo: null, categories: [{ id: 1, name: 'Meals' }, { id: 2, name: 'Drinks' }] });
  api.getProducts.mockResolvedValue([{ id: 7, name: 'Rice', images: [] }]); api.getShopHotProducts.mockResolvedValue([]);
});
it('shows vertical category choices beside the menu and filters in place', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('shop-category-2')).toBeTruthy());
  expect(view.getByTestId('shop-categories').props.horizontal).not.toBe(true);
  await fireEvent.press(view.getByTestId('shop-category-2'));
  await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(8, { category_id: 2 }));
  expect(mockTargets).toEqual([]);
});
it('clears the category filter and preserves the existing product detail route', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('shop-category-2')).toBeTruthy());
  await fireEvent.press(view.getByTestId('shop-category-2'));
  await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(8, { category_id: 2 }));
  await fireEvent.press(view.getByTestId('shop-category-all'));
  await fireEvent.press(view.getByTestId('shop-product-7'));
  expect(mockTargets).toEqual([{ pathname: '/canteen/product/[id]', params: { id: '7' } }]);
});
it('shows placeholders for both shop and dish missing images', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('shop-product-media-7-placeholder')).toBeTruthy());
  expect(view.getByTestId('shop-logo-placeholder')).toBeTruthy();
});
it('resets the category when moving to another shop', async () => {
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('shop-category-2')).toBeTruthy());
  await fireEvent.press(view.getByTestId('shop-category-2'));
  await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(8, { category_id: 2 }));
  mockParams.id = '9';
  await act(async () => mockRepaint());
  await waitFor(() => expect(api.getProducts).toHaveBeenLastCalledWith(9, {}));
  expect(api.getProducts).not.toHaveBeenCalledWith(9, { category_id: 2 });
});
it('shows product failure in the right menu pane', async () => {
  api.getProducts.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<Harness />);
  await waitFor(() => expect(view.getByTestId('shop-products-error')).toBeTruthy());
  expect(view.getByTestId('shop-category-2')).toBeTruthy();
});
