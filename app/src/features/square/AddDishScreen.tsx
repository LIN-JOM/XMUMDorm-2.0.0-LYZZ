import * as React from 'react';
import { Form, useForm } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import type { MessageKey } from '@/i18n';
import type { PickedImage, PickResult } from '@/components/ui/MediaPicker';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import { useI18n } from '@/i18n';
import { useRouter } from 'expo-router';
import { createProduct, getShop } from '../../../../shared/api/canteen';
import { useCanteenResource } from './useCanteenResource';
import { normalizeShopDetail, type CanteenCategory } from './canteen';
import { prepareDish } from './addDish';
import { CanteenImageInput } from './CanteenImageInput';
import { invalidateCanteen } from './canteenCache';

export type AddDishLabels = {
  titleKey: MessageKey; categoryKey: MessageKey; nameKey: MessageKey; descriptionKey: MessageKey; priceKey: MessageKey; imagesKey: MessageKey;
  invalidPriceKey: MessageKey; invalidCategoryKey: MessageKey; tooManyImagesKey: MessageKey; submitKey: MessageKey; failedKey: MessageKey; serverRuleKey: MessageKey;
  imagesUnavailableKey?: MessageKey;
};
export type AddDishProps = { shopId: number; labels: AddDishLabels; pickImage?: () => Promise<PickResult>; onCreated: (productId: number) => void; onCancel?: () => void };
function AddDishForm({ categories, ...props }: AddDishProps & { categories: readonly CanteenCategory[] }): React.ReactElement {
  const { labels, shopId, pickImage, onCreated, onCancel } = props;
  const { t } = useI18n();
  const session = useSession();
  const router = useRouter();
  const badge = useMailboxBadge();
  const committed = React.useRef<{ id: number; owner: number } | null>(null);
  const fields = React.useMemo<readonly FormFieldDescriptor[]>(() => [
    { name: 'category_id', kind: 'select', labelKey: labels.categoryKey, required: true, source: { kind: 'remote', options: categories.map((category) => ({ value: String(category.id), label: category.name })) },
      validate: (value) => categories.some((category) => String(category.id) === String(value)) ? undefined : labels.invalidCategoryKey },
    { name: 'name', kind: 'text', labelKey: labels.nameKey, required: true, validate: (value) => typeof value === 'string' && value.trim() ? undefined : 'form.error.required' },
    { name: 'description', kind: 'textarea', labelKey: labels.descriptionKey },
    { name: 'price', kind: 'text', labelKey: labels.priceKey, validate: (value) => !String(value ?? '').trim() || /^\d+(\.\d{1,2})?$/.test(String(value).trim()) && Number.isFinite(Number(value)) ? undefined : labels.invalidPriceKey },
    { name: 'images', kind: 'custom', labelKey: labels.imagesKey, neverDraft: true, validate: (value) => Array.isArray(value) && value.length <= 5 ? undefined : labels.tooManyImagesKey,
      render: ({ value, onChange, disabled }) => <CanteenImageInput testID="add-dish-images" images={Array.isArray(value) ? value as PickedImage[] : []} onChange={onChange} pickImage={pickImage} limit={5} disabled={disabled} unavailableKey={labels.imagesUnavailableKey} /> },
  ], [categories, labels, pickImage]);
  const form = useForm({ formId: `canteen-add-dish-${timetableIdentity().scope}-${shopId}`, fields,
    initialValues: { category_id: categories.length === 1 ? String(categories[0].id) : '', name: '', description: '', price: '', images: [] },
    onSubmit: async (values) => {
      const owner = timetableIdentity().epoch;
      const prepared = prepareDish(values, categories);
      if (!prepared.ok) throw { kind: 'validation', target: t(labels.titleKey), params: { rule: t(labels.serverRuleKey) } };
      try {
        const body = prepared.value;
        const product = await createProduct({ ...body, images: body.images.map((image, index) => ({ uri: image.uri, type: image.mimeType ?? 'image/jpeg',
          name: `dish-${index}.${image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg'}` })) });
        if (owner !== timetableIdentity().epoch) throw { kind: 'unknown' };
        if (typeof product?.id !== 'number' || !Number.isSafeInteger(product.id) || product.id <= 0) throw { kind: 'unknown' };
        committed.current = { id: product.id, owner };
        await invalidateCanteen().catch(() => undefined);
        if (owner !== timetableIdentity().epoch) throw { kind: 'unknown' };
      } catch (error) {
        if (owner !== timetableIdentity().epoch) throw { kind: 'unknown' };
        const classified = toToolsError(error, await session.handleAuthFailure(error));
        throw classified.kind === 'validation' ? { ...classified, target: t(labels.titleKey), params: { rule: t(labels.serverRuleKey) } } : classified;
      }
    } });
  return <Form testID="add-dish-form" titleKey={labels.titleKey} {...badge} semantic="create" guardNavigation form={form} sections={[{ title: labels.titleKey, fields }]}
    onSettled={() => { if (committed.current?.owner === timetableIdentity().epoch) onCreated(committed.current.id); }}
    onCancel={onCancel ?? (() => router.canGoBack() ? router.back() : router.replace({ pathname: '/canteen/shop/[id]', params: { id: String(shopId) } }))}
    onRetrySubmit={() => void form.submit()}
    labels={{ submit: t(labels.submitKey), cancel: t('action.cancel'), errorSummaryTitle: t(labels.failedKey), leaveTitle: t('form.leave.title'), leaveBody: t('form.leave.body'), leaveConfirm: t('form.leave.confirm'), leaveCancel: t('form.leave.cancel') }} />;
}
/** P4 contribution form; labels are registered by the shared i18n owner. */
export function AddDishScreen(props: AddDishProps): React.ReactElement {
  const session = useSession();
  const { t } = useI18n();
  const badge = useMailboxBadge();
  const router = useRouter();
  const valid = Number.isSafeInteger(props.shopId) && props.shopId > 0;
  const shop = useCanteenResource(() => valid ? getShop(props.shopId) : Promise.resolve(null), normalizeShopDetail, [props.shopId, valid]);
  if (session.status !== 'signedIn') return <Screen titleKey={props.labels.titleKey} bottomMode="own" {...badge}><EmptyState kind="firstRun" title={t('auth.login')} actionLabel={t('auth.login')} onAction={() => router.push('/login')} /></Screen>;
  if (shop.loading) return <Screen titleKey={props.labels.titleKey} bottomMode="own" {...badge}><LoadingState /></Screen>;
  if (shop.error) return <Screen titleKey={props.labels.titleKey} bottomMode="own" {...badge}><ErrorState error={shop.error} onAction={shop.reload} /></Screen>;
  if (!shop.data?.categories.length) return <Screen titleKey={props.labels.titleKey} bottomMode="own" {...badge}><EmptyState kind="noResult" title={t('canteen.noDishes')} actionLabel={t('action.refresh')} onAction={shop.reload} /></Screen>;
  return <AddDishForm key={`${props.shopId}:${timetableIdentity().epoch}`} {...props} categories={shop.data.categories} />;
}
