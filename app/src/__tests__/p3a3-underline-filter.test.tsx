import * as React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderApp} from './helpers/renderApp';
import {UnderlineFilter} from '@/components/ui/UnderlineFilter';

it('uses one selected filter and keeps option semantics out of the tab role', async () => {
  const selected = jest.fn();
  const view = await renderApp(
    <UnderlineFilter
      testID="report-filter"
      selectedKey="all"
      onSelect={selected}
      options={[{key: 'all', labelKey: 'screen.market.all'}, {key: 'dailyuse', labelKey: 'screen.market.dailyuse'}]}
    />
  );

  await fireEvent.press(view.getByTestId('report-filter-dailyuse'));
  expect(selected).toHaveBeenCalledWith('dailyuse');
  expect(view.getByTestId('report-filter-dailyuse').props.accessibilityRole).toBe('button');
});
