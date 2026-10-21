/**
 * DEV ONLY —— Moodle 工作台/详情页的本地预览（假数据，不联网、不碰校园登录）
 *
 * 为什么存在：真机验收被校方站点登录卡住，而工作台的层级只能在设备上看。
 * 这一页把 Phase G 四个阶段的结果用固定样本摆出来：四段、课程切换、章节卡、
 * 截止桶、详情页头与文件行。
 *
 * 纪律：
 * - 只在 `__DEV__` 下渲染内容；发布构建落到一句说明，⛔ 不是可交付页面。
 * - 页面不写任何业务逻辑，样本数据写死在下面；⛔ 不许被产品代码引用。
 * - 它不属于页面清单的任何一页（P0 清单无此路由），因此不参与导航与深链分发。
 */
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { MoodleDetailScreen, type MoodleDetailLabels } from '@/features/tools/moodle/DetailScreen';
import { MoodleWorkspaceScreen, type MoodleDeadlineView,
  type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleDetail, MoodleFile } from '@/features/tools/moodle/detail';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

type Scenario = 'ready' | 'choosing' | 'loading' | 'empty' | 'failed' | 'detail';

const labels: MoodleWorkspaceLabels = {
  firstLogin: 'Sign in to Moodle first', restoredNative: 'Restored native workspace',
  nativeWorkspace: 'Native workspace', login: 'Back to sign-in', sync: 'Sync courses',
  cancel: 'Cancel sync', confirmSelection: 'Confirm courses', chooseCourses: 'Choose courses',
  courses: 'Courses', allTypes: 'All types', switchCourse: 'Switch course', empty: 'No content to show',
  original: 'Open original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Moodle under maintenance (03:00–04:30)', offline: 'You are offline',
  phase: (value) => ({ idle: 'Idle', 'loading-courses': 'Loading courses', choosing: 'Choosing courses',
    'loading-objects': 'Syncing course content', ready: 'Synced', error: 'Sync failed' }[value] ?? value),
  failure: (value) => value,
  moduleType: (value) => ({ assign: 'Assignment', forum: 'Announcement', resource: 'Resource',
    folder: 'Folder', quiz: 'Quiz' }[value] ?? value),
};

const detailLabels: MoodleDetailLabels = {
  back: 'Back', original: 'Open original', empty: 'No content to show', locked: 'Content is locked',
  fileUnknown: 'File details unavailable',
  submissionStatus: (value) => ({ submitted: 'Submitted', draft: 'Draft', reopened: 'Reopened',
    unknown: 'Unknown' }[value]),
  gradingStatus: (value) => ({ graded: 'Graded', 'not-graded': 'Not graded', unknown: 'Unknown' }[value]),
  formatTime: (value) => new Date(value).toLocaleString(),
  fileMetadata: (file) => `${file.mimeType ?? '—'} · ${file.size === null ? '—' : `${Math.round(file.size / 1024)} KB`}`,
};

const course = (id: number, name: string) => ({ id, name, shortName: null, url: null, startDate: null,
  endDate: null, visible: true, favourite: false, progress: null });
const courses = [course(1, 'BSC125 Probability and Statistics A (Group 2)'),
  course(2, 'SWE203 Human-Computer Interaction (SWE/CS)'),
  course(3, 'SWE306 Software Engineering Project')];
const file = (name: string): MoodleFile => ({ name, url: 'https://l.xmu.edu.my/pluginfile.php/1/x',
  mimeType: 'application/pdf', size: 481280, modifiedAt: null });
const snapshot = (phase: MoodleSyncSnapshot['phase']): MoodleSyncSnapshot => ({ phase, failure: null,
  candidates: courses, selectedIds: [1, 2, 3],
  data: { generation: 1, courses, events: [], states: [
    { courseId: 1, sections: [
      { id: 11, number: 1, title: 'Course Information and Announcements', moduleIds: [101], url: null,
        visible: true, current: false },
      { id: 12, number: 2, title: 'Week 1 - Introduction', moduleIds: [201, 202, 203], url: null,
        visible: true, current: false },
      { id: 13, number: 3, title: 'Week 2 - Probability Basics', moduleIds: [301], url: null,
        visible: true, current: false }],
      modules: [
        { id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
          url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true,
          accessVisible: true, restrictions: false, completion: null },
        { id: 201, sectionId: 12, type: 'assign', name: 'Homework 1',
          url: 'https://l.xmu.edu.my/mod/assign/view.php?id=201', visible: true, userVisible: true,
          accessVisible: true, restrictions: false, completion: null },
        { id: 202, sectionId: 12, type: 'resource', name: 'Lecture slides',
          url: 'https://l.xmu.edu.my/mod/resource/view.php?id=202', visible: true, userVisible: true,
          accessVisible: true, restrictions: false, completion: null },
        { id: 203, sectionId: 12, type: 'folder', name: 'Tutorial materials',
          url: 'https://l.xmu.edu.my/mod/folder/view.php?id=203', visible: true, userVisible: true,
          accessVisible: true, restrictions: false, completion: null },
        { id: 301, sectionId: 13, type: 'quiz', name: 'Quiz 1',
          url: 'https://l.xmu.edu.my/mod/quiz/view.php?id=301', visible: true, userVisible: true,
          accessVisible: true, restrictions: false, completion: null },
      ] },
    { courseId: 2, sections: [{ id: 21, number: 1, title: 'Week 1 - Heuristics', moduleIds: [401],
      url: null, visible: true, current: false }], modules: [
      { id: 401, sectionId: 21, type: 'assign', name: 'Heuristic evaluation',
        url: 'https://l.xmu.edu.my/mod/assign/view.php?id=401', visible: true, userVisible: true,
        accessVisible: true, restrictions: false, completion: null }] },
    { courseId: 3, sections: [], modules: [] },
  ] } });

