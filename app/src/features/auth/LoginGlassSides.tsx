import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/design-system/theme';

/** 拱边下方的窄幅反光，止于字段留白内；中央仍是完全不透明的主题底色。 */
export function LoginGlassSides(): React.ReactElement {
  const theme = useTheme();
  const gradientId = React.useId().replace(/:/g, '');
  const edgeWidth = theme.space('space_4');

  return (
    <View
      testID="login-glass-sides"
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {(['left', 'right'] as const).map((side) => (
        <Svg
          key={side}
          width={edgeWidth}
          height="100%"
          style={{
            position: 'absolute',
            top: 0,
            [side]: 0,
            transform: [{ scaleX: side === 'right' ? -1 : 1 }],
          }}
        >
          <Defs>
            <LinearGradient id={`${gradientId}${side}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={theme.color['border-strong'].value} stopOpacity={0.4} />
              <Stop offset="10%" stopColor={theme.color['bg-raised'].value} />
              <Stop offset="25%" stopColor={theme.color['bg-brand-soft'].value} />
              <Stop offset="50%" stopColor={theme.color['bg-success-soft'].value} />
              <Stop offset="100%" stopColor={theme.color['bg-canvas'].value} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId}${side})`} />
        </Svg>
      ))}
    </View>
  );
}
