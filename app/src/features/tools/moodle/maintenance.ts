/**
 * Moodle 维护窗口（审计 P-7 / D-7）
 *
 * 设计文档：每日 03:00–04:30 马来西亚时间显示维护状态，不把失败写成空数据。
 * 判定固定用学校时区（吉隆坡，UTC+8，无夏令时），设备时区不参与。
 */
import { KL_TIME_ZONE } from '../../../../../shared/config/semesters';

const START_MINUTES = 3 * 60;
const END_MINUTES = 4 * 60 + 30;

export function isMoodleMaintenanceWindow(now: number): boolean {
  if (!Number.isFinite(now)) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now));
  let hour = Number.NaN;
  let minute = Number.NaN;
  for (const part of parts) {
    if (part.type === 'hour') hour = Number(part.value);
    else if (part.type === 'minute') minute = Number(part.value);
  }
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const minutes = hour * 60 + minute;
  return minutes >= START_MINUTES && minutes < END_MINUTES;
}
