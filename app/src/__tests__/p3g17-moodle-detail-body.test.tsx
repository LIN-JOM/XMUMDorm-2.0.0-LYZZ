/**
 * P3G17 · 元信息成组与文件行化（Phase G / R-8 详情页同层级）
 *
 * 期望：文件一条一行（名字与元信息在左、原页动作在右）；作业状态成标签、字段成对；帖子附件在帖子卡内。
 */
import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleDetailScreen, type MoodleDetailLabels } from '@/features/tools/moodle/DetailScreen';
import type { MoodleDetail, MoodleFile } from '@/features/tools/moodle/detail';

const labels: MoodleDetailLabels = { back: 'Back', original: 'Open original', empty: 'Empty',
  locked: 'Locked', fileUnknown: 'File details unavailable',
  submissionStatus: (value) => `submission ${value}`, gradingStatus: (value) => `grading ${value}`,
  formatTime: (value) => `time ${value}`, fileMetadata: (file) => `meta ${file.name}` };
const file = (name: string): MoodleFile => ({ name, url: `https://l.xmu.edu.my/pluginfile.php/1/${name}`,
  mimeType: 'application/pdf', size: 1024, modifiedAt: null });
const folder: MoodleDetail = { kind: 'folder', courseId: 1, moduleId: 101,
  url: 'https://l.xmu.edu.my/mod/folder/view.php?id=101', description: '',
  files: [file('week1.pdf'), file('week2.pdf'), file('week3.pdf')] };

it('p3g17 gives every file exactly one row', async () => {
  const view = await renderApp(<MoodleDetailScreen detail={folder} labels={labels} title="Slides"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  expect(view.getAllByTestId(/^moodle-file-folder-/)).toHaveLength(3);
  expect(within(view.getByTestId('moodle-file-folder-0')).getByText('week1.pdf')).toBeTruthy();
  expect(within(view.getByTestId('moodle-file-folder-2')).getByText('week3.pdf')).toBeTruthy();
});

it('p3g17 keeps the original action inside the file row', async () => {
  const onOriginal = jest.fn();
  const view = await renderApp(<MoodleDetailScreen detail={folder} labels={labels} title="Slides"
    onBack={jest.fn()} onOriginal={onOriginal} onDiscussion={jest.fn()} />);
  const row = within(view.getByTestId('moodle-file-folder-1'));
  expect(row.getByText('meta week2.pdf')).toBeTruthy();
  await fireEvent.press(row.getByTestId('moodle-file-original-folder-1'));
  expect(onOriginal).toHaveBeenCalledWith(file('week2.pdf').url);
});

it('p3g17 groups the assignment status into two labels', async () => {
  const assign: MoodleDetail = { kind: 'assign', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101', description: '', submission: 'submitted',
    grading: 'not-graded', locked: true, activityDates: 'Opened 1 Oct', attachments: [],
    rows: [{ label: 'Attempt', value: '1' }] };
  const view = await renderApp(<MoodleDetailScreen detail={assign} labels={labels} title="Homework"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  const card = within(view.getByTestId('moodle-assign'));
  expect(card.getByText('submission submitted')).toBeTruthy();
  expect(card.getByText('grading not-graded')).toBeTruthy();
  expect(card.getByText('Locked')).toBeTruthy();
  expect(card.getByText('Opened 1 Oct')).toBeTruthy();
  expect(card.getByText('Attempt')).toBeTruthy();
  expect(card.getByText('1')).toBeTruthy();
});

it('p3g17 keeps post attachments inside the post card', async () => {
  const discussion: MoodleDetail = { kind: 'discussion', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71', description: '', posts: [{ id: 81,
      title: 'Post title', author: 'Dr One', createdAt: null, body: 'Post body',
      url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71#p81', attachments: [file('notes.pdf')] }] };
  const view = await renderApp(<MoodleDetailScreen detail={discussion} labels={labels} title="Announcements"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  const card = within(view.getByTestId('moodle-post-81'));
  expect(card.getByText('Post body')).toBeTruthy();
  expect(card.getByTestId('moodle-file-81-0')).toBeTruthy();
  expect(card.getByTestId('moodle-post-original-81')).toBeTruthy();
});

it('p3g17 wraps the announcement list in one card', async () => {
  const forum: MoodleDetail = { kind: 'forum', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', description: '', announcements: [
      { id: 1, title: 'First', author: 'Dr One', pinned: true, url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=1' },
      { id: 2, title: 'Second', author: null, pinned: false, url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=2' }] };
  const view = await renderApp(<MoodleDetailScreen detail={forum} labels={labels} title="Announcements"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  const card = within(view.getByTestId('moodle-forum'));
  expect(card.getByTestId('moodle-discussion-1')).toBeTruthy();
  expect(card.getByTestId('moodle-discussion-2')).toBeTruthy();
});
