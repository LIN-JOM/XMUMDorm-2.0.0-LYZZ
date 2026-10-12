import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CampusListScreen } from '@/features/campus/CampusScreens';
import { QuickActionGrid, type QuickAction } from '@/components/ui/QuickActionGrid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import Utensils from 'lucide-react-native/icons/utensils';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Bike from 'lucide-react-native/icons/bike';
import BookOpen from 'lucide-react-native/icons/book-open';
import UsersRound from 'lucide-react-native/icons/users-round';
import { TAB_BAR_CLEARANCE } from './_layout';

/** 广场（一级 Tab 1）承接已批准的树洞与万能墙；其他广场区块留待 Phase 1 接线。 */
export default function SquareScreen(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const actions = React.useMemo<readonly QuickAction[]>(
    () => [
      { key: 'canteen', label: t('canteen.title'), icon: Utensils, onPress: () => router.push('/canteen') },
      { key: 'market', label: t('screen.market.title'), icon: ShoppingBag, onPress: () => router.push('/market') },
      { key: 'errand', label: t('screen.errand.title'), icon: Bike, onPress: () => router.push('/errand') },
      { key: 'guides', label: t('square.guides.title'), icon: BookOpen, onPress: () => router.push('/guides') },
      { key: 'clubs', label: t('clubs.title'), icon: UsersRound, onPress: () => router.push('/clubs' as never) },
    ],
    [router, t]
  );
  return (
    <CampusListScreen
      testID="screen-square"
      initialTab={tab === 'wall' ? 'wall' : 'confession'}
      beforeTabs={
        <View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
          <SectionHeader title={t('square.services')} />
          <QuickActionGrid testID="square-services" actions={actions} />
        </View>
      }
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
    />
  );
}
