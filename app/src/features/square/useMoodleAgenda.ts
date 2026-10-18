/**
 * Moodle「今日待交」的读缓存 hook —— 只读本地快照，**不发网络请求**。
 *
 * 为什么要订阅：Moodle 的数据由 `system/moodle` 的 WebView 同步写进缓存
 * （`features/tools/moodle/cache.ts`）。学生从系统页返回广场时，今日页必须自己变新，
 * ⛔ 不能靠"重新进页面"才刷新。
 *
 * ⚠️ 冷启动缓存为空是**设计**（Y0 隐私口径：磁盘恢复要求当前页面已确认校方账号），
 *    所以 `synced:false` 是合法状态，UI 显示"打开 Moodle 同步"入口即可。
 */

import * as React from 'react';

import { agendaDeadlines, type AgendaDeadline } from './todayAgenda';
import { readMoodleCache, subscribeMoodleInvalidation } from '@/features/tools/moodle/cache';

export type MoodleAgenda = {
  /** 是否已同步过（缓存里有课程）；false = 需要学生打开 Moodle 页同步 */
  synced: boolean;
  deadlines: readonly AgendaDeadline[];
};

function snapshot(nowMs: number): MoodleAgenda {
  const cache = readMoodleCache();
  return {
    synced: cache.courses.length > 0,
    deadlines: agendaDeadlines(cache.states, cache.events, cache.courses, nowMs),
  };
}

export function useMoodleAgenda(nowMs: number): MoodleAgenda {
  const read = React.useCallback(() => snapshot(nowMs), [nowMs]);
  const [agenda, setAgenda] = React.useState<MoodleAgenda>(read);

  React.useEffect(() => {
    // 先读一次：缓存在本组件挂载前就已写入（如同步后立刻回到广场）时不会漏。
    setAgenda(read());
    return subscribeMoodleInvalidation(() => setAgenda(read()));
  }, [read]);

  return agenda;
}
