import { Button, Menu } from 'heroui-native';
import * as React from 'react';
import { useI18n } from '@/i18n';

/** Only real treehole operations belong here; state and report submission stay with the caller. */
export function TreeholePostMenu({ onReport, testIDPrefix }: { onReport: () => void; testIDPrefix?: string }): React.ReactElement {
  const { t } = useI18n();
  return <Menu presentation="bottom-sheet" animation="disable-all">
    <Menu.Trigger asChild><Button testID={testIDPrefix ? `${testIDPrefix}-more` : 'treehole-more'} size="sm" variant="ghost" accessibilityLabel={t('square.guides.more')}>{t('square.guides.more')}</Button></Menu.Trigger>
    <Menu.Portal>
      <Menu.Overlay />
      <Menu.Content presentation="bottom-sheet">
        <Menu.Item testID={testIDPrefix ? `${testIDPrefix}-report` : 'treehole-report'} onPress={onReport}><Menu.ItemTitle>{t('screen.campus.read.report')}</Menu.ItemTitle></Menu.Item>
      </Menu.Content>
    </Menu.Portal>
  </Menu>;
}
