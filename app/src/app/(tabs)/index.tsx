import * as React from 'react';
import { SquareHome } from '@/features/square/SquareHome';
import { TAB_BAR_CLEARANCE } from './_layout';

export default function SquareScreen(): React.ReactElement {
  return <SquareHome tabBarHeight={TAB_BAR_CLEARANCE} />;
}
