/**
 * 「今日」pane 的课表取数接线（T3）
 *
 * 为什么单独一个文件：ToolsDashboard 里那 8 行「identity epoch + handleAuthFailure」的接线
 * 已经是**同一份语义**，今日页再抄一遍就会出现两份 401 处理。这里收成一处，页面只消费状态。
 *
 * 口径与 ToolsDashboard 完全一致：
 *   - 周次 = `currentTeachingWeek(now) ?? 1`（今天不在教学周时仍要能取到数据，
 *     但 `currentWeek === null` 由 `agendaCourses` 判成"今天没课"）；
 *   - 失败时先把错误交给会话层（401/403 会触发登出），再转成页面文案。
 */

import * as React from 'react';

import { getScheduleWeek } from '../../../../shared/api/schedule';
import { clampWeek, currentTeachingWeek } from '../../../../shared/config/semesters';
import { useSession } from '@/features/auth/session';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import { useTimetableWeek, type TimetableWeekState } from '@/features/tools/timetable';

export type TodayTimetableState = TimetableWeekState & { reload: () => void };

export function useTodayTimetable(now: Date): TodayTimetableState {
  const session = useSession();
  const targetWeek = clampWeek(currentTeachingWeek(now) ?? 1);

  const fetchWeek = React.useCallback(
    async (week: number) => {
      const owner = timetableIdentity().epoch;
      try {
        return await getScheduleWeek(week);
      } catch (error) {
        if (owner !== timetableIdentity().epoch) throw error;
        throw toToolsError(error, await session.handleAuthFailure(error));
      }
    },
    [session]
  );

  return useTimetableWeek(targetWeek, fetchWeek);
}
