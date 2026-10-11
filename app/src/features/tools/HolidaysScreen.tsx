import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ALL_HOLIDAYS } from '../../../../shared/config/holidays';
import { kualaLumpurCalendarParts } from '../../../../shared/config/semesters';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { useI18n } from '@/i18n';

export function upcomingSchoolHolidays(now: Date) {
  const day = kualaLumpurCalendarParts(now).ymd;
  return ALL_HOLIDAYS.filter((holiday) => holiday.end >= day).sort((a, b) => a.start.localeCompare(b.start));
}

export function HolidaysContent({ now, onBack }: { now: Date; onBack: () => void }): React.ReactElement {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const holidays = upcomingSchoolHolidays(now);
  return <View testID="tools-holidays-content" style={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
    <Button testID="tools-holidays-back" label={t('action.back')} variant="ghost" onPress={onBack} />
    <SectionHeader title={t('tools.dashboard.holiday')} />
    {holidays.length === 0 ? <Text role="body" colorToken="text-secondary">{t('tools.dashboard.noHoliday')}</Text> :
      holidays.map((holiday) => <View key={holiday.id} testID={`holiday-${holiday.id}`} style={{ paddingVertical: theme.space('space_2') }}>
        <Text role="body">{t('tools.dashboard.holidayLine', { name: { zh: holiday.nameZh, en: holiday.nameEn }[locale], start: holiday.start, end: holiday.end })}</Text>
      </View>)}
  </View>;
}

/** Exported for an optional standalone route; the dashboard already opens the same content locally. */
export function HolidaysScreen(): React.ReactElement {
  const badge = useMailboxBadge();
  const router = useRouter();
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const onBack = React.useCallback(() => router.canGoBack() ? router.back() : router.replace('/tools'), [router]);
  return <Screen titleKey="tools.dashboard.holiday" bottomMode="own" scroll testID="screen-holidays" {...badge}>
    <HolidaysContent now={now} onBack={onBack} />
  </Screen>;
}
