import type { FormFieldDescriptor, FormOption, FormValues } from '@/components/ui/FormField';
import { validateAll } from '@/components/ui/Form';
import type { Translate } from '@/i18n';
import { fieldsOf, type PublishFormDescriptor } from '@/features/publish/descriptor';
import { isValidPublishImages, type PublishImage } from '@/features/publish/images';
import { renderDateTime } from '@/features/errand/DeadlineField';
import { createClubActivity, createClubPost } from '../../../../shared/api/clubs';

type MediaRender = NonNullable<FormFieldDescriptor['render']>;
type ClubPublishOptions = { clubs: readonly FormOption[]; renderMedia: MediaRender };
const invalid = 'publish.bing.invalid' as const;

function text(max: number) {
  return (value: unknown) => typeof value === 'string' && value.trim().length <= max ? undefined : invalid;
}

function optionalDateTime(value: unknown) {
  return value === '' || typeof value === 'string' && !value.startsWith('local:') && Number.isFinite(Date.parse(value))
    ? undefined
    : invalid;
}

function managedClub(options: readonly FormOption[]) {
  return (value: unknown) => typeof value === 'string' && options.some((option) => option.value === value) ? undefined : invalid;
}

function resultId(value: unknown): number {
  const id = (value as { id?: unknown } | null)?.id;
  if (!Number.isSafeInteger(id) || Number(id) <= 0) throw { kind: 'unknown' };
  return Number(id);
}

function images(value: unknown): PublishImage[] {
  return Array.isArray(value) ? value as PublishImage[] : [];
}

function assertValid(descriptor: PublishFormDescriptor, values: FormValues): void {
  if (Object.keys(validateAll(fieldsOf(descriptor), values)).length > 0) throw { kind: 'validation' };
}

function activityFields(options: ClubPublishOptions): FormFieldDescriptor[] {
  return [
    { kind: 'select', name: 'clubId', labelKey: 'clubs.title', required: true, source: { kind: 'remote', options: options.clubs }, validate: managedClub(options.clubs) },
    { kind: 'text', name: 'title', labelKey: 'publish.bing.title', required: true, maxLength: 160, validate: text(160) },
    { kind: 'textarea', name: 'summary', labelKey: 'publish.bing.description', maxLength: 255, validate: text(255) },
    { kind: 'text', name: 'location', labelKey: 'publish.bing.location', maxLength: 160, validate: text(160) },
    { kind: 'text', name: 'signupLink', labelKey: 'publish.bing.contact', maxLength: 500, validate: text(500) },
    { kind: 'custom', name: 'time', labelKey: 'publish.club.startsAt', render: renderDateTime('publish.club.startsAt', 'club-activity-start'), validate: optionalDateTime },
    { kind: 'custom', name: 'endTime', labelKey: 'publish.club.endsAt', render: renderDateTime('publish.club.endsAt', 'club-activity-end'), validate: optionalDateTime },
    { kind: 'custom', name: 'images', labelKey: 'publish.bing.images', neverDraft: true, render: options.renderMedia, validate: value => isValidPublishImages(value, 4, false) ? undefined : invalid },
  ];
}

function postFields(options: ClubPublishOptions): FormFieldDescriptor[] {
  return [
    { kind: 'select', name: 'clubId', labelKey: 'clubs.title', required: true, source: { kind: 'remote', options: options.clubs }, validate: managedClub(options.clubs) },
    { kind: 'text', name: 'title', labelKey: 'publish.bing.title', maxLength: 160, validate: text(160) },
    { kind: 'textarea', name: 'content', labelKey: 'publish.bing.content', required: true, maxLength: 8000, validate: value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 8000 ? undefined : invalid },
    { kind: 'custom', name: 'images', labelKey: 'publish.bing.images', neverDraft: true, render: options.renderMedia, validate: value => isValidPublishImages(value, 4, false) ? undefined : invalid },
  ];
}

/** Activity and post forms only receive club IDs returned with the server's admin role. */
export function createClubActivityPublishDescriptor(_t: Translate, options: ClubPublishOptions): PublishFormDescriptor {
  const descriptor: PublishFormDescriptor = {
    id: 'clubActivity', semantic: 'create', listAfterSubmit: '/clubs' as never, mediaFields: ['images'],
    sections: [{ title: 'publish.entry.clubActivity', fields: activityFields(options) }],
    submit: async (values) => {
      assertValid(descriptor, values);
      const id = resultId(await createClubActivity(Number(values.clubId), {
        title: String(values.title).trim(), summary: String(values.summary).trim(), location: String(values.location).trim(),
        signupLink: String(values.signupLink).trim(), time: String(values.time || ''), endTime: String(values.endTime || ''),
      }, images(values.images)));
      return { id };
    },
    routeAfterSubmit: result => typeof result?.id === 'number' && Number.isSafeInteger(result.id) && result.id > 0
      ? `/clubs/activity/${result.id}?published=1` as never
      : '/clubs' as never,
  };
  return descriptor;
}

/** Club posts reuse the same server-owned management choices and media field as activities. */
export function createClubPostPublishDescriptor(_t: Translate, options: ClubPublishOptions): PublishFormDescriptor {
  const descriptor: PublishFormDescriptor = {
    id: 'clubPost', semantic: 'create', listAfterSubmit: '/clubs' as never, mediaFields: ['images'],
    sections: [{ title: 'publish.entry.clubPost', fields: postFields(options) }],
    submit: async (values) => {
      assertValid(descriptor, values);
      const id = resultId(await createClubPost(Number(values.clubId), {
        title: String(values.title).trim(), content: String(values.content).trim(),
      }, images(values.images)));
      return { id };
    },
    routeAfterSubmit: result => typeof result?.id === 'number' && Number.isSafeInteger(result.id) && result.id > 0
      ? `/clubs/post/${result.id}?published=1` as never
      : '/clubs' as never,
  };
  return descriptor;
}
