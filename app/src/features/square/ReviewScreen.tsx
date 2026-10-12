import * as React from 'react';
import { useRouter } from 'expo-router';
import { Form, useForm } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import { type PickedImage, type PickResult } from '@/components/ui/MediaPicker';
import { RatingScale, type RatingTierKey } from '@/components/ui/RatingScale';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge, type MailboxBadge } from '@/features/mailbox/useUnread';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import type { MessageKey } from '@/i18n';
import { useI18n } from '@/i18n';
import { postProductComment } from '../../../../shared/api/canteen';
import { REVIEW_CONTENT_FIELD, REVIEW_IMAGES_FIELD, reviewRating } from './review';
import { CanteenImageInput } from './CanteenImageInput';
import { invalidateCanteen } from './canteenCache';

export type ReviewProps = { productId: number; parentId?: number; pickImage?: () => Promise<PickResult>; titleKey?: MessageKey; onSettled?: () => void; onCancel?: () => void };

function ReviewForm({ productId, parentId, pickImage, badge, titleKey = 'canteen.review.title', onSettled, onCancel }: ReviewProps & { badge: MailboxBadge }): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const committedOwner = React.useRef<number | null>(null);
  const fields = React.useMemo<readonly FormFieldDescriptor[]>(() => [
    { name: 'rating', kind: 'custom', labelKey: 'canteen.review.rating', required: true,
      validate: (value) => reviewRating(value) === null ? 'canteen.review.chooseRating' : undefined,
      render: ({ value, onChange, disabled }) => <RatingScale testID="review-rating" value={value as RatingTierKey | null} disabled={disabled} onChange={onChange} /> },
    REVIEW_CONTENT_FIELD,
    { ...REVIEW_IMAGES_FIELD, render: ({ value, onChange, disabled }) => {
      const images = Array.isArray(value) ? value as PickedImage[] : [];
      return <CanteenImageInput testID="review-images" images={images} onChange={onChange} disabled={disabled} pickImage={pickImage} limit={3} />;
    } },
  ], [pickImage]);
  const form = useForm({ formId: `canteen-review-${timetableIdentity().scope}-${productId}${parentId === undefined ? '' : `-reply-${parentId}`}`, fields, initialValues: { rating: null, content: '', images: [] },
    onSubmit: async (values) => {
      const owner = timetableIdentity().epoch;
      committedOwner.current = null;
      try {
        const images = Array.isArray(values.images) ? values.images as PickedImage[] : [];
        const receipt = await postProductComment(productId, { ...(parentId === undefined ? {} : { parent_id: parentId }), rating: reviewRating(values.rating), content: String(values.content).trim(),
          imageFiles: images.map((image, index) => ({ uri: image.uri, type: image.mimeType ?? 'image/jpeg', name: `review-${index}.${image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg'}` })) });
        if (owner !== timetableIdentity().epoch) throw { kind: 'unknown' };
        if (typeof receipt?.id !== 'number' || !Number.isSafeInteger(receipt.id) || receipt.id <= 0) throw { kind: 'unknown' };
      } catch (error) {
        if (owner !== timetableIdentity().epoch) throw { kind: 'unknown' };
        const classified = toToolsError(error, await session.handleAuthFailure(error));
        throw classified.kind === 'validation' ? { ...classified, target: t('canteen.review.title'), params: { rule: t('canteen.review.serverRule') } } : classified;
      }
      // A storage failure cannot turn a committed review into a retryable write.
      await invalidateCanteen().catch(() => undefined);
      if (owner !== timetableIdentity().epoch) throw { kind: 'unknown' };
      committedOwner.current = owner;
    },
  });
  const detail = () => router.replace({ pathname: '/canteen/product/[id]', params: { id: String(productId) } });
  return <Form testID="review-form" titleKey={titleKey} {...badge} guardNavigation form={form} sections={[{ title: titleKey, fields }]} semantic="create" onSettled={() => { if (committedOwner.current === timetableIdentity().epoch) (onSettled ?? detail)(); }}
    onCancel={onCancel ?? (() => router.canGoBack() ? router.back() : detail())} onRetrySubmit={() => void form.submit()}
    labels={{ submit: t('canteen.review.submit'), cancel: t('action.cancel'), errorSummaryTitle: t('canteen.review.failed'), leaveTitle: t('form.leave.title'), leaveBody: t('form.leave.body'), leaveConfirm: t('form.leave.confirm'), leaveCancel: t('form.leave.cancel') }} />;
}

/** P4 form; parentId is supplied only from a current dish's root comment. */
export function ReviewScreen(props: ReviewProps): React.ReactElement {
  const { productId, parentId, titleKey = 'canteen.review.title' } = props;
  const session = useSession();
  const badge = useMailboxBadge();
  const { t } = useI18n();
  const router = useRouter();
  if (session.status !== 'signedIn') return <Screen titleKey={titleKey} bottomMode="own" {...badge}><EmptyState kind="firstRun" title={t('auth.login')} actionLabel={t('auth.login')} onAction={() => router.push('/login')} /></Screen>;
  if (!Number.isSafeInteger(productId) || productId <= 0 || (parentId !== undefined && (!Number.isSafeInteger(parentId) || parentId <= 0))) return <Screen titleKey="canteen.review.title" bottomMode="own" {...badge}>
    <EmptyState testID="review-product-missing" kind="noResult" title={t('canteen.dishMissing')} actionLabel={t('action.back')} onAction={() => router.replace('/canteen')} />
  </Screen>;
  return <ReviewForm key={`${timetableIdentity().epoch}:${productId}:${parentId ?? 'root'}`} {...props} badge={badge} />;
}
