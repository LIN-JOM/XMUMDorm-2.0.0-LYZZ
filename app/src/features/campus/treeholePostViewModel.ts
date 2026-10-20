import { normalizePostRepostSource } from '../../../../shared/constants/postAttribution';

export type TreeholePostSource = {
  id: number;
  title?: string | null;
  content: string;
  content_origin?: string | null;
  repost_source?: string | null;
  created_at?: string;
  liked?: boolean;
  user_liked?: boolean;
  like_count?: number;
  comment_count?: number;
  author?: { id?: number; avatar?: string; nickname?: string; username?: string; level?: number; badge?: string } | null;
  tags?: readonly { id?: number; slug?: string; name_zh?: string; name_en?: string }[] | null;
  images?: readonly { url?: string | null }[] | null;
};

export type TreeholePostTag = {
  readonly id: number;
  readonly slug: string;
  readonly nameZh: string | null;
  readonly nameEn: string | null;
};

export type TreeholePostViewModel = {
  readonly id: number;
  readonly title: string;
  readonly content: string;
  readonly contentOrigin: 'original' | 'repost' | null;
  readonly repostSource: string | null;
  readonly authorName: string | null;
  readonly authorId: number | null;
  readonly authorLevel: number | null;
  readonly authorBadge: string | null;
  readonly avatarUrl: string | null;
  readonly createdAt: string | null;
  readonly liked: boolean;
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly mediaUrls: readonly string[];
  readonly tags: readonly TreeholePostTag[];
};

function nonNegativeCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function urlOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function positiveIdOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function authorLevelOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 6 ? value : null;
}

function authorBadgeOrNull(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z_]{1,40}$/.test(value) ? value : null;
}

function treeholeTags(value: TreeholePostSource['tags']): readonly TreeholePostTag[] {
  const unique = new Set<number>();
  return (value ?? []).flatMap(tag => {
    const id = positiveIdOrNull(tag?.id);
    const slug = typeof tag?.slug === 'string' && /^[a-z0-9-]{1,80}$/.test(tag.slug) ? tag.slug : null;
    const nameZh = urlOrNull(tag?.name_zh);
    const nameEn = urlOrNull(tag?.name_en);
    if (id === null || slug === null || (nameZh === null && nameEn === null) || unique.has(id) || unique.size >= 3) return [];
    unique.add(id);
    return [{ id, slug, nameZh, nameEn }];
  });
}

/** Maps a validated treehole API row to presentation-only, nullable-safe values. */
export function toTreeholePostViewModel(post: TreeholePostSource): TreeholePostViewModel {
  const authorName = post.author?.nickname?.trim() || post.author?.username?.trim() || null;
  const repostSource = normalizePostRepostSource(post.repost_source);
  const contentOrigin = post.content_origin === 'original' ? 'original'
    : post.content_origin === 'repost' && repostSource !== null ? 'repost' : null;
  return {
    id: post.id,
    title: post.title?.trim() || '',
    content: post.content,
    contentOrigin,
    repostSource: contentOrigin === 'repost' ? repostSource : null,
    authorName,
    authorId: positiveIdOrNull(post.author?.id),
    authorLevel: authorLevelOrNull(post.author?.level),
    authorBadge: authorBadgeOrNull(post.author?.badge),
    avatarUrl: urlOrNull(post.author?.avatar),
    createdAt: typeof post.created_at === 'string' ? post.created_at : null,
    liked: post.liked === true || post.user_liked === true,
    likeCount: nonNegativeCount(post.like_count),
    commentCount: nonNegativeCount(post.comment_count),
    mediaUrls: (post.images ?? []).flatMap(image => {
      const url = urlOrNull(image?.url);
      return url ? [url] : [];
    }),
    tags: treeholeTags(post.tags),
  };
}
