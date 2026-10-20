import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/design-system/theme';

// 草图的相对坐标：宽 390、高 100，两侧低、中间缓缓隆起；不是字体或间距令牌。
const CURVE_EDGE =
  'M 0 100 C 54 60 72 22 120 22 C 164 22 208 12 236 14 C 292 18 338 52 390 100';

/** 登录专用布局：底层预留 Logo，表层容纳曲面与表单。安全区与键盘仍由 Screen 处理。 */
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

  return (
    <Screen topMode="none" bottomMode="own" testID="login">
      <View
        testID="login-viewport"
        style={{ flex: 1 }}
        onLayout={({ nativeEvent: { layout } }) =>
          setViewport({ width: layout.width, height: layout.height })
        }
      >
        <View
          testID="login-background-layer"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { backgroundColor }]}
        />
        <ScrollView
          testID="login-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustKeyboardInsets={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            testID="login-logo-space"
            pointerEvents="none"
            style={{ height: blankHeight }}
          />
          <View testID="login-front-layer">
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ height: curveHeight }}
            >
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 390 100"
                preserveAspectRatio="none"
              >
                <Path
                  d={`${CURVE_EDGE} L 390 100 L 0 100 Z`}
                  fill={backgroundColor}
                />
                <Path
                  d={CURVE_EDGE}
                  fill="none"
                  stroke={theme.color['border-strong'].value}
                  strokeWidth={theme.borderWidth('border_width_hairline')}
                />
              </Svg>
            </View>
            <View
              testID="login-form-content"
              onLayout={({ nativeEvent: { layout } }) =>
                setFormHeight(layout.height)
              }
              style={{
                backgroundColor,
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
