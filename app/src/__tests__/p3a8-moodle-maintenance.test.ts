/**
 * P3A8 · Moodle 维护窗口（审计 P-7 / D-7）
 *
 * 设计文档：每日 03:00–04:30（吉隆坡时间）显示维护状态，不把失败写成空数据。
 */
import { isMoodleMaintenanceWindow } from '@/features/tools/moodle/maintenance';

// 吉隆坡 = UTC+8，无夏令时；以下时刻的 UTC 表示是固定的。
const kl = (hour: number, minute: number, day = 19) => Date.parse(
  `2026-10-${String(day).padStart(2, '0')}T${String(hour - 8).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
);

it('p3a8 maintenance window follows Kuala Lumpur time', () => {
  expect(isMoodleMaintenanceWindow(kl(2, 59))).toBe(false);
  expect(isMoodleMaintenanceWindow(kl(3, 0))).toBe(true);
  expect(isMoodleMaintenanceWindow(kl(4, 29))).toBe(true);
  expect(isMoodleMaintenanceWindow(kl(4, 30))).toBe(false);
  expect(isMoodleMaintenanceWindow(kl(23, 0))).toBe(false);
});

it('p3a8 maintenance window rejects invalid instants', () => {
  expect(isMoodleMaintenanceWindow(Number.NaN)).toBe(false);
  expect(isMoodleMaintenanceWindow(Number.POSITIVE_INFINITY)).toBe(false);
});
