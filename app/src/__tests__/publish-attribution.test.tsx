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
  const descriptor = React.useMemo(() => createPostPublishDescriptor(t, { tags: [], renderMedia: () => null, renderTags: () => null }), [t]);
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

it('选自定义才显示输入，填写来源后提交去空格文字', async () => {
  (createPost as jest.Mock).mockResolvedValue({ id: 54 });
  const view = await renderApp(<Host />);
  await fireEvent.changeText(view.getByTestId('attribution-form-title'), '标题');
  await fireEvent.changeText(view.getByTestId('attribution-form-content'), '正文');
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-repost'));
  expect(view.queryByTestId('attribution-form-customRepostSource')).toBeNull();
  await fireEvent.press(view.getByTestId('attribution-form-repostSource'));
  await fireEvent.press(view.getByLabelText('自定义'));
  expect(view.getByTestId('attribution-form-customRepostSource').props.maxLength).toBe(100);
  await fireEvent.changeText(view.getByTestId('attribution-form-customRepostSource'), '  学院群聊  ');
  await waitFor(async () => expect(await getItem(draftKeyFor('publish:confession'))).toMatchObject({ repostSource: 'custom', customRepostSource: '  学院群聊  ' }));
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ content: '正文', contentOrigin: 'repost', repostSource: '学院群聊' })));
});

it('自定义来源空白时阻止真实表单提交', async () => {
  const view = await renderApp(<Host />);
  await fireEvent.changeText(view.getByTestId('attribution-form-title'), '标题');
  await fireEvent.changeText(view.getByTestId('attribution-form-content'), '正文');
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-repost'));
  await fireEvent.press(view.getByTestId('attribution-form-repostSource'));
  await fireEvent.press(view.getByLabelText('自定义'));
  await fireEvent.changeText(view.getByTestId('attribution-form-customRepostSource'), '   ');
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(view.getByTestId('attribution-form-summary')).toBeTruthy());
  expect(createPost).not.toHaveBeenCalled();
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

it.each(['WX', 'QQ', '抖音', 'INS', 'Telegram', 'X', 'Whatsapp'])('真实表单可选择并发布 %s', async source => {
  (createPost as jest.Mock).mockResolvedValue({ id: 55 });
  const view = await renderApp(<Host />);
  await fireEvent.changeText(view.getByTestId('attribution-form-title'), '标题');
  await fireEvent.changeText(view.getByTestId('attribution-form-content'), '正文');
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-repost'));
  await fireEvent.press(view.getByTestId('attribution-form-repostSource'));
  await fireEvent.press(view.getByLabelText(source));
  expect(view.queryByTestId('attribution-form-customRepostSource')).toBeNull();
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ contentOrigin: 'repost', repostSource: source })));
});

it.each(['zh', 'en'] as const)('自定义草稿恢复后可直接发布（%s）', async locale => {
  await setItem(draftKeyFor('publish:confession'), { title: '标题', content: '正文', contentOrigin: 'repost', repostSource: 'custom', customRepostSource: '学院群聊' });
  (createPost as jest.Mock).mockResolvedValue({ id: 56 });
  const view = await renderApp(<Host />, { locale });
  await waitFor(() => expect(view.getByTestId('attribution-form-customRepostSource').props.value).toBe('学院群聊'));
  expect(view.getByTestId('attribution-form-customRepostSource').props.accessibilityLabel).toContain(locale === 'en' ? 'Source description' : '来源说明');
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ contentOrigin: 'repost', repostSource: '学院群聊' })));
});

it('自定义草稿切到预设，不提交残留自定义内容', async () => {
  await setItem(draftKeyFor('publish:confession'), { title: '标题', content: '正文', contentOrigin: 'repost', repostSource: 'custom', customRepostSource: '<旧草稿>' });
  (createPost as jest.Mock).mockResolvedValue({ id: 57 });
  const view = await renderApp(<Host />);
  await waitFor(() => expect(view.getByTestId('attribution-form-customRepostSource').props.value).toBe('<旧草稿>'));
  await fireEvent.press(view.getByTestId('attribution-form-repostSource'));
  await fireEvent.press(view.getByLabelText('QQ'));
  expect(view.queryByTestId('attribution-form-customRepostSource')).toBeNull();
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ contentOrigin: 'repost', repostSource: 'QQ' })));
});

it('自定义草稿切到原创，不提交残留来源', async () => {
  await setItem(draftKeyFor('publish:confession'), { title: '标题', content: '正文', contentOrigin: 'repost', repostSource: 'custom', customRepostSource: '学院群聊' });
  (createPost as jest.Mock).mockResolvedValue({ id: 58 });
  const view = await renderApp(<Host />);
  await waitFor(() => expect(view.getByTestId('attribution-form-customRepostSource').props.value).toBe('学院群聊'));
  await fireEvent.press(view.getByTestId('attribution-form-contentOrigin-original'));
  expect(view.queryByTestId('attribution-form-repostSource')).toBeNull();
  expect(view.queryByTestId('attribution-form-customRepostSource')).toBeNull();
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ contentOrigin: 'original', repostSource: null })));
});

it.each([
  ['zh', '原创', '转载', '自定义', '转载来源：自定义', '来源说明', '必填', '请填写 1–100 字符的单行纯文字来源'],
  ['en', 'Original', 'Repost', 'Custom', 'Repost source：Custom', 'Source description', 'required', 'Enter a single-line plain-text source of 1–100 characters'],
] as const)('声明选择和来源错误使用当前语言的可访问名称：%s', async (locale, original, repost, custom, selection, field, required, error) => {
  const view = await renderApp(<Host />, { locale });
  expect(view.getByRole('radio', { name: original, checked: true })).toBeTruthy();
  await fireEvent.press(view.getByRole('radio', { name: repost }));
  expect(view.getByRole('radio', { name: repost, checked: true })).toBeTruthy();
  await fireEvent.press(view.getByRole('combobox'));
  await fireEvent.press(view.getByRole('button', { name: custom }));
  expect(view.getByRole('combobox', { name: selection, expanded: false })).toBeTruthy();
  const input = view.getByTestId('attribution-form-customRepostSource');
  expect(input.props.accessibilityLabel).toContain(field);
  expect(input.props.accessibilityLabel).toContain(required);
  expect(view.getByTestId('attribution-form-title').props.accessibilityLabel).toContain(required);
  expect(view.getByTestId('attribution-form-content').props.accessibilityLabel).toContain(required);
  await fireEvent.changeText(view.getByTestId('attribution-form-title'), '标题');
  await fireEvent.changeText(view.getByTestId('attribution-form-content'), '正文');
  await fireEvent.changeText(input, '<invalid>');
  await fireEvent.press(view.getByTestId('attribution-form-submit'));
  await waitFor(() => expect(view.getByTestId('attribution-form-customRepostSource').props.accessibilityLabel).toContain(error));
  expect(createPost).not.toHaveBeenCalled();
});
