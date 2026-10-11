import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import Heart from 'lucide-react-native/icons/heart';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { DishDetail } from '@/features/square/DishDetail';
import { ReviewScreen } from '@/features/square/ReviewScreen';
import { DishActions } from '@/features/square/DishActions';
import { getProduct, getProductFavoriteStatus } from '../../../shared/api/canteen';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: '7' }), useNavigation: () => ({ dispatch: jest.fn() }), useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ status: 'signedIn', handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('../../../shared/api/canteen', () => ({ getProduct: jest.fn(), getProductCommentsRaw: jest.fn(), getProductFavoriteStatus: jest.fn(), addFavoriteProduct: jest.fn(), removeFavoriteProduct: jest.fn(), postProductComment: jest.fn() }));
beforeEach(async () => { await clearNamespace(); jest.clearAllMocks(); jest.mocked(getProductFavoriteStatus).mockResolvedValue({ favorited: false }); jest.mocked(getProduct).mockResolvedValue({ product: { id: 7, name: 'Rice', images: [] }, comments: { list: [], page: 1, pageSize: 10, hasMore: false } }); });
it('offers a labelled heart favorite action with a visible state', async () => {
  const view = await renderApp(<DishActions productId={7} />);
  await waitFor(() => expect(view.getByTestId('dish-favorite').props.accessibilityState.disabled).toBe(false));
  expect(view.getByTestId('dish-favorite').findAllByType(Heart)).toHaveLength(1);
  expect(view.getByTestId('dish-favorite').props.accessibilityLabel).toBe('收藏');
});
it('keeps review outside the scrolling content with reserved measured space and missing-image fallback', async () => {
  const view = await renderApp(<DishDetail />);
  await waitFor(() => expect(view.getByText('Rice')).toBeTruthy());
  const overlay = view.getByTestId('dish-actions-overlay');
  let ancestor = overlay.parent;
  while (ancestor) { expect(ancestor.type).not.toBe(ScrollView); ancestor = ancestor.parent; }
  await fireEvent(overlay, 'layout', { nativeEvent: { layout: { height: 100 } } });
  expect(StyleSheet.flatten(view.getByTestId('dish-scroll').props.contentContainerStyle).paddingBottom).toBeGreaterThan(100);
  expect(view.getByTestId('dish-images-placeholder')).toBeTruthy();
});
it('uses one image entry until the review limit and enables it again after removal', async () => {
  const pick = jest.fn().mockResolvedValue({ ok: true, image: { uri: 'file:///meal.png', mimeType: 'image/png', sizeBytes: 10 } });
  const view = await renderApp(<ReviewScreen productId={7} pickImage={pick} />);
  expect(view.getAllByLabelText('添加图片')).toHaveLength(1);
  for (const index of [0, 1, 2]) { await fireEvent.press(view.getByTestId('review-images-add-pick')); expect(view.getByTestId(`review-images-remove-${index}`)).toBeTruthy(); }
  expect(view.queryByTestId('review-images-add-pick')).toBeNull();
  await fireEvent.press(view.getByTestId('review-images-remove-1'));
  expect(view.getByTestId('review-images-add-pick')).toBeTruthy();
  expect(pick).toHaveBeenCalledTimes(3);
});
