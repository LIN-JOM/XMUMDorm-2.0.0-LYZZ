/**
 * Moodle 状态词条映射（审计 P-5 / D-5）
 *
 * 领域层只吐机器值（`loading-courses`、`future-anomaly`、`assign`…）。
 * 本模块把它们映射成词条 key，再交给唯一 `t`；未知值一律落「其他」，⛔ 不原样透出。
 * 新增机器值时，同时补 zh / en 两条词条（`p0-03` 会检查两侧 key 数一致）。
 */
import type { MessageKey } from '@/i18n';

export type MoodleStatusTranslator = (key: MessageKey) => string;

const OTHER: MessageKey = 'tools.moodle.value.other';

const PHASE: Record<string, MessageKey> = {
  'idle': 'tools.moodle.value.phase.idle',
  'loading-courses': 'tools.moodle.value.phase.loadingCourses',
  'choosing': 'tools.moodle.value.phase.choosing',
  'loading-objects': 'tools.moodle.value.phase.loadingObjects',
  'ready': 'tools.moodle.value.phase.ready',
  'error': 'tools.moodle.value.phase.error',
};

const FAILURE: Record<string, MessageKey> = {
  'expired': 'tools.moodle.value.failure.expired',
  'denied': 'tools.moodle.value.failure.denied',
  'unavailable': 'tools.moodle.value.failure.unavailable',
  'invalid-data': 'tools.moodle.value.failure.invalidData',
  'timeout': 'tools.moodle.value.failure.timeout',
  'wrong-origin': 'tools.moodle.value.failure.wrongOrigin',
  'redirect-blocked': 'tools.moodle.value.failure.redirectBlocked',
};

const BUCKET: Record<string, MessageKey> = {
  'valid': 'tools.moodle.value.bucket.valid',
  'past': 'tools.moodle.value.bucket.past',
  'unset': 'tools.moodle.value.bucket.unset',
  'future-anomaly': 'tools.moodle.value.bucket.futureAnomaly',
};

const MODULE_TYPE: Record<string, MessageKey> = {
  'assign': 'tools.moodle.value.moduleType.assign',
  'forum': 'tools.moodle.value.moduleType.forum',
  'quiz': 'tools.moodle.value.moduleType.quiz',
  'resource': 'tools.moodle.value.moduleType.resource',
  'folder': 'tools.moodle.value.moduleType.folder',
  'url': 'tools.moodle.value.moduleType.url',
  'page': 'tools.moodle.value.moduleType.page',
  'choice': 'tools.moodle.value.moduleType.choice',
  'mediasite': 'tools.moodle.value.moduleType.mediasite',
  'chat': 'tools.moodle.value.moduleType.chat',
  'label': 'tools.moodle.value.moduleType.label',
};

const EVENT_TYPE: Record<string, MessageKey> = {
  'due': 'tools.moodle.value.eventType.due',
  'close': 'tools.moodle.value.eventType.close',
  'expectcompletionon': 'tools.moodle.value.eventType.expectcompletionon',
  'open': 'tools.moodle.value.eventType.open',
  'gradingdue': 'tools.moodle.value.eventType.gradingDue',
};

const SUBMISSION: Record<string, MessageKey> = {
  'submitted': 'tools.moodle.value.submission.submitted',
  'draft': 'tools.moodle.value.submission.draft',
  'reopened': 'tools.moodle.value.submission.reopened',
  'unknown': 'tools.moodle.value.submission.unknown',
};

const GRADING: Record<string, MessageKey> = {
  'graded': 'tools.moodle.value.grading.graded',
  'not-graded': 'tools.moodle.value.grading.notGraded',
  'unknown': 'tools.moodle.value.grading.unknown',
};

export type MoodleStatusLabels = {
  phase: (value: string) => string;
  failure: (value: string | null) => string;
  moduleType: (value: string) => string;
  eventType: (value: string | null) => string;
  actionableStatus: (value: boolean | null) => string;
  deadlineBucket: (value: string) => string;
  detailStatus: (value: string) => string;
  submissionStatus: (value: string) => string;
  gradingStatus: (value: string) => string;
};

export function moodleStatusLabels(t: MoodleStatusTranslator): MoodleStatusLabels {
  const pick = (map: Record<string, MessageKey>, value: string | null | undefined): string =>
    t((value !== null && value !== undefined && map[value]) || OTHER);
  return {
    phase: (value) => pick(PHASE, value),
    failure: (value) => pick(FAILURE, value),
    moduleType: (value) => pick(MODULE_TYPE, value),
    eventType: (value) => pick(EVENT_TYPE, value),
    actionableStatus: (value) => value === true
      ? t('tools.moodle.value.actionable.true')
      : value === false ? t('tools.moodle.value.actionable.false') : t(OTHER),
    deadlineBucket: (value) => pick(BUCKET, value),
    detailStatus: (value) => value === 'loading'
      ? t('tools.moodle.value.detail.loading') : pick(FAILURE, value),
    submissionStatus: (value) => pick(SUBMISSION, value),
    gradingStatus: (value) => pick(GRADING, value),
  };
}
