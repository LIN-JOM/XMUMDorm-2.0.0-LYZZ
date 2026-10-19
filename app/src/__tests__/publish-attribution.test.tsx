import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Form, draftKeyFor } from '@/components/ui/Form';
import { createPostPublishDescriptor } from '@/features/campus/postPublishFields';
import { usePublishFormCore } from '@/features/publish/usePublishForm';
import { useI18n } from '@/i18n';
import { getQueryClient } from '@/shared/queryClient';
import { getItem, setItem } from '@/shared/storage';
import { createPost } from '../../../shared/api/posts';
import { renderApp } from './helpers/renderApp';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn(), push: jest.fn() }) }));
jest.mock('../../../shared/api/posts', () => ({ createPost: jest.fn() }));

function Host() {
  const { t } = useI18n();
  const descriptor = React.useMemo(() => createPostPublishDescriptor(t, { tags: [], renderMedia: () => null }), [t]);
  const host = usePublishFormCore(descriptor, { signedIn: true, acceptedTerms: true });
  return <Form testID="attribution-form" form={host.form} sections={host.sections} labels={host.labels} semantic={host.semantic} />;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getQueryClient().clear();
});
afterEach(() => getQueryClient().clear());

it('默认原创，切换转载后显示 WX，并保存声明草稿', async () => {
  const view = await renderApp(<Host />);
  expect(view.getByTestId('attribution-form-contentOrigin-original').props.accessibilityState.checked).toBe(true);
  expect(view.queryByTestId('attribution-form-repostSource')).toBeNull();
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-repost'));
  expect(view.getByTestId('attribution-form-repostSource')).toBeTruthy();
  expect(view.getByLabelText('转载来源：WX')).toBeTruthy();
  await waitFor(async () => expect(await getItem(draftKeyFor('publish:confession'))).toMatchObject({ contentOrigin: 'repost', repostSource: 'WX' }));
});

it('填写真实表单后提交 WX 转载，正文不加前缀', async () => {
  (createPost as jest.Mock).mockResolvedValue({ id: 52 });
  const view = await renderApp(<Host />);
  await fireEvent.changeText(view.getByTestId('attribution-form-title'), '标题');
  await fireEvent.changeText(view.getByTestId('attribution-form-content'), '正文');
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-repost'));
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith({ title: '标题', content: '正文', type: 'normal', tagIds: [], images: [], contentOrigin: 'repost', repostSource: 'WX' }));
});

it('恢复转载草稿，切回原创后提交空来源', async () => {
  await setItem(draftKeyFor('publish:confession'), { title: '草稿标题', content: '草稿正文', contentOrigin: 'repost', repostSource: 'WX' });
  (createPost as jest.Mock).mockResolvedValue({ id: 53 });
  const view = await renderApp(<Host />);
  await waitFor(() => expect(view.getByTestId('attribution-form-contentOrigin-repost').props.accessibilityState.checked).toBe(true));
  expect(view.getByLabelText('转载来源：WX')).toBeTruthy();
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-original'));
  expect(view.queryByTestId('attribution-form-repostSource')).toBeNull();
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ contentOrigin: 'original', repostSource: null })));
});
