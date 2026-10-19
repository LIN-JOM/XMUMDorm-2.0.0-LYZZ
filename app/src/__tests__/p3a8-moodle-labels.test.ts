/**
 * P3A8 · Moodle 状态词条（审计 P-5 / D-5）
 *
 * 现状：九类状态回调共用 `tools.moodle.status = '{value}'`，界面直出 `loading-courses`、
 * `future-anomaly`、`not actionable` 等内部码。期望：机器值映射成中文/英文短词，
 * 未知值落「其他」，界面不再出现内部码。
 */
import { en, zh } from '@/i18n';
import { moodleStatusLabels } from '@/features/tools/moodle/statusLabels';

const labelsZh = moodleStatusLabels((key) => zh[key]);
const labelsEn = moodleStatusLabels((key) => en[key]);

it('p3a8 status labels translate known machine values', () => {
  expect(labelsZh.phase('ready')).toBe('同步完成');
  expect(labelsZh.phase('loading-courses')).toBe('拉取课程');
  expect(labelsZh.failure('invalid-data')).toBe('数据异常');
  expect(labelsZh.deadlineBucket('future-anomaly')).toBe('远期异常');
  expect(labelsZh.eventType('due')).toBe('截止');
  expect(labelsZh.actionableStatus(true)).toBe('可操作');
  expect(labelsZh.actionableStatus(false)).toBe('不可操作');
  expect(labelsZh.detailStatus('redirect-blocked')).toBe('重定向已拦截');
  expect(labelsZh.submissionStatus('submitted')).toBe('已提交');
  expect(labelsZh.gradingStatus('not-graded')).toBe('未评分');
});

it('p3a8 status labels never leak machine identifiers', () => {
  expect(labelsZh.moduleType('tutorial')).toBe('其他');
  expect(labelsZh.moduleType('assign')).toBe('作业');
  expect(labelsZh.failure('not-a-real-value')).toBe('其他');
  expect(labelsZh.deadlineBucket('unknown-bucket')).toBe('其他');
  expect(labelsZh.phase('not-a-real-phase')).toBe('其他');
});

it('p3a8 status labels have an English set', () => {
  expect(labelsEn.phase('ready')).toBe('Synced');
  expect(labelsEn.moduleType('assign')).toBe('Assignment');
  expect(labelsEn.actionableStatus(true)).toBe('Actionable');
  expect(labelsEn.moduleType('tutorial')).toBe('Other');
});
