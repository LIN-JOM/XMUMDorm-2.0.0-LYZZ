import type { MoodleActionEvent, MoodleModule, MoodleStateResponse } from './contract';
import { safeMoodleReadUrl } from './detail';

/** Engineering guardrails, not a prediction of the school's term or assignment policy. */
export const MOODLE_DEADLINE_DEFAULTS = { maxFutureDays: 366, leadMinutes: 30 } as const;
export type MoodleDeadlinePolicy = { maxFutureDays?: number; leadMinutes?: number };
export type MoodleDeadline = { courseId: number; module: MoodleModule; event: MoodleActionEvent; dueAt: number };
export type MoodleDeadlineBuckets = { valid: MoodleDeadline[]; past: MoodleDeadline[];
  futureAnomalies: MoodleDeadline[]; unset: { courseId: number; module: MoodleModule }[] };
export type MoodleReminderPlan = { id: string; fireAt: number }[];

/** What the reminder adapter reports back after handing a plan to the OS scheduler. */
export type MoodleReminderDelivery = 'planned' | 'partial' | 'denied' | 'stale';

export function isMoodleDeadlineEvent(module: MoodleModule, event: MoodleActionEvent): boolean {
  return event.eventType === 'expectcompletionon'
    || (module.type === 'assign' && event.eventType === 'due')
    || (module.type === 'quiz' && event.eventType === 'close');
}

function configured(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Confirm both the selected course and exact safe module URL; never infer eligibility from event text. */
export function partitionMoodleDeadlines(states: readonly MoodleStateResponse[], events: readonly MoodleActionEvent[],
  now: number, policy: MoodleDeadlinePolicy = {}): MoodleDeadlineBuckets {
  const result: MoodleDeadlineBuckets = { valid: [], past: [], futureAnomalies: [], unset: [] };
  if (!Number.isFinite(now)) return result;
  const maximum = now + configured(policy.maxFutureDays, MOODLE_DEADLINE_DEFAULTS.maxFutureDays) * 86400000;
  for (const state of states) {
    for (const module of state.modules) {
      if (!module.visible || !module.userVisible || !module.url) continue;
      const url = safeMoodleReadUrl(module.url);
      if (!url) continue;
      const matching = events.filter((event) => event.courseId === state.courseId && event.url === url
        && isMoodleDeadlineEvent(module, event) && Number.isSafeInteger(event.time) && event.time > 0);
      if (matching.length === 0) { result.unset.push({ courseId: state.courseId, module: { ...module } }); continue; }
      for (const event of matching) {
        const dueAt = event.time * 1000;
        const deadline = { courseId: state.courseId, module: { ...module }, event: { ...event }, dueAt };
        if (!Number.isSafeInteger(dueAt) || !Number.isFinite(new Date(dueAt).getTime())) continue;
        if (dueAt <= now) result.past.push(deadline);
        else if (dueAt > maximum) result.futureAnomalies.push(deadline);
        else result.valid.push(deadline);
      }
    }
  }
  for (const rows of [result.valid, result.past, result.futureAnomalies]) rows.sort((left, right) => left.dueAt - right.dueAt);
  return result;
}

/** Millisecond triggers only. The injected device adapter owns permission and scheduling. */
export function planMoodleDeadlineReminders(buckets: MoodleDeadlineBuckets, now: number,
  policy: MoodleDeadlinePolicy = {}): MoodleReminderPlan {
  const lead = configured(policy.leadMinutes, MOODLE_DEADLINE_DEFAULTS.leadMinutes) * 60000;
  const planned = new Map<string, number>();
  for (const deadline of buckets.valid) {
    if (deadline.event.action?.actionable !== true) continue;
    const fireAt = deadline.dueAt - lead;
    if (!Number.isSafeInteger(fireAt) || fireAt <= now) continue;
    planned.set(`moodle:${deadline.courseId}:${deadline.event.id}`, fireAt);
  }
  return [...planned].map(([id, fireAt]) => ({ id, fireAt })).sort((left, right) => left.fireAt - right.fireAt);
}
