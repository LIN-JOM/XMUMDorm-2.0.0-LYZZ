import * as React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { FoodArticleFeed } from '@/features/square/FoodArticleFeed';
import { normalizeFoodArticlePage } from '@/features/square/foodArticles';
import { getFoodArticles } from '../../../shared/api/canteen';
import { invalidateCanteen } from '@/features/square/canteenCache';
const mockTargets: unknown[] = [];
jest.mock('expo-router', () => ({ useRouter: () => ({ push: (target: unknown) => mockTargets.push(target) }) }));
jest.mock('../../../shared/api/canteen', () => ({ getFoodArticles: jest.fn() }));
const api = jest.mocked(getFoodArticles);
beforeEach(() => { api.mockReset(); mockTargets.length = 0; api.mockResolvedValue({ list: [{ id: 9, title_or_excerpt: 'Rice', cover_url: null, author: { name: 'Student' } }], page: 1, hasMore: false }); });
it('projects a food article page and rejects malformed envelopes', () => {
  expect(normalizeFoodArticlePage({ list: [{ id: 9, title_or_excerpt: 'Rice', author: { name: 'Student' } }, { id: null }], hasMore: true })).toEqual({ rows: [{ id: 9, title: 'Rice', cover: null, author: 'Student' }], hasMore: true });
  expect(normalizeFoodArticlePage({ list: 'bad' })).toBeNull();
});
it('requests the first page and opens its existing campus post detail', async () => {
  const view = await renderApp(<FoodArticleFeed />);
  await waitFor(() => expect(view.getByTestId('food-article-9')).toBeTruthy());
  expect(api).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  await fireEvent.press(view.getByTestId('food-article-9'));
  expect(mockTargets).toEqual([{ pathname: '/campus/[id]', params: { id: '9' } }]);
});
it('appends backend pages while deduplicating repeated rows', async () => {
  api.mockResolvedValueOnce({ list: [{ id: 9, title_or_excerpt: 'Rice' }], hasMore: true }).mockResolvedValueOnce({ list: [{ id: 9, title_or_excerpt: 'Rice' }, { id: 10, title_or_excerpt: 'Noodles' }], hasMore: false });
  const view = await renderApp(<FoodArticleFeed />);
  await waitFor(() => expect(view.getByTestId('food-article-9')).toBeTruthy());
  if (view.queryByTestId('food-articles-more')) await fireEvent.press(view.getByTestId('food-articles-more'));
  await waitFor(() => expect(view.getByTestId('food-article-10')).toBeTruthy());
  expect(view.getAllByTestId('food-article-9')).toHaveLength(1);
  expect(api).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 });
});
it('offers retry after network failure instead of showing empty success', async () => {
  api.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<FoodArticleFeed />);
  await waitFor(() => expect(view.getByTestId('food-articles-error')).toBeTruthy());
});
it('does not append a slow page after cache invalidation', async () => {
  let finish!: (value: unknown) => void;
  api.mockResolvedValueOnce({ list: [{ id: 9, title_or_excerpt: 'Rice' }], hasMore: true }).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ list: [{ id: 11, title_or_excerpt: 'New' }], hasMore: false });
  const view = await renderApp(<FoodArticleFeed />);
  await waitFor(() => expect(view.getByTestId('food-article-9')).toBeTruthy());
  if (view.queryByTestId('food-articles-more')) await fireEvent.press(view.getByTestId('food-articles-more'));
  await act(async () => { await invalidateCanteen(); });
  await waitFor(() => expect(view.getByTestId('food-article-11')).toBeTruthy());
  await act(async () => finish({ list: [{ id: 10, title_or_excerpt: 'Old' }], hasMore: false }));
  expect(view.queryByTestId('food-article-10')).toBeNull();
});
