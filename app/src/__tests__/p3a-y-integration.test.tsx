import * as React from 'react';
import { Linking } from 'react-native';
import { renderApp } from './helpers/renderApp';

const routerState = { id: 'moodle' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: routerState.id }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Redirect: () => null,
}));

const moodleProps: { current: any } = { current: null };
jest.mock('@/features/tools/moodle/WorkspaceHost', () => ({
  MoodleWorkspaceHost: (props: any) => {
    moodleProps.current = props;
    const { View, Text } = require('react-native');
    return <View testID="moodle-host-integration"><Text>{props.labels.nativeWorkspace}</Text></View>;
  },
}));
jest.mock('@/features/tools/SchoolSystemWebView', () => ({
  SchoolSystemWebView: () => {
    const { View } = require('react-native');
    return <View testID="plain-school-webview" />;
  },
}));

const timetableProps: { current: any } = { current: null };
jest.mock('@/features/tools/TimetableScreen', () => ({
  TimetableScreen: (props: any) => {
    timetableProps.current = props;
    const { View } = require('react-native');
    return <View testID="phase3-timetable-host" />;
  },
}));

describe('P3A-Y public integration', () => {
  it('routes Moodle through the workspace host and supplies app translations', async () => {
    const Screen = require('../app/system/[id]').default as () => React.ReactElement;
    const view = await renderApp(<Screen />);
    expect(view.getByTestId('moodle-host-integration')).toBeTruthy();
    expect(view.queryByTestId('plain-school-webview')).toBeNull();
    expect(typeof moodleProps.current.labels.nativeWorkspace).toBe('string');
    expect(typeof moodleProps.current.onOpenOriginal).toBe('function');
    expect(typeof moodleProps.current.onReminderPlan).toBe('function');
    expect(typeof moodleProps.current.onClearReminders).toBe('function');
  });

  it('only forwards a trusted Moodle original URL to the host callback', async () => {
    const Screen = require('../app/system/[id]').default as () => React.ReactElement;
    await renderApp(<Screen />);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    moodleProps.current.onOpenOriginal('https://example.com/not-moodle');
    expect(openURL).not.toHaveBeenCalled();
    moodleProps.current.onOpenOriginal('https://l.xmu.edu.my/mod/forum/view.php?id=42');
    expect(openURL).toHaveBeenCalledWith('https://l.xmu.edu.my/mod/forum/view.php?id=42');
    openURL.mockRestore();
  });

  it('uses the new timetable host with the P11 grid renderer', async () => {
    const Screen = require('../app/tools/timetable').default as () => React.ReactElement;
    const view = await renderApp(<Screen />);
    expect(view.getByTestId('phase3-timetable-host')).toBeTruthy();
    expect(typeof timetableProps.current.renderGrid).toBe('function');
  });

  it('keeps the canteen route chain present for region, shop, product and review', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '../app/canteen');
    for (const file of ['index.tsx', 'region/[id].tsx', 'shop/[id].tsx', 'product/[id].tsx', 'review/[id].tsx', 'search.tsx']) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });
});
