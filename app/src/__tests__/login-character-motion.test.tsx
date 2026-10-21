import * as React from 'react';
import { AccessibilityInfo, Animated, AppState, type AppStateStatus } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';

import { LoginCharacters } from '@/features/auth/LoginCharacters';
import { renderApp } from './helpers/renderApp';

function observeMotion() {
  const loops: { start: jest.Mock; stop: jest.Mock; reset: jest.Mock }[] = [];
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(loop);
    return loop;
  });
  let onState: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
    if (event === 'change') onState = listener;
    return { remove };
  });
  return { loops, remove, change: (state: AppStateStatus) => onState?.(state) };
}

function createScene() {
  let update: React.Dispatch<React.SetStateAction<{ active: boolean; eyesClosed: boolean }>>;
  function Scene() {
    const [settings, setSettings] = React.useState({ active: true, eyesClosed: false });
    update = setSettings;
    return <LoginCharacters size={390} {...settings} />;
  }
  return { Scene, set: (settings: { active: boolean; eyesClosed: boolean }) => update(settings) };
}

it('闭合和睁开都有至少 700 毫秒的过程，不以快速换图模拟动作', async () => {
  const motion = observeMotion();
  const timing = jest.spyOn(Animated, 'timing');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  await renderApp(<LoginCharacters size={390} active eyesClosed={false} />);
  await act(() => motion.change('active'));
  const visibleTransitions = timing.mock.calls.map(([, config]) => config.duration ?? 500);
  expect(visibleTransitions.length).toBeGreaterThanOrEqual(8);
  expect(Math.min(...visibleTransitions)).toBeGreaterThanOrEqual(700);
});

it('前台独立启动人物动画，后台停止，回到前台恢复，离开与卸载清理', async () => {
  const motion = observeMotion();
  const scene = createScene();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const view = await renderApp(<scene.Scene />);
  await act(() => motion.change('active'));
  expect(motion.loops).toHaveLength(4);
  expect(motion.loops.every((loop) => loop.start.mock.calls.length === 1)).toBe(true);
  await act(() => motion.change('background'));
  expect(motion.loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
  await act(() => motion.change('active'));
  expect(motion.loops).toHaveLength(8);
  await act(() => scene.set({ active: false, eyesClosed: false }));
  expect(motion.loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
  await act(() => scene.set({ active: true, eyesClosed: false }));
  expect(motion.loops).toHaveLength(12);
  await view.unmount();
  expect(motion.loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
  expect(motion.remove).toHaveBeenCalledTimes(1);
});

it('系统减少动态效果开启后停止环境动画，密码仍能立即闭眼', async () => {
  const motion = observeMotion();
  const scene = createScene();
  let reduceMotion: ((enabled: boolean) => void) | undefined;
  const accessibility: { addEventListener: (
    event: 'reduceMotionChanged', listener: (enabled: boolean) => void
  ) => { remove: () => void } } = AccessibilityInfo;
  jest.spyOn(accessibility, 'addEventListener').mockImplementation((_, listener) => {
    reduceMotion = listener;
    return { remove: jest.fn() };
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const view = await renderApp(<scene.Scene />);
  const closed = () => view.getByTestId('login-goat-closed', { includeHiddenElements: true });
  await waitFor(() => expect(closed()).toHaveStyle({ opacity: 0 }));
  await act(() => motion.change('active'));
  expect(motion.loops).toHaveLength(0);
  await act(() => scene.set({ active: true, eyesClosed: true }));
  expect(closed()).toHaveStyle({ opacity: 1 });
  const before = motion.loops.length;
  await act(() => reduceMotion?.(false));
  // 密码闭眼时仅恢复两个人物的呼吸，不启动眨眼循环。
  expect(motion.loops).toHaveLength(before + 2);
  await act(() => reduceMotion?.(true));
  expect(motion.loops.every((loop) => loop.stop.mock.calls.length === 1)).toBe(true);
});
