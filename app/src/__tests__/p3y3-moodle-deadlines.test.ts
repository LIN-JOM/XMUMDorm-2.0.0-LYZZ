import { partitionMoodleDeadlines, planMoodleDeadlineReminders } from '@/features/tools/moodle/deadlines';
import type { MoodleActionEvent, MoodleStateResponse } from '@/features/tools/moodle/contract';

const now = Date.parse('2026-10-11T00:00:00Z');
const modules = [101, 102, 103, 104].map((id) => ({ id, sectionId: 1, type: 'assign', name: `Task ${id}`,
  url: `https://l.xmu.edu.my/mod/assign/view.php?id=${id}`, visible: true, userVisible: true, accessVisible: true,
  restrictions: false, completion: null }));
const states: MoodleStateResponse[] = [{ courseId: 1, sections: [], modules }];
const event = (id: number, moduleId: number, time: number): MoodleActionEvent => ({ id, courseId: 1,
  eventType: 'due', action: { name: 'Submit', itemCount: 1, actionable: true }, moduleId: 900 + moduleId, name: `Deadline ${id}`, time, url: modules.find((item) => item.id === moduleId)?.url ?? null });

it('p3y3 separates valid past unset and implausibly distant times', () => {
  const events = [event(1, 101, Date.parse('2026-10-12T01:00:00Z') / 1000),
    event(2, 102, now / 1000 - 1), event(3, 103, 0), event(4, 104, now / 1000 + 367 * 86400)];
  const buckets = partitionMoodleDeadlines(states, events, now);
  expect(buckets.valid.map((item) => item.event.id)).toEqual([1]);
  expect(buckets.past.map((item) => item.event.id)).toEqual([2]);
  expect(buckets.unset.map((item) => item.module.id)).toEqual([103]);
  expect(buckets.futureAnomalies.map((item) => item.event.id)).toEqual([4]);
  expect(planMoodleDeadlineReminders(buckets, now)).toEqual([{ id: 'moodle:1:1', fireAt: Date.parse('2026-10-12T00:30:00Z') }]);
});

it('p3y3 makes protection values configurable and avoids past reminder triggers', () => {
  const events = [event(1, 101, now / 1000 + 20 * 86400), event(2, 102, now / 1000 + 5 * 60)];
  const buckets = partitionMoodleDeadlines(states, events, now, { maxFutureDays: 10 });
  expect(buckets.futureAnomalies.map((item) => item.event.id)).toEqual([1]);
  expect(planMoodleDeadlineReminders(buckets, now)).toEqual([]);
  expect(planMoodleDeadlineReminders(buckets, now, { leadMinutes: 1 }))
    .toEqual([{ id: 'moodle:1:2', fireAt: now + 4 * 60000 }]);
});

it('p3y3 keeps non-deadline modules out of the unset bucket', () => {
  const mixed = [
    { ...modules[0], id: 201, type: 'forum', name: 'Forum', url: 'https://l.xmu.edu.my/mod/forum/view.php?id=201' },
    { ...modules[0], id: 202, type: 'resource', name: 'Notes', url: 'https://l.xmu.edu.my/mod/resource/view.php?id=202' },
    { ...modules[0], id: 203, type: 'assign', name: 'No deadline assignment' },
    { ...modules[0], id: 204, type: 'quiz', name: 'No deadline quiz', url: 'https://l.xmu.edu.my/mod/quiz/view.php?id=204' },
  ];
  const buckets = partitionMoodleDeadlines([{ courseId: 1, sections: [], modules: mixed }], [], now);
  expect(buckets.unset.map((item) => item.module.id)).toEqual([203, 204]);
});

it('p3y3 excludes inaccessible unselected and unresolved module events', () => {
  const protectedStates = [{ ...states[0], modules: modules.map((item) => ({ ...item, userVisible: item.id !== 101 })) }];
  const buckets = partitionMoodleDeadlines(protectedStates,
    [event(1, 101, now / 1000 + 86400), { ...event(2, 102, now / 1000 + 86400), courseId: 2 },
      { ...event(3, 103, now / 1000 + 86400), url: null }], now);
  expect(buckets.valid).toEqual([]);
  expect(planMoodleDeadlineReminders(buckets, now)).toEqual([]);
});
