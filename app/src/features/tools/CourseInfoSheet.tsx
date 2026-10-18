/**
 * 课程详情半屏弹窗（`T-02` 课表页）
 *
 * 所有者 2026-10-18：「点击这个卡片，下方会弹起弹窗半页面，展示所有的这门课的信息」。
 *
 * 分工：
 *   - 容器是 `O06 BottomSheet`（遮罩 / 关闭 / 半屏 / insets 都是它的事）；
 *   - 本文件只负责**课程字段怎么排**；数据全部来自已加载的本周课表，⛔ 不新增取数。
 *
 * 字段口径（`TimetableMeeting` 能给的就这些，⛔ 不编造没有的字段）：
 *   课程名称 · 课程码 · 上课地点 · 上课时间 · 星期 · 授课教师 · 学分 · 本周安排（该课本周所有时段）。
 * 缺字段显示"未标注 / 地点待定"，⛔ 不让 `null` 漏到界面上。
 */

import * as React from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n, type MessageKey } from '@/i18n';
import { formatClockTime } from '@/features/me/dashboard';
import type { TimetableMeeting } from './timetable';
import type { CourseAccent } from './timetableView';

export type CourseInfoSheetProps = {
  /** 选中课程的一段；`null` = 关闭 */
  meeting: TimetableMeeting | null;
  /** 同一课程本周的所有时段（含选中的这段） */
  occurrences: readonly TimetableMeeting[];
  /** 课程色（与卡片一致） */
  accent: CourseAccent;
  onClose: () => void;
  /** 底部安全区（由宿主从 Screen 取；⛔ 本文件不自读 insets） */
  bottomInset?: number;
  testID?: string;
};

function InfoRow({ label, value, testID }: { label: string; value: string; testID: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space('space_3') }}>
      <View style={{ width: theme.space('space_12') }}>
        <Text role="caption" colorToken="text-muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text role="body" colorToken="text-primary" testID={testID}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function CourseInfoSheet({
  meeting,
  occurrences,
  accent,
  onClose,
  bottomInset = 0,
  testID = 'course-sheet',
}: CourseInfoSheetProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();

  if (meeting === null) {
    return (
      <BottomSheet visible={false} onClose={onClose} closeLabel={t('action.close')} testID={testID}>
        <View />
      </BottomSheet>
    );
  }

  const name = meeting.courseName ?? meeting.courseCode;
  const code = meeting.courseCode;
  const venue = meeting.venue ?? t('timetable.noVenue');
  const start = formatClockTime(meeting.startTime);
  const end = formatClockTime(meeting.endTime);
  const time = [start, end].filter(Boolean).join('–');
  const weekday = meeting.dayOfWeek >= 1 && meeting.dayOfWeek <= 7
    ? t(`weekday.${meeting.dayOfWeek}` as MessageKey)
    : t('timetable.sheet.unknown');
  const lecturer = meeting.lecturer ?? t('timetable.sheet.unknown');
  const credit = meeting.credit === null ? t('timetable.sheet.unknown') : String(meeting.credit);

  return (
    <BottomSheet
      visible
      onClose={onClose}
      closeLabel={t('action.close')}
      bottomInset={bottomInset}
      title={name}
      testID={testID}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_2'),
        }}
      >
        {/* 课程身份色：与卡片同色，让人一眼认出"点的是哪门课" */}
        <View
          style={{
            width: theme.space('space_8'),
            height: theme.space('space_1'),
            borderRadius: theme.radius('radius_full'),
            backgroundColor: theme.color[accent.fill].value,
          }}
        />
        <Text role="body" colorToken={accent.text} testID={`${testID}-code`}>
          {code}
        </Text>
      </View>

      <View style={{ gap: theme.space('space_3') }}>
        <InfoRow label={t('timetable.sheet.venue')} value={venue} testID={`${testID}-venue`} />
        <InfoRow label={t('timetable.sheet.time')} value={time} testID={`${testID}-time`} />
        <InfoRow label={t('timetable.sheet.weekday')} value={weekday} testID={`${testID}-weekday`} />
        <InfoRow label={t('timetable.sheet.lecturer')} value={lecturer} testID={`${testID}-lecturer`} />
        <InfoRow label={t('timetable.sheet.credit')} value={credit} testID={`${testID}-credit`} />
      </View>

      <View style={{ gap: theme.space('space_2') }}>
        <Text role="label" emphasis="strong" colorToken="text-primary">
          {t('timetable.sheet.occurrences')}
        </Text>
        {occurrences.map((item, index) => {
          const itemStart = formatClockTime(item.startTime);
          const itemEnd = formatClockTime(item.endTime);
          const when = [itemStart, itemEnd].filter(Boolean).join('–');
          const day = item.dayOfWeek >= 1 && item.dayOfWeek <= 7
            ? t(`weekday.${item.dayOfWeek}` as MessageKey)
            : t('timetable.sheet.unknown');
          return (
            <View
              key={`${item.dayOfWeek}-${item.startTime ?? ''}-${item.venue ?? ''}-${index}`}
              testID={`${testID}-occurrence-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.space('space_2'),
                paddingVertical: theme.space('space_2'),
                paddingHorizontal: theme.space('space_3'),
                borderRadius: theme.radius('radius_medium'),
                backgroundColor: theme.color['bg-sunken'].value,
              }}
            >
              <Text role="body" colorToken="text-primary" numberOfLines={1} style={{ flexShrink: 0 }}>
                {day}
              </Text>
              <Text role="body" colorToken="text-secondary" numberOfLines={1} style={{ flex: 1 }}>
                {when}
              </Text>
              <Text role="caption" colorToken="text-secondary" numberOfLines={1} style={{ maxWidth: '38%' }}>
                {item.venue ?? t('timetable.noVenue')}
              </Text>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
