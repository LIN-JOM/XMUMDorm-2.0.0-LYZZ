import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/design-system/theme';
import { getUploadUrl } from '../../../../shared/api/config';

/** Shared domain media for shops and dishes; the surrounding card owns navigation. */
export function CanteenMedia({ uri, name, style, testID }: {
  uri: string | null; name: string; style?: StyleProp<ViewStyle>; testID?: string;
}): React.ReactElement {
  const theme = useTheme();
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  return <View testID={testID} style={[{ width: theme.touchTarget, height: theme.touchTarget, overflow: 'hidden', borderRadius: theme.radius('radius_small'), backgroundColor: theme.color['bg-sunken'].value }, style]}>
    {uri && !failed ? <Image testID={testID ? `${testID}-image` : undefined} source={{ uri: getUploadUrl(uri) }} style={{ width: '100%', height: '100%' }}
      contentFit="cover" accessibilityLabel={name} accessible onError={() => setFailed(true)} /> :
      <View testID={testID ? `${testID}-placeholder` : undefined} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Icon source={UtensilsCrossed} tint="secondary" label={name} />
      </View>}
  </View>;
}
