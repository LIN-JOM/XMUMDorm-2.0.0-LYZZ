import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { CommentComposer } from '@/components/ui/CommentComposer';
import type { CommentNode } from '@/components/ui/CommentThread';
import { Text } from '@/components/ui/Text';
import { useListPagination } from '@/components/ui/ListScreen';
import { classifyAuthFailure, isSessionInvalid } from '@/features/auth/authFailure';
import { useSession } from '@/features/auth/session';
import { useI18n } from '@/i18n';
import type { DetailComments } from '@/proto/P3';
import { useRouter } from 'expo-router';
import {
  createClubActivityComment,
  createClubPostComment,
  getClubActivityComments,
  getClubPostComments,
} from '../../../../shared/api/clubs';

type ClubCommentTarget = 'activity' | 'post';
type RawComment = {
  id?: unknown;
  content?: unknown;
  parent_id?: unknown;
  created_at?: unknown;
  author?: { nickname?: unknown; username?: unknown };
  replies?: unknown;
};

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function readNode(value: unknown, parentId: number | null): CommentNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid club comment');
  }
  const row = value as RawComment;
  const id = positiveId(row.id);
  if (id === null || typeof row.content !== 'string') {
    throw new Error('Invalid club comment');
  }
  const name = typeof row.author?.nickname === 'string'
    ? row.author.nickname
    : typeof row.author?.username === 'string'
      ? row.author.username
      : '—';
  return {
    id: String(id),
    parentId: parentId === null ? null : String(parentId),
    depth: parentId === null ? 0 : 1,
    author: { kind: 'named', name },
    content: row.content,
    createdAtLabel: typeof row.created_at === 'string' ? row.created_at : '',
  };
}

function readNodes(value: unknown): CommentNode[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid club comments');
  }
  const nodes: CommentNode[] = [];
  for (const rowValue of value) {
    const root = readNode(rowValue, null);
    nodes.push(root);
    const replies = (rowValue as RawComment).replies;
    if (replies !== undefined && !Array.isArray(replies)) {
      throw new Error('Invalid club comment replies');
    }
    for (const reply of replies ?? []) {
      nodes.push(readNode(reply, Number(root.id)));
    }
  }
  return nodes;
}

/** Reuses the public comment UI while keeping club API selection inside the club feature. */
export function useClubComments(target: ClubCommentTarget, targetId: number): {
  body: React.ReactNode;
  comments: DetailComments;
} {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const [nodes, setNodes] = React.useState<CommentNode[]>([]);
  const [draft, setDraft] = React.useState('');
  const [reply, setReply] = React.useState<CommentNode | null>(null);
  const [sending, setSending] = React.useState(false);
  const [notice, setNotice] = React.useState<'login' | 'denied' | 'sendFailed' | null>(null);
  const { pagination, dispatch } = useListPagination({ initial: { hasMore: false } });
  const epoch = React.useRef(0);
  const locked = React.useRef({ read: false, send: false });
  const draftRef = React.useRef(draft);
  const replyRef = React.useRef(reply);
  draftRef.current = draft;
  replyRef.current = reply;

  const load = React.useCallback(async (): Promise<void> => {
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || locked.current.read || locked.current.send) {
      return;
    }
    locked.current.read = true;
    const request = epoch.current;
    dispatch({ type: 'append:start' });
    try {
      const value = await (target === 'activity'
        ? getClubActivityComments(targetId)
        : getClubPostComments(targetId));
      if (request !== epoch.current) return;
      setNodes(readNodes(value));
      dispatch({ type: 'append:success', hasMore: false });
    } catch {
      if (request === epoch.current) {
        dispatch({ type: 'append:failure', error: { kind: 'unknown' } });
      }
    } finally {
      if (request === epoch.current) locked.current.read = false;
    }
  }, [dispatch, target, targetId]);

  React.useEffect(() => {
    epoch.current += 1;
    locked.current = { read: false, send: false };
    setNodes([]);
    setDraft('');
    setReply(null);
    setSending(false);
    setNotice(null);
    dispatch({ type: 'append:success', hasMore: false });
    void load();
    return () => { epoch.current += 1; };
  }, [dispatch, load]);

  const send = React.useCallback(async (): Promise<void> => {
    const content = draftRef.current.trim();
    const parent = replyRef.current;
    if (!content || locked.current.send) return;
    if (!session.isSignedIn) {
      setNotice('login');
      return;
    }
    const request = epoch.current;
    const originalDraft = draftRef.current;
    locked.current.send = true;
    setSending(true);
    setNotice(null);
    try {
      const payload = parent ? { content, parent_id: Number(parent.id) } : { content };
      const value = await (target === 'activity'
        ? createClubActivityComment(targetId, payload)
        : createClubPostComment(targetId, payload));
      if (request !== epoch.current) return;
      const node = readNode(value, parent ? Number(parent.id) : null);
      setNodes((current) => current.some((item) => item.id === node.id) ? current : [...current, node]);
      if (draftRef.current === originalDraft && replyRef.current?.id === parent?.id) {
        setDraft('');
        setReply(null);
      }
    } catch (error) {
      if (request !== epoch.current) return;
      const failure = classifyAuthFailure(error);
      if (isSessionInvalid(failure)) await session.handleAuthFailure(error);
      if (request === epoch.current) {
        setNotice(isSessionInvalid(failure) ? 'login' : failure === 'sanctioned' ? 'denied' : 'sendFailed');
      }
    } finally {
      if (request === epoch.current) {
        locked.current.send = false;
        setSending(false);
      }
    }
  }, [session, target, targetId]);

  const body = (
    <>
      {notice === 'login' ? <Button label={t('screen.campus.write.login')} onPress={() => router.push('/login' as never)} /> : null}
      {notice === 'denied' ? <Text role="body">{t('screen.campus.write.denied')}</Text> : null}
      {notice === 'sendFailed' ? <Text role="body">{t('screen.campus.write.sendFailed')}</Text> : null}
      <CommentComposer
        testID="club-composer"
        value={draft}
        onChangeText={setDraft}
        placeholder={t('screen.campus.write.placeholder')}
        sendLabel={t('screen.campus.write.send')}
        onSend={() => void send()}
        sending={sending}
        disabled={pagination.append === 'loading'}
        maxLength={500}
        replyContext={reply ? {
          kind: 'named',
          label: t('screen.campus.write.namedReply', { name: reply.author.kind === 'named' ? reply.author.name : '—' }),
          cancelLabel: t('action.cancel'),
          onCancel: () => setReply(null),
        } : undefined}
      />
    </>
  );

  return {
    body,
    comments: {
      nodes,
      pagination,
      onLoadMore: () => undefined,
      onRetry: () => void load(),
      title: t('screen.campus.read.comments'),
      onReply: (id) => {
        const next = nodes.find((node) => node.id === id && node.depth === 0);
        if (next) setReply(next);
      },
    },
  };
}
