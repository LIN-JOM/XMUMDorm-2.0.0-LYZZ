import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import type { MoodleFailure } from './bridge';
import type { MoodleModule } from './contract';
import type { MoodleSyncPhase, MoodleSyncSnapshot } from './sync';

/** The route owner fills these labels from the single application t function. */
export type MoodleWorkspaceLabels = {
  firstLogin: string; restoredNative: string; nativeWorkspace: string; login: string; sync: string; cancel: string;
  confirmSelection: string; chooseCourses: string; courses: string; allTypes: string;
  empty: string; original: string; details: string; unknownSection: string; maintenance: string;
  phase: (value: MoodleSyncPhase) => string;
  failure: (value: MoodleFailure) => string;
  moduleType: (value: string) => string;
};
export type MoodleWorkspaceScreenProps = {
  labels: MoodleWorkspaceLabels;
  snapshot: MoodleSyncSnapshot;
  entry: 'first-login' | 'current-native' | 'restored-native';
  onLogin: () => void; onSync: () => void; onCancel: () => void;
  onChoose: (ids: number[]) => void;
  onModule: (courseId: number, module: MoodleModule) => void;
  onOriginal: (url: string) => void;
  maintenance?: boolean;
};

export function MoodleWorkspaceScreen({ labels, snapshot, entry, onLogin, onSync, onCancel,
  onChoose, onModule, onOriginal, maintenance }: MoodleWorkspaceScreenProps): React.ReactElement {
  const theme = useTheme();
  const [choice, setChoice] = React.useState({ generation: snapshot.data.generation, ids: snapshot.selectedIds });
  const draft = choice.generation === snapshot.data.generation ? choice.ids : snapshot.selectedIds;
  const [courseId, setCourseId] = React.useState<number | null>(null);
  const [type, setType] = React.useState<string | null>(null);
  const currentCourse = snapshot.data.courses.find((course) => course.id === courseId)
    ?? snapshot.data.courses[0];
  const courseState = snapshot.data.states.find((state) => state.courseId === currentCourse?.id);
  const modules = (courseState?.modules ?? []).filter((module) => module.visible && module.userVisible);
  const types = [...new Set(modules.map((module) => module.type))];
  const visibleModules = modules.filter((module) => type === null || module.type === type);
  const sections = [...(courseState?.sections ?? [])];
  for (const module of visibleModules) {
    if (!sections.some((section) => section.id === module.sectionId)) {
      sections.push({ id: module.sectionId, number: 0, title: labels.unknownSection, moduleIds: [],
        url: null, visible: true, current: false });
    }
  }
  const busy = snapshot.phase === 'loading-courses' || snapshot.phase === 'loading-objects';
  return <ScrollView testID="moodle-workspace" contentContainerStyle={{ padding: theme.space('space_4'),
    gap: theme.space('space_4') }}>
    <Text testID="moodle-entry">{entry === 'first-login' ? labels.firstLogin : entry === 'restored-native' ? labels.restoredNative : labels.nativeWorkspace}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
      <Button testID="moodle-login" label={labels.login} onPress={onLogin} variant="secondary" />
      <Button testID="moodle-sync" label={labels.sync} onPress={onSync} disabled={busy} />
      {busy ? <Button testID="moodle-cancel" label={labels.cancel} onPress={onCancel} variant="ghost" /> : null}
    </View>
    <Text testID="moodle-phase">{labels.phase(snapshot.phase)}</Text>
    {snapshot.failure ? <Text colorToken="text-danger">{maintenance
      ? labels.maintenance : labels.failure(snapshot.failure)}</Text> : null}
    {snapshot.phase === 'choosing' ? <View style={{ gap: theme.space('space_2') }}>
      <Text role="title">{labels.chooseCourses}</Text>
      {snapshot.candidates.map((course) => <Checkbox key={course.id} testID={`moodle-select-${course.id}`}
        label={course.name} state={draft.includes(course.id) ? 'checked' : 'unchecked'}
        onPress={() => setChoice({ generation: snapshot.data.generation, ids: draft.includes(course.id)
          ? draft.filter((id) => id !== course.id) : [...draft, course.id] })} />)}
      <Button testID="moodle-confirm-selection" label={labels.confirmSelection} onPress={() => onChoose(draft)} />
    </View> : null}
    <Text role="title">{labels.courses}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
      {snapshot.data.courses.map((course) => <Button key={course.id} testID={`moodle-course-${course.id}`}
        label={course.name} variant={course.id === currentCourse?.id ? 'secondary' : 'ghost'}
        onPress={() => { setCourseId(course.id); setType(null); }} />)}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
      <Button testID="moodle-type-all" label={labels.allTypes} variant="ghost" onPress={() => setType(null)} />
      {types.map((item) => <Button key={item} testID={`moodle-type-${item}`} label={labels.moduleType(item)}
        variant={type === item ? 'secondary' : 'ghost'} onPress={() => setType(item)} />)}
    </View>
    {visibleModules.length === 0 ? <Text>{labels.empty}</Text> : null}
    {sections.map((section) => {
      const rows = visibleModules.filter((module) => module.sectionId === section.id);
      if (rows.length === 0) return null;
      return <View key={section.id} style={{ gap: theme.space('space_2') }}>
        <Text role="title">{section.title}</Text>
        {rows.map((module) => <View key={module.id} style={{ gap: theme.space('space_2') }}>
          <Button testID={`moodle-module-${module.id}`} label={module.name} variant="secondary"
            onPress={() => currentCourse && onModule(currentCourse.id, module)} />
          <Text role="caption">{labels.moduleType(module.type)}</Text>
          {module.url ? <Button testID={`moodle-original-${module.id}`} label={labels.original}
            variant="link" onPress={() => onOriginal(module.url!)} /> : null}
        </View>)}
      </View>;
    })}
  </ScrollView>;
}
