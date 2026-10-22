import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/design-system/theme';

/** 拱边下方的窄幅反光，止于字段留白内；中央仍是完全不透明的主题底色。 */
export function LoginGlassSides(): React.ReactElement {
  const theme = useTheme();
  const gradientId = React.useId().replace(/:/g, '');
  const isDark = theme.scheme === 'dark';
  const edgeWidth = theme.space(isDark ? 'space_3' : 'space_4');
  // 夜间是窄银蓝反光 + 内侧烟灰层；浅色保留宽一些的乳白折射层。
  const stops = isDark
    ? [
        { offset: '0%', color: theme.color['bg-sunken'].value, opacity: 0.9 },
        { offset: '6%', color: theme.color['border-brand'].value, opacity: 0.6 },
        { offset: '18%', color: theme.color['bg-raised'].value, opacity: 0.9 },
        { offset: '48%', color: theme.color['bg-brand-soft'].value, opacity: 0.5 },
        { offset: '100%', color: theme.color['bg-canvas'].value, opacity: 0 },
      ]
    : [
        { offset: '0%', color: theme.color['border-strong'].value, opacity: 0.4 },
        { offset: '10%', color: theme.color['bg-raised'].value, opacity: 1 },
        { offset: '25%', color: theme.color['bg-brand-soft'].value, opacity: 1 },
        { offset: '50%', color: theme.color['bg-surface'].value, opacity: 1 },
        { offset: '100%', color: theme.color['bg-canvas'].value, opacity: 0 },
      ];

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
              {stops.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId}${side})`} />
        </Svg>
      ))}
    </View>
  );
}
