/**
 * 我的（`M-01`）—— **仪表盘**（P2C-03）
 *
 * ## 为什么这里没有 `src/proto/P7`
 * 组件定义 §2.7 明写 `P7 仪表盘`**没有独立模块**（它是"页面级组合"）→ 本文件就是那个组合。
 *
 * ## 四块内容与**分区降级**
 * 「当前/下一节课 + 今日待办 + 未读 + 等级进度」。四个数据源各自独立：
 * **哪一块挂了只降级哪一块**（`InlineNotice` + 重试），⛔ 不整屏报错 —— 否则"待办接口抖了一下"
 * 会把整页（包括还好的资料与课表）一起吞掉。
 *
 * ## 跨轨依赖（如实记账）
 * 今日课程用 `features/tools/timetable.ts` 的 `useTimetableWeek` —— 那是**乙的课表缓存**。
 * ⛔ 这里刻意不写第二份缓存（纪律 4：不新建第二套机制）；代价是「我的」依赖乙的模块，
 * 这条依赖是**单向只读**的（不 import 乙的页面，只用它的取数外壳与纯函数）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Pencil from 'lucide-react-native/icons/pencil';
import Settings from 'lucide-react-native/icons/settings';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ExpBar } from '@/components/ui/ExpBar';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { IconButton } from '@/components/ui/IconButton';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { TAB_BAR_CLEARANCE } from '@/app/(tabs)/_layout';
import { getMe } from '../../../../shared/api/users';
import { ME_ENTRIES, levelNameKey, normalizeProfile, visibleEntries, type MeProfile } from './profile';

type Loadable<T> = { data: T; loading: boolean; failed: boolean };

const EMPTY_PROFILE: MeProfile = {
  id: null,
  displayName: null,
  avatarUri: null,
  level: 1,
  progress: 0,
  progressText: null,
  college: null,
  grade: null,
  major: null,
};

export function MeScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  const [profile, setProfile] = React.useState<Loadable<MeProfile>>({
    data: EMPTY_PROFILE,
    loading: true,
    failed: false,
  });
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setProfile((prev) => ({ ...prev, loading: true, failed: false }));
    void (async () => {
      try {
        const payload = await getMe();
        if (!cancelled) setProfile({ data: normalizeProfile(payload), loading: false, failed: false });
      } catch {
        if (!cancelled) setProfile((prev) => ({ ...prev, loading: false, failed: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = React.useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  const entries = visibleEntries(ME_ENTRIES);

  return (
    <Screen
      testID="screen-me"
      titleKey="screen.me"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
      topBarActions={<>
        <IconButton testID="me-edit-entry" Icon={Pencil} accessibilityLabel={t('me.edit.entry')} onPress={() => router.push('/me/edit')} />
        <IconButton testID="me-settings-entry" Icon={Settings} accessibilityLabel={t('me.entry.settings')} onPress={() => router.push('/me/settings')} />
      </>}
    >
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        {/* ── 资料卡：头像 + 昵称 + 等级 + 经验 ─────────────────────── */}
        <Card testID="me-profile" variant="outlined" padding="space_4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_3') }}>
            <Avatar size="space_12" uri={profile.data.avatarUri ?? undefined} />
            <View style={{ flex: 1, gap: theme.space('space_1') }}>
              <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
                {profile.data.displayName ?? t('auth.signedOut')}
              </Text>
              <LevelBadge
                testID="me-level"
                level={profile.data.level}
                name={t(levelNameKey(profile.data.level))}
                variant="iconWithName"
              />
            </View>
          </View>
          <View style={{ marginTop: theme.space('space_3') }}>
            <ExpBar
              testID="me-exp"
              progress={profile.data.progress}
              text={profile.data.progressText ?? undefined}
              variant="full"
            />
          </View>
          {profile.failed ? (
            <InlineNotice
              testID="me-profile-failed"
              tone="warning"
              message={t('me.section.failed')}
              actionLabel={t('action.retry')}
              onAction={reload}
            />
          ) : null}
        </Card>

        {/* 只保留内容与管理入口；课表、待办和未读摘要属于工具、消息一级格。 */}
        {entries.length > 0 ? (
          <View style={{ gap: theme.space('space_2') }}>
            <SectionHeader title={t('me.entries.title')} />
            {entries.map((entry) => (
              <ListItem
                key={entry.key}
                testID={`me-entry-${entry.key}`}
                title={t(entry.labelKey)}
                variant="nav"
                onPress={() => router.push(entry.route as never)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
