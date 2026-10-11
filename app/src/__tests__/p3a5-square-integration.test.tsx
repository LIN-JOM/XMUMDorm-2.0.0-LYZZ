import * as React from 'react';

import { renderApp } from './helpers/renderApp';

jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[] };
  return {
    __state: state,
    useRouter: () => ({ push: (target: unknown) => state.pushed.push(target) }),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock('@/features/campus/CampusScreens', () => ({
  CampusListScreen: ({ beforeTabs }: { beforeTabs?: React.ReactNode }) =>
    require('react').createElement(require('react-native').View, { testID: 'campus-list-screen' }, beforeTabs),
}));

const SquareScreen = require('../app/(tabs)/index').default as () => React.ReactElement;
const routerState = require('expo-router').__state as { pushed: unknown[] };

beforeEach(() => {
  routerState.pushed.length = 0;
});

describe('P3A5-01 广场接入既有丙域列表', () => {
  it.each([
    ['market', '/market'],
    ['errand', '/errand'],
    ['guides', '/guides'],
  ])('点击 %s 服务入口会进入 %s', async (service, route) => {
    const view = await renderApp(<SquareScreen />);

    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId(`square-services-${service}`));

    expect(routerState.pushed).toEqual([route]);
  });

  it('保留 CampusListScreen 承接树洞与万能墙', async () => {
    const view = await renderApp(<SquareScreen />);

    expect(view.getByTestId('campus-list-screen')).toBeTruthy();
  });
});
