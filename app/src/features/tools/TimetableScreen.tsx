import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { clampWeek, currentTeachingWeek, FALLBACK_TOTAL_WEEKS } from '../../../../shared/config/semesters';
import { getScheduleWeek } from '../../../../shared/api/schedule';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/design-system/theme';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { useI18n } from '@/i18n';
import { timetableIdentity } from './cacheIdentity';
import { shouldHighlightToday, todayWeekday, useTimetableWeek, weekHasMeetings, type TimetableMeeting, type TimetableWeek } from './timetable';
import { toToolsError } from './requestError';
import { courseAccent, VISIBLE_WEEKDAYS, weekdayTimetableWeek, type CourseAccent } from './timetableView';

export type TimetableRenderProps = {
  week: TimetableWeek;
  visibleWeekdays: readonly number[];
  getCourseAccent: (meeting: TimetableMeeting) => CourseAccent;
  highlightWeekday: number | null;
  onPressMeeting: (meeting: TimetableMeeting) => void;
  testID: string;
};

function WeekNumbers({ value, totalWeeks, onChange }: { value: number; totalWeeks: number; onChange: (value: number) => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const scroll = React.useRef<ScrollView>(null);
  const offsets = React.useRef<Record<number, number>>({});
  React.useEffect(() => {
    const x = offsets.current[value];
    if (x !== undefined) scroll.current?.scrollTo({ x, animated: !theme.reduceMotion });
  }, [value, theme.reduceMotion]);
  return <ScrollView testID="timetable-week-numbers" ref={scroll} horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: theme.space('space_1') }}>
    {Array.from({ length: totalWeeks }, (_, index) => index + 1).map((week) => <View key={week}
      onLayout={(event) => {
        const x = event.nativeEvent.layout.x;
        offsets.current[week] = x;
        if (week === value) scroll.current?.scrollTo({ x, animated: !theme.reduceMotion });
      }}>
      <Pressable testID={`week-number-${week}`} accessibilityLabel={t('timetable.weekLabel', { n: week })}
        selected={week === value} onPress={() => onChange(week)}>
        <Text role="label" emphasis={week === value ? 'strong' : 'regular'} colorToken={week === value ? 'text-brand' : 'text-secondary'}>{String(week)}</Text>
      </Pressable>
    </View>)}
  </ScrollView>;
}

/** The navigation/UI owner supplies the existing P11 renderer with its extended inputs. */
export function TimetableScreen({ renderGrid }: { renderGrid: (props: TimetableRenderProps) => React.ReactNode }): React.ReactElement {
  useSession();
  return <OwnedTimetableScreen key={timetableIdentity().epoch} renderGrid={renderGrid} />;
}

function OwnedTimetableScreen({ renderGrid }: { renderGrid: (props: TimetableRenderProps) => React.ReactNode }): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const badge = useMailboxBadge();
  const session = useSession();
  const toast = useToast();
  const [week, setWeek] = React.useState(() => clampWeek(currentTeachingWeek() ?? 1));
  const timetable = useTimetableWeek(week, async (target) => {
    const owner = timetableIdentity().epoch;
    try { return await getScheduleWeek(target); }
    catch (error) {
      if (owner !== timetableIdentity().epoch) throw error;
      throw toToolsError(error, await session.handleAuthFailure(error));
    }
  });
  const shown = timetable.week ? weekdayTimetableWeek(timetable.week) : null;
  const hasData = shown !== null && weekHasMeetings(shown);
  const totalWeeks = shown?.totalWeeks ?? FALLBACK_TOTAL_WEEKS;
  const highlight = shouldHighlightToday(week, shown?.currentWeek ?? null) ? todayWeekday() : null;
  return <Screen titleKey="tools.timetable" bottomMode="own" testID="screen-phase3-timetable" {...badge}>
    <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_3') }}>
      <View><WeekNumbers value={week} totalWeeks={totalWeeks} onChange={setWeek} /></View>
      {timetable.source === 'cache' ? <OfflineBanner testID="timetable-stale" variant="stale" message={t('timetable.stale')} actionLabel={t('action.refresh')} onAction={timetable.reload} /> : null}
      {timetable.loading && !shown ? <LoadingState testID="timetable-loading" /> : timetable.error && !shown ?
        <ErrorState testID="timetable-error" error={timetable.error} onAction={timetable.reload} /> : !shown || !weekHasMeetings(shown) ?
          <EmptyState testID="timetable-empty" kind="firstRun" title={t('timetable.empty')} actionLabel={t('import.title')} onAction={() => router.push('/tools/schedule-import')} /> :
          <View style={{ flex: 1 }}>{renderGrid({ week: shown, visibleWeekdays: VISIBLE_WEEKDAYS,
            getCourseAccent: courseAccent, highlightWeekday: highlight, testID: 'timetable-grid',
            onPressMeeting: (meeting) => toast.show({ message: t('timetable.courseInfo', {
              name: meeting.courseName ?? meeting.courseCode, when: [meeting.startTime, meeting.endTime].filter(Boolean).join('-'), venue: meeting.venue ?? '',
            }), tone: 'info' }),
          })}</View>}
      {hasData ? <InlineNotice tone="info" message={t('timetable.importHint')} actionLabel={t('import.title')} onAction={() => router.push('/tools/schedule-import')} /> : null}
      <Button label={t('action.refresh')} variant="ghost" onPress={timetable.reload} />
      <Text role="caption" colorToken="text-muted">{t('timetable.semesterNote')}</Text>
    </View>
  </Screen>;
}
