/**
 * P3A8 · 今日页失效广播（审计 P-8 / D-8）
 *
 * 同步写缓存曾只改数据、不发广播，今日页订阅收不到，最长要等 60 秒走表。
 * 现在「清缓存失效」与「数据变化」分成两条通道：WebView 只听前者，今日页听后者。
 */
import * as React from 'react';
import { act } from '@testing-library/react-native';

import { Text } from '@/components/ui/Text';
import {
  clearMoodleCache, moodleCacheGeneration, selectMoodleCourses, settleMoodleStorage,
  subscribeMoodleDataChanged, subscribeMoodleInvalidation, writeMoodleCache,
} from '@/features/tools/moodle/cache';
import { useMoodleAgenda } from '@/features/square/useMoodleAgenda';
import { renderApp } from './helpers/renderApp';

const NOW = Date.parse('2026-10-19T00:00:00Z');

beforeEach(async () => { clearMoodleCache(); await settleMoodleStorage(); });

it('p3a8 data changes are broadcast without the cache invalidation channel', async () => {
  const data = jest.fn();
  const invalid = jest.fn();
  const offData = subscribeMoodleDataChanged(data);
  const offInvalid = subscribeMoodleInvalidation(invalid);
  try {
    const generation = moodleCacheGeneration();
    writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course', visible: true }], nextOffset: 0 }, generation);
    expect(data).toHaveBeenCalledTimes(1);
    expect(invalid).not.toHaveBeenCalled();
    selectMoodleCourses([1]);
    expect(data).toHaveBeenCalledTimes(2);
    expect(invalid).not.toHaveBeenCalled();
  } finally { offData(); offInvalid(); }
});

it('p3a8 clearing the cache reports both channels', async () => {
  const data = jest.fn();
  const invalid = jest.fn();
  const offData = subscribeMoodleDataChanged(data);
  const offInvalid = subscribeMoodleInvalidation(invalid);
  try {
    clearMoodleCache();
    expect(data).toHaveBeenCalledTimes(1);
    expect(invalid).toHaveBeenCalledTimes(1);
  } finally { offData(); offInvalid(); }
});

it('p3a8 the today pane updates as soon as a sync writes the cache', async () => {
  function Probe(): React.ReactElement {
    const agenda = useMoodleAgenda(NOW);
    return <Text testID="probe">{`${agenda.synced ? 'synced' : 'unsynced'}:${agenda.deadlines.length}`}</Text>;
  }
  const view = await renderApp(<Probe />);
  expect(view.getByTestId('probe').props.children).toBe('unsynced:0');

  await act(async () => {
    const generation = moodleCacheGeneration();
    selectMoodleCourses([1]);
    writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course', visible: true }], nextOffset: 0 },
      moodleCacheGeneration());
    writeMoodleCache('state', { courseId: 1, sections: [{ id: 1, number: 1, title: 'Week 1',
      moduleIds: [101], url: null, visible: true, current: false }], modules: [{ id: 101, sectionId: 1,
      type: 'assign', name: 'Homework', url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101',
      visible: true, userVisible: true, accessVisible: true, restrictions: false, completion: null }] },
    moodleCacheGeneration());
    writeMoodleCache('events', { events: [{ id: 5, courseId: 1, moduleId: 101, name: 'Deadline',
      time: Math.floor((NOW + 86400_000) / 1000), eventType: 'expectcompletionon',
      url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101',
      action: { name: 'Open', itemCount: 1, actionable: true } }], firstId: 5, lastId: 5 },
    moodleCacheGeneration());
    expect(generation).toBeGreaterThanOrEqual(0);
  });

  expect(view.getByTestId('probe').props.children).toBe('synced:1');
});
