import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { AcScheduleReadGuide } from '@/features/tools/AcScheduleReadGuide';

const labels = {
  title: '读取前准备', instruction: '在 AC 打开 Basic Info，再打开 Course List。',
  confirm: '开始读取', cancel: '稍后读取',
};

it('shows the Basic Info and Course List steps before reading', async () => {
  const onRead = jest.fn();
  const view = await renderApp(<AcScheduleReadGuide labels={labels} onRead={onRead} />, { inScreen: true });
  await fireEvent.press(view.getByTestId('ac-read-guide-open'));
  expect(view.getByText('在 AC 打开 Basic Info，再打开 Course List。')).toBeTruthy();
  expect(onRead).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('开始读取'));
  expect(onRead).toHaveBeenCalledTimes(1);
});

it('cancels without reading and allows a later confirmation', async () => {
  const onRead = jest.fn();
  const view = await renderApp(<AcScheduleReadGuide labels={labels} onRead={onRead} />, { inScreen: true });
  await fireEvent.press(view.getByTestId('ac-read-guide-open'));
  await fireEvent.press(view.getByText('稍后读取'));
  expect(onRead).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('ac-read-guide-open'));
  await fireEvent.press(view.getByText('开始读取'));
  expect(onRead).toHaveBeenCalledTimes(1);
});
