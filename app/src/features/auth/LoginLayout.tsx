import * as React from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/design-system/theme';
import { LoginArtwork } from './LoginArtwork';

/** 品牌装饰与真实表单分层；安全区和键盘仍由 Screen 处理。 */
export function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const theme = useTheme();
  const window = useWindowDimensions();
  const [viewport, setViewport] = React.useState({
    width: window.width,
    height: window.height,
  });
  const [formHeight, setFormHeight] = React.useState(0);
  const curveHeight = Math.min(
    viewport.width * 0.24,
    theme.space('space_12') * 2
  );
  // 常规竖屏保留草图的空白，长内容交给滚动；只在视口变矮时为基本操作收起空白。
  // 不能从视口减去整份表单，否则标签、错误或字体变高就会把曲线推到屏幕顶端。
  const blankHeight = Math.min(
    viewport.height * 0.32,
    Math.max(
      0,
      viewport.height -
        Math.min(formHeight, theme.touchTarget * 6) -
        curveHeight
    )
  );
  const backgroundColor = theme.color['bg-canvas'].value;
  const edgeId = React.useId().replace(/:/g, '');

  return (
    <Screen topMode="none" bottomMode="own" testID="login">
      <View
        testID="login-viewport"
        style={{ flex: 1 }}
        onLayout={({ nativeEvent: { layout } }) =>
          setViewport({ width: layout.width, height: layout.height })
        }
      >
        <ScrollView
          testID="login-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustKeyboardInsets={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View testID="login-brand-header" style={{ height: blankHeight + curveHeight }}>
            <View testID="login-logo-space" style={{ height: blankHeight }} />
            <LoginArtwork width={viewport.width} height={blankHeight + curveHeight} />
          </View>
          <View testID="login-front-layer" style={{ backgroundColor }}>
            <Svg
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              width="100%"
              height="100%"
              style={{ position: 'absolute' }}
            >
              <Defs>
                <LinearGradient id={edgeId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={theme.color['border-brand'].value} stopOpacity={0.14} />
                  <Stop offset="6%" stopColor={backgroundColor} stopOpacity={1} />
                  <Stop offset="94%" stopColor={backgroundColor} stopOpacity={1} />
                  <Stop offset="100%" stopColor={theme.color['border-brand'].value} stopOpacity={0.14} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${edgeId})`} />
            </Svg>
            <View
              testID="login-form-content"
              onLayout={({ nativeEvent: { layout } }) =>
                setFormHeight(layout.height)
              }
              style={{
                paddingHorizontal: theme.space('space_6'),
                paddingTop: theme.space('space_8'),
                paddingBottom: theme.space('space_4'),
                gap: theme.space('space_4'),
              }}
            >
              {children}
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