const deadlines: MoodleDeadlineView = { title: 'Deadlines', empty: 'No deadlines yet',
  groups: [
    { key: 'valid', title: 'Due', items: [
      { key: 'd1', title: 'Homework 1', meta: '2026-10-24 23:59' },
      { key: 'd2', title: 'Quiz 1', meta: '2026-10-27 12:00' }] },
    { key: 'past', title: 'Past', items: [{ key: 'd3', title: 'Lab report', meta: '2026-10-18 23:59' }] },
    { key: 'unset', title: 'No deadline', items: [{ key: 'u1', title: 'Lecture slides', meta: null }] },
  ],
  otherTitle: 'Other events',
  others: [{ key: 'e1', title: 'Exam window opens', meta: 'Open · actionable · 2026-11-02 09:00' }],
  reminder: 'Reminders planned' };

const details: Record<string, MoodleDetail> = {
  forum: { kind: 'forum', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', description: '',
    announcements: [
      { id: 71, title: 'Welcome to BSC125', author: 'Dr One', pinned: true,
        url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71' },
      { id: 72, title: 'Lab schedule change', author: 'Dr Two', pinned: false,
        url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=72' }] },
  discussion: { kind: 'discussion', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71', description: '', posts: [{ id: 81,
      title: 'Welcome to BSC125', author: 'Dr One', createdAt: '2026-10-01T08:00:00Z',
      body: 'Please read Chapter 1 before the first tutorial.',
      url: 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71#p81', attachments: [file('chapter1.pdf')] }] },
  assign: { kind: 'assign', courseId: 1, moduleId: 201,
    url: 'https://l.xmu.edu.my/mod/assign/view.php?id=201', description: '',
    submission: 'submitted', grading: 'not-graded', locked: false,
    activityDates: 'Opened 12 October 2026, 09:00 · Due 24 October 2026, 23:59',
    rows: [{ label: 'Attempt', value: '1' }, { label: 'Time remaining', value: '3 days' }],
    attachments: [file('homework1.pdf')] },
  folder: { kind: 'folder', courseId: 1, moduleId: 203,
    url: 'https://l.xmu.edu.my/mod/folder/view.php?id=203', description: '',
    files: [file('tutorial1.pdf'), file('tutorial2.pdf'), file('solutions.pdf')] },
  resource: { kind: 'resource', courseId: 1, moduleId: 202,
    url: 'https://l.xmu.edu.my/mod/resource/view.php?id=202', description: '', file: file('lecture1.pdf') },
};
const DETAIL_KINDS = ['forum', 'discussion', 'assign', 'folder', 'resource'] as const;

const SCENARIOS: readonly { key: Scenario; label: string }[] = [
  { key: 'ready', label: '就绪' }, { key: 'choosing', label: '选课中' },
  { key: 'loading', label: '同步中' }, { key: 'empty', label: '无课程' },
  { key: 'failed', label: '失败' }, { key: 'detail', label: '详情' },
];

export default function DevMoodlePreview(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [scenario, setScenario] = React.useState<Scenario>('ready');
  const [kind, setKind] = React.useState<(typeof DETAIL_KINDS)[number]>('forum');
  const base = snapshot(scenario === 'loading' ? 'loading-objects' : scenario === 'choosing' ? 'choosing' : 'ready');
  const view: MoodleSyncSnapshot = scenario === 'empty'
    ? { ...base, selectedIds: [], data: { generation: 1, courses: [], states: [], events: [] } }
    : scenario === 'failed' ? { ...base, failure: 'unavailable' } : base;

  return <Screen testID="dev-moodle-preview" bottomMode="none"
    header={<View style={{ paddingHorizontal: theme.space('space_4'), paddingBottom: theme.space('space_1') }}>
      <Text role="headline" emphasis="strong">DEV · Moodle 工作台预览</Text>
    </View>}>
    <View style={{ paddingHorizontal: theme.space('space_4'), paddingTop: theme.space('space_2'),
      gap: theme.space('space_2') }}>
      <Text role="caption" colorToken="text-secondary">固定样本 · 不联网 · 不登录</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.space('space_2') }}>
        {SCENARIOS.map((item) => <Chip key={item.key} testID={`dev-scenario-${item.key}`} variant="selectable"
          selected={scenario === item.key} label={item.label} onPress={() => setScenario(item.key)} />)}
      </ScrollView>
      {scenario === 'detail' ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.space('space_2') }}>
        {DETAIL_KINDS.map((item) => <Chip key={item} testID={`dev-kind-${item}`} variant="selectable"
          selected={kind === item} label={item} onPress={() => setKind(item)} />)}
      </ScrollView> : null}
    </View>
    <View style={{ flex: 1 }}>
      {scenario === 'detail' ? <MoodleDetailScreen detail={details[kind]} labels={detailLabels}
        title={{ forum: 'Announcements', discussion: 'Welcome to BSC125', assign: 'Homework 1',
          folder: 'Tutorial materials', resource: 'Lecture slides' }[kind]}
        onBack={() => setScenario('ready')} onOriginal={() => undefined} onDiscussion={() => undefined} />
        : <MoodleWorkspaceScreen labels={labels} snapshot={view} entry="restored-native" deadlines={deadlines}
          maintenance={false} onLogin={() => router.back()} onSync={() => setScenario('ready')}
          onCancel={() => setScenario('ready')} onChoose={() => undefined}
          onModule={() => setScenario('detail')} onOriginal={() => undefined} />}
    </View>
  </Screen>;
}
