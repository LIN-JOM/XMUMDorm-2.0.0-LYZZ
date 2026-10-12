import * as React from 'react';
import { View } from 'react-native';

import { getTemplate, normalizeTemplateKey } from '../../../../shared/constants/confessionTemplates';
import { Text } from '@/components/ui/Text';
import type { MessageKey, Translate } from '@/i18n';

const TEMPLATE_LABEL_KEYS: Readonly<Record<string, MessageKey>> = {
  bigtype: 'publish.wall.bigtype',
  letter: 'publish.wall.letter',
  note: 'publish.wall.note',
  announcement: 'publish.wall.announcement',
  dialogue: 'publish.wall.dialogue',
  checklist: 'publish.wall.checklist',
};

export function wallTemplateLabel(t: Translate, templateKey: unknown): string {
  return t(TEMPLATE_LABEL_KEYS[normalizeTemplateKey(templateKey)]);
}

function nonEmptyLines(content: string): string[] {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length ? lines : [content];
}

/** Six D-5 layouts share plain text and the same accessibility contract. */
export function WallTemplateContent({ templateKey, content }: { templateKey: unknown; content: string }): React.ReactElement {
  const key = getTemplate(normalizeTemplateKey(templateKey)).key;
  const lines = nonEmptyLines(content);
  if (key === 'bigtype') return <Text role="title" emphasis="strong" align="center">{content}</Text>;
  if (key === 'announcement') return <View><Text role="label" emphasis="strong">{content}</Text></View>;
  if (key === 'dialogue') return <View>{lines.map((line, index) => <Text key={`${index}-${line}`} role="body">{`“${line}”`}</Text>)}</View>;
  if (key === 'checklist') return <View>{lines.map((line, index) => <Text key={`${index}-${line}`} role="body">{`□ ${line}`}</Text>)}</View>;
  if (key === 'note') return <View>{lines.map((line, index) => <Text key={`${index}-${line}`} role="body">{`• ${line}`}</Text>)}</View>;
  return <Text role="body">{content}</Text>;
}
