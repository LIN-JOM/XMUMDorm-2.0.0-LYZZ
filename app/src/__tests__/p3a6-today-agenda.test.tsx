/**
 * P3A6 · 广场「今日」页的数据规则
 *
 * 依据：`docs/app/task/广场今日页/T1-今日数据与纯逻辑.md`
 *   · 今日课表 = 教学周内、当天**全部**课程（教学周外为空）；
 *   · Moodle 待交 = 缓存里未过期 DDL 的前 3 条（升序）；
 *   · 截止时间按**吉隆坡**时区判"今天 / 明天 / 其它"。
 */
import * as React from 'react';
import { act } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { Text } from '@/components/ui/Text';
import { agendaCourses, agendaDeadlines, deadlineWhen } from '@/features/square/todayAgenda';
import { useMoodleAgenda } from '@/features/square/useMoodleAgenda';
import {
  clearMoodleCache,
  moodleCacheGeneration,
  readMoodleCache,
  selectMoodleCourses,
  writeMoodleCache,
} from '@/features/tools/moodle/cache';
import type {
  MoodleActionEvent,
  MoodleStateResponse,
} from '@/features/tools/moodle/contract';
import type { TimetableMeeting, TimetableWeek } from '@/features/tools/timetable';

/** 2026-10-19 是周一；01:00Z = 吉隆坡 09:00 */
const MONDAY_9AM = Date.parse('2026-10-19T01:00:00Z');
const SUNDAY_2157 = Date.parse('2026-10-18T13:57:00Z');

function meeting(startTime: string, courseCode: string): TimetableMeeting {
  return {
    courseCode,
    courseName: courseCode,
    credit: 3,
    lecturer: null,
    dayOfWeek: 1,
    startTime,
    endTime: startTime,
    venue: 'A101',
  };
}

function weekOf(currentWeek: number | null, monday: readonly TimetableMeeting[]): TimetableWeek {
  return { week: 7, days: { 1: monday }, currentWeek, totalWeeks: 20 };
}

const modules = [101, 102, 103, 104].map((id) => ({
  id,
  sectionId: 1,
  type: 'assign',
  name: `Task ${id}`,
  url: `https://l.xmu.edu.my/mod/assign/view.php?id=${id}`,
  visible: true,
  userVisible: true,
  accessVisible: true,
}));

const states: MoodleStateResponse[] = [
  { courseId: 1, sections: [{ id: 1, number: 1, title: 'Week 1', moduleIds: [101, 102, 103, 104] }], modules },
];

function eventAt(id: number, moduleId: number, dueAt: number): MoodleActionEvent {
  const module = modules.find((item) => item.id === moduleId);
  return {
    id,
    courseId: 1,
    eventType: 'due',
    action: { name: 'Submit', itemCount: 1, actionable: true },
    moduleId: module?.id ?? null,
    name: `Deadline ${id}`,
    time: Math.floor(dueAt / 1000),
    url: module?.url ?? null,
  };
}

describe('P3A6 今日数据规则', () => {
  afterEach(() => {
    clearMoodleCache();
  });

  it('今日课表：教学周内返回当天全部课程，按开始时间升序', () => {
    const week = weekOf(7, [meeting('10:00:00', 'CS102'), meeting('08:00:00', 'CS101')]);
    expect(agendaCourses(week, new Date(MONDAY_9AM)).map((item) => item.courseCode))
      .toEqual(['CS101', 'CS102']);
  });

  it('今日课表：教学周外（currentWeek=null）为空，不拿第 1 周冒充今天', () => {
    const week = weekOf(null, [meeting('08:00:00', 'CS101')]);
    expect(agendaCourses(week, new Date(MONDAY_9AM))).toEqual([]);
    expect(agendaCourses(null, new Date(MONDAY_9AM))).toEqual([]);
  });

  it('Moodle 待交：只取最早 3 条、按 DDL 升序、带课程名', () => {
    const events = [
      eventAt(1, 101, SUNDAY_2157 + 3600_000),
      eventAt(2, 102, SUNDAY_2157 + 5 * 86400_000),
      eventAt(3, 103, SUNDAY_2157 + 2 * 86400_000),
      eventAt(4, 104, SUNDAY_2157 + 3 * 86400_000),
    ];
    const courses = [{ id: 1, name: 'Algorithms', shortName: 'ALG', url: null, startDate: null, endDate: null, visible: true }];
    const deadlines = agendaDeadlines(states, events, courses, SUNDAY_2157);
    expect(deadlines).toHaveLength(3);
    expect(deadlines.map((item) => item.dueAt)).toEqual([
      SUNDAY_2157 + 3600_000,
      SUNDAY_2157 + 2 * 86400_000,
      SUNDAY_2157 + 3 * 86400_000,
    ]);
    expect(deadlines.every((item) => item.courseName === 'Algorithms')).toBe(true);
  });

  it('截止时间：吉隆坡日历日决定"明天"，时钟为 HH:mm', () => {
    expect(deadlineWhen(SUNDAY_2157, Date.parse('2026-10-19T01:00:00Z'))).toEqual({
      kind: 'tomorrow',
      clock: '09:00',
      ymd: '2026-10-19',
    });
    expect(deadlineWhen(SUNDAY_2157, SUNDAY_2157 + 3600_000)).toMatchObject({ kind: 'today' });
    expect(deadlineWhen(SUNDAY_2157, Date.parse('2026-10-25T01:00:00Z'))).toMatchObject({ kind: 'later' });
  });

  it('useMoodleAgenda：读缓存，并在缓存被清空后自动变回未同步', async () => {
    const generation = moodleCacheGeneration();
    selectMoodleCourses([1]);
    const next = moodleCacheGeneration();
    writeMoodleCache('courses', {
      courses: [{ id: 1, name: 'Algorithms', shortName: 'ALG', url: null, startDate: null, endDate: null, visible: true }],
      nextOffset: 0,
    }, next);
    writeMoodleCache('state', states[0], next);
    writeMoodleCache('events', {
      events: [eventAt(1, 101, SUNDAY_2157 + 86400_000)],
      firstId: null,
      lastId: null,
    }, next);
    expect(next).not.toBe(generation);
    expect(readMoodleCache().courses).toHaveLength(1);

    function Probe(): React.ReactElement {
      const agenda = useMoodleAgenda(SUNDAY_2157);
      return <Text testID="probe">{`${agenda.synced ? 'synced' : 'unsynced'}:${agenda.deadlines.length}`}</Text>;
    }

    const view = await renderApp(<Probe />);
    expect(view.getByTestId('probe').props.children).toBe('synced:1');
    await act(async () => {
      clearMoodleCache();
    });
    expect(view.getByTestId('probe').props.children).toBe('unsynced:0');
  });
});
