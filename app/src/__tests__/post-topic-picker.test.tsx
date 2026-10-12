import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { PostTopicPicker } from '@/features/publish/PostTopicPicker';

const copy = {
  searchPlaceholder: '搜索话题',
  nameZh: '中文名称',
  nameEn: 'English name',
  create: '新建话题',
  createFailed: '新建失败，请重试',
};

function picker(overrides: Partial<React.ComponentProps<typeof PostTopicPicker>> = {}) {
  const onChange = jest.fn();
  const onSearch = jest.fn();
  const createTopic = jest.fn().mockResolvedValue({ value: '17', label: '自习 / Study' });
  const element = (
    <PostTopicPicker
      label="话题"
      value={[]}
      onChange={onChange}
      options={[{ value: '7', label: '失物招领' }]}
      onSearch={onSearch}
      createTopic={createTopic}
      copy={copy}
      testID="post-topics"
      {...overrides}
    />
  );
  return { element, onChange, onSearch, createTopic };
}

describe('树洞远程话题选择', () => {
  it('selects the returned topic exactly once after creation', async () => {
    const fixture = picker();
    const view = await renderApp(fixture.element);

    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-name-zh'), '自习'); });
    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-name-en'), 'Study'); });
    await act(async () => { fireEvent.press(view.getByTestId('post-topics-create')); });

    await waitFor(() => expect(fixture.createTopic).toHaveBeenCalledWith({ name_zh: '自习', name_en: 'Study' }));
    expect(fixture.onChange).toHaveBeenCalledWith(['17']);
    expect(view.getByTestId('post-topics-name-zh').props.value).toBe('');
    expect(view.getByTestId('post-topics-name-en').props.value).toBe('');
  });

  it('keeps names and does not select a topic when creation fails', async () => {
    const fixture = picker({ createTopic: jest.fn().mockRejectedValue(new Error('offline')) });
    const view = await renderApp(fixture.element);

    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-name-zh'), '自习'); });
    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-name-en'), 'Study'); });
    await act(async () => { fireEvent.press(view.getByTestId('post-topics-create')); });

    await waitFor(() => expect(view.getByTestId('post-topics-create-error').props.children).toBe(copy.createFailed));
    expect(fixture.onChange).not.toHaveBeenCalled();
    expect(view.getByTestId('post-topics-name-zh').props.value).toBe('自习');
  });

  it('locks a repeated create press until the server replies', async () => {
    let finish: (value: { value: string; label: string }) => void = () => undefined;
    const createTopic = jest.fn(() => new Promise<{ value: string; label: string }>((resolve) => { finish = resolve; }));
    const fixture = picker({ createTopic });
    const view = await renderApp(fixture.element);

    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-name-zh'), '自习'); });
    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-name-en'), 'Study'); });
    await act(async () => { fireEvent.press(view.getByTestId('post-topics-create')); });
    await act(async () => { fireEvent.press(view.getByTestId('post-topics-create')); });
    expect(createTopic).toHaveBeenCalledTimes(1);

    await act(async () => { finish({ value: '17', label: '自习 / Study' }); });
  });

  it('debounces remote search input', async () => {
    jest.useFakeTimers();
    const fixture = picker();
    const view = await renderApp(fixture.element);

    await act(async () => { fireEvent.changeText(view.getByTestId('post-topics-search-input'), '自习'); });
    expect(fixture.onSearch).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(299));
    expect(fixture.onSearch).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(fixture.onSearch).toHaveBeenCalledWith('自习');
    jest.useRealTimers();
  });
});
