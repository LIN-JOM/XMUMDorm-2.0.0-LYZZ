export type TreeholePostSource = {
  id: number;
  title?: string | null;
  content: string;
  created_at?: string;
  liked?: boolean;
  user_liked?: boolean;
  like_count?: number;
  comment_count?: number;
  author?: { avatar?: string; nickname?: string; username?: string } | null;
  images?: readonly { url?: string | null }[] | null;
};

export type TreeholePostViewModel = {
  readonly id: number;
  readonly title: string;
  readonly content: string;
  readonly authorName: string | null;
  readonly avatarUrl: string | null;
  readonly createdAt: string | null;
  readonly liked: boolean;
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly mediaUrls: readonly string[];
};

function nonNegativeCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function urlOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Maps a validated treehole API row to presentation-only, nullable-safe values. */
export function toTreeholePostViewModel(post: TreeholePostSource): TreeholePostViewModel {
  const authorName = post.author?.nickname?.trim() || post.author?.username?.trim() || null;
  return {
    id: post.id,
    title: post.title?.trim() || '',
    content: post.content,
    authorName,
    avatarUrl: urlOrNull(post.author?.avatar),
    createdAt: typeof post.created_at === 'string' ? post.created_at : null,
    liked: post.liked === true || post.user_liked === true,
    likeCount: nonNegativeCount(post.like_count),
    commentCount: nonNegativeCount(post.comment_count),
    mediaUrls: (post.images ?? []).flatMap(image => {
      const url = urlOrNull(image?.url);
      return url ? [url] : [];
    }),
  };
}
