/**
 * P3A7 · `O06 BottomSheet`（半屏弹层）
 *
 * 依据：`docs/app/task/课表重做/T1-半屏弹层组件.md`
 *   · `visible=false` 什么都不渲染；· 标题 + 关闭键 + 遮罩三种关闭；· 半屏高度与底部 inset。
 */
import * as React from 'react';
import { Dimensions } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';

const windowHeight = Dimensions.get('window').height;

describe('P3A7 半屏弹层', () => {
  it('visible=false：不渲染弹层与内容', async () => {
    const view = await renderApp(
      <BottomSheet visible={false} onClose={jest.fn()} closeLabel="关闭" testID="sheet">
        <Text>正文</Text>
      </BottomSheet>
    );
    expect(view.queryByTestId('sheet')).toBeNull();
    expect(view.queryByText('正文')).toBeNull();
  });

  it('标题与关闭键：点关闭触发 onClose', async () => {
    const onClose = jest.fn();
    const view = await renderApp(
      <BottomSheet visible onClose={onClose} closeLabel="关闭" title="大学英语" testID="sheet">
        <Text>正文</Text>
      </BottomSheet>
    );
    expect(view.getByText('大学英语')).toBeTruthy();
    await fireEvent.press(view.getByTestId('sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点遮罩关闭', async () => {
    const onClose = jest.fn();
    const view = await renderApp(
      <BottomSheet visible onClose={onClose} closeLabel="关闭" testID="sheet">
        <Text>正文</Text>
      </BottomSheet>
    );
    await fireEvent.press(view.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('半屏高度 = 窗口高 × 0.5，且底部 inset 进 padding', async () => {
    const view = await renderApp(
      <BottomSheet visible onClose={jest.fn()} closeLabel="关闭" bottomInset={34} testID="sheet">
        <Text>正文</Text>
      </BottomSheet>
    );
    expect(view.getByTestId('sheet')).toHaveStyle({
      height: Math.round(windowHeight * 0.5),
      paddingBottom: 34,
    });
  });

  it('子内容原样渲染（容器不篡改业务内容）', async () => {
    const view = await renderApp(
      <BottomSheet visible onClose={jest.fn()} closeLabel="关闭" testID="sheet">
        <Text testID="child">课程详情</Text>
      </BottomSheet>
    );
    expect(view.getByTestId('child', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByTestId('sheet-body', { includeHiddenElements: true })).toBeTruthy();
  });
});
