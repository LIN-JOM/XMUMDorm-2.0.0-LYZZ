import * as React from 'react';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';

export type AcImportGuideLabels = { title: string; instruction: string; confirm: string; cancel: string };

/** The integrator supplies shared bilingual labels and the existing readSchedule command. */
export function AcScheduleReadGuide({ labels, onRead }: { labels: AcImportGuideLabels; onRead: () => void }): React.ReactElement {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const pending = React.useRef(false);
  const close = () => { pending.current = false; setOpen(false); };
  const confirm = () => {
    if (!pending.current) return;
    close();
    onRead();
  };
  return <>
    <Button testID="ac-read-guide-open" label={t('tools.readSchedule')} variant="secondary" onPress={() => { pending.current = true; setOpen(true); }} />
    <AlertDialog testID="ac-read-guide" visible={open} title={labels.title} body={labels.instruction}
      confirmLabel={labels.confirm} cancelLabel={labels.cancel} onConfirm={confirm} onCancel={close} />
  </>;
}
