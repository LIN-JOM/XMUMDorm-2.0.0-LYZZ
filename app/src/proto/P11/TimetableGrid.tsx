/**
 * `P11` 课表网格 —— 原型骨架（组件定义 §2.7）
 *
 * §2.7 对它的定义：**星期 × 节次**；交互契约：**周切换、今天高亮、课程卡点击、导入入口**
 * （`D15 TimetableGrid` 已降为本骨架的**渲染器**）。
 *
 * 2026-10-18 所有者重做：卡片必须**同时显示课程名称与上课地点**，并按**课程色**填充
 * （同课同色 / 异课异色，色板与分配规则在 `features/tools/timetableView.ts`）。
 *
 * ⚠️ **"节次"落地为"开始时间"**：接口（`GET /schedule/week`）只给
 *   `start_time`/`end_time`，**没有节次编号也没有节次表** → 行键用开始时间，
 *   ⛔ 不去猜"第几节"（那会凭记忆造一张节次表）。已登记 README §7-12。
 *
 * ⛔ 组件内不写业务文案（星期与提示由页面传词条）；本文件只负责"怎么摆"。
 */

import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { MessageKey } from '@/i18n/zh';
import { buildTimetableRows, type TimetableMeeting, type TimetableWeek } from '@/features/tools/timetable';
import {
  FALLBACK_COURSE_ACCENT,
  VISIBLE_WEEKDAYS,
  type CourseAccent,
} from '@/features/tools/timetableView';

export const PROTO_ID = 'P11' as const;

/** 星期列头（`weekday.1..7` 词条） */
const WEEKDAY_KEYS: readonly MessageKey[] = [
  'weekday.1',
  'weekday.2',
  'weekday.3',
  'weekday.4',
  'weekday.5',
  'weekday.6',
  'weekday.7',
];

export type TimetableGridProps = {
  week: TimetableWeek;
  /** 显示哪几列（默认周一–周五） */
  visibleWeekdays?: readonly number[];
  /** 课程 → 课程色（由页面按本周分配；缺省时用兜底色） */
  getCourseAccent?: (meeting: TimetableMeeting) => CourseAccent;
  /** 高亮哪一列（`1..7`）；`null` = 不高亮（例如用户翻到了别的周） */
  highlightWeekday?: number | null;
  onPressMeeting?: (meeting: TimetableMeeting) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function TimetableGrid({
  week,
  visibleWeekdays = VISIBLE_WEEKDAYS,
  getCourseAccent,
  highlightWeekday = null,
  onPressMeeting,
  style,
  testID,
}: TimetableGridProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const rows = buildTimetableRows(week.days);
  const timeColumnWidth = theme.space('space_8');
  const resolveAccent = getCourseAccent ?? (() => FALLBACK_COURSE_ACCENT);

  return (
    <ScrollView
      style={style}
      testID={testID}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: theme.space('space_4') }}
    >
      <View>
        {/* 表头：星期（今天那一列**文字加粗 + 底色**，⛔ 不只靠颜色） */}
        <View style={{ flexDirection: 'row', gap: theme.space('space_1') }}>
          <View style={{ width: timeColumnWidth }} />
          {visibleWeekdays.map((day) => {
            const isToday = highlightWeekday === day;
            return (
              <View
                key={day}
                testID={testID ? `${testID}-head-${day}` : undefined}
                style={{
                  flex: 1,
                  paddingVertical: theme.space('space_1'),
                  alignItems: 'center',
                  backgroundColor: isToday
                    ? theme.color['bg-brand-soft'].value
                    : theme.color['bg-sunken'].value,
                  borderRadius: theme.radius('radius_small'),
                }}
              >
                <Text
                  role="caption"
                  emphasis={isToday ? 'strong' : 'regular'}
                  colorToken={isToday ? 'text-brand' : 'text-secondary'}
                  numberOfLines={1}
                >
                  {t(WEEKDAY_KEYS[day - 1])}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 行：开始时间 + 每天一列；同一格多门课纵向堆叠 */}
        {rows.map((row) => (
          <View
            key={row.startTime}
            style={{ flexDirection: 'row', gap: theme.space('space_1'), marginTop: theme.space('space_1') }}
            testID={testID ? `${testID}-row-${row.startTime}` : undefined}
          >
            <View style={{ width: timeColumnWidth, paddingTop: theme.space('space_1') }}>
              <Text role="caption" colorToken="text-muted" numberOfLines={1}>
                {row.startTime}
              </Text>
            </View>
            {visibleWeekdays.map((day) => {
              const cell = row.cells[day] ?? [];
              return (
                <View key={`${row.startTime}-${day}`} style={{ flex: 1, gap: theme.space('space_1') }}>
                  {cell.map((meeting) => {
                    const accent = resolveAccent(meeting);
                    const name = meeting.courseName ?? meeting.courseCode;
                    const venue = meeting.venue ?? t('timetable.noVenue');
                    return (
                      <Pressable
                        key={`${meeting.courseCode}-${meeting.startTime ?? ''}-${meeting.venue ?? ''}`}
                        testID={testID ? `${testID}-card-${meeting.courseCode}` : undefined}
                        onPress={
                          onPressMeeting === undefined ? undefined : () => onPressMeeting(meeting)
                        }
                        disabled={onPressMeeting === undefined}
                        accessibilityRole="button"
                        accessibilityLabel={[name, venue, row.startTime].filter(Boolean).join('，')}
                        style={{
                          borderRadius: theme.radius('radius_small'),
                          backgroundColor: theme.color[accent.fill].value,
                          padding: theme.space('space_1'),
                          gap: theme.space('space_1'),
                        }}
                      >
                        <Text role="caption" emphasis="strong" colorToken={accent.text} numberOfLines={2}>
                          {name}
                        </Text>
                        <Text role="caption" colorToken="text-secondary" numberOfLines={1}>
                          {venue}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
