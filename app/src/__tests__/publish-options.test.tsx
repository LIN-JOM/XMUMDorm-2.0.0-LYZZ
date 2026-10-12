import * as React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderApp } from './helpers/renderApp';
import { buildDescriptor, useResolvedDescriptor } from '@/features/publish/resolveDescriptor';
import { fieldsOf } from '@/features/publish/descriptor';
import { getMarketplaceCategories } from '../../../shared/api/marketplace';
import { createPostTag, getPostTagsList } from '../../../shared/api/posts';
jest.mock('../../../shared/api/marketplace', () => ({ getMarketplaceCategories: jest.fn() }));
jest.mock('../../../shared/api/posts', () => ({ createPost: jest.fn(), createPostTag: jest.fn(), getPostTagsList: jest.fn() }));
function Probe() {
  const initial = React.useMemo(() => buildDescriptor('marketplace', key => key)!, []);
  const resolved = useResolvedDescriptor(initial, true);
  const field = fieldsOf(resolved.descriptor).find(field => field.name === 'category');
  return <Text testID="options">{JSON.stringify(field)}</Text>;
}
it('registered marketplace loads remote category values and English labels, excluding all', async () => {
  (getMarketplaceCategories as jest.Mock).mockResolvedValue([
    { slug: 'all', name_en: 'All' },
    { slug: 'books', name_zh: '书籍', name_en: 'Books' },
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await renderApp(<QueryClientProvider client={client}><Probe /></QueryClientProvider>, { locale: 'en' });
  await waitFor(() => expect(view.getByTestId('options').props.children).toContain('Books'));
  expect(view.getByTestId('options').props.children).toContain('books');
  expect(view.getByTestId('options').props.children).not.toContain('All');
  await act(async () => { view.unmount(); });
  client.clear();
});

function ConfessionProbe({ onChange }: { onChange: (next: unknown) => void }) {
  const initial = React.useMemo(() => buildDescriptor('confession', key => key)!, []);
  const resolved = useResolvedDescriptor(initial, true);
  const field = fieldsOf(resolved.descriptor).find(field => field.name === 'tagIds');
  return <>{field?.render?.({ value: [], onChange, disabled: false })}</>;
}

it('treehole topic picker searches and creates through the registered publish host', async () => {
  (getPostTagsList as jest.Mock).mockResolvedValue([{ id: 7, slug: 'study', name_zh: '自习', name_en: 'Study' }]);
  (createPostTag as jest.Mock).mockResolvedValue({ id: 17, slug: 'group-study', name_zh: '组队自习', name_en: 'Group study' });
  const onChange = jest.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await renderApp(<QueryClientProvider client={client}><ConfessionProbe onChange={onChange} /></QueryClientProvider>);

  await waitFor(() => expect(getPostTagsList).toHaveBeenCalledWith({ q: '', limit: 20 }));
  await act(async () => { fireEvent.changeText(view.getByTestId('publish-post-tags-name-zh'), '组队自习'); });
  await act(async () => { fireEvent.changeText(view.getByTestId('publish-post-tags-name-en'), 'Group study'); });
  await act(async () => { fireEvent.press(view.getByTestId('publish-post-tags-create')); });
  await waitFor(() => expect(createPostTag).toHaveBeenCalledWith({ name_zh: '组队自习', name_en: 'Group study' }));
  expect(onChange).toHaveBeenCalledWith(['17']);
  await act(async () => { view.unmount(); });
  client.clear();
});
