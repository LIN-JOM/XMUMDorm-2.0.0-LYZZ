import * as React from 'react';
import { TimetableGrid } from '@/proto/P11';
import { TimetableScreen, type TimetableRenderProps } from '@/features/tools/TimetableScreen';

/** T-02 route owner: the feature supplies state; P11 remains the shared renderer. */
// The feature owns the fetch seam and calls session.handleAuthFailure for 401/403 responses.
export default function TimetableRoute(): React.ReactElement {
  return <TimetableScreen renderGrid={(props: TimetableRenderProps) => (
    <TimetableGrid
      testID={props.testID}
      week={props.week}
      visibleWeekdays={props.visibleWeekdays}
      getCourseAccent={props.getCourseAccent}
      highlightWeekday={props.highlightWeekday}
      onPressMeeting={props.onPressMeeting}
    />
  )} legacyControls />;
}
