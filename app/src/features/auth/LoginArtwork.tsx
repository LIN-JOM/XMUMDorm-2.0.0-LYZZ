import * as React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/design-system/theme';

const LOGIN_HERO_LIGHT = require('../../../assets/brand/login-hero-sharp.png');
const LOGIN_HERO_DARK = require('../../../assets/brand/login-hero-dark.png');
// 素材是正方形；卡片两侧的接触线位于图高约 81%，不是间距或字体数值。
const CARD_CONTACT = 0.81;

/** 静态品牌画与玻璃边沿；不包含任何输入、文字或按钮。 */
export function LoginArtwork({
  width,
  height,
}: {
  width: number;
  height: number;
}): React.ReactElement {
  const theme = useTheme();
  const artSize = Math.max(width, height / CARD_CONTACT);
  const isDark = theme.scheme === 'dark';
  // 夜间素材本身已经是烟灰玻璃，仅在接缝处短距离收口，保留细反光而不叠宽雾带。
  const fadeHeight = Math.min(height, theme.space(isDark ? 'space_4' : 'space_12'));
  const fadeId = React.useId().replace(/:/g, '');
  const canvas = theme.color['bg-canvas'].value;

  return (
    <View
      testID="login-background-layer"
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <Image
        testID="login-brand-art"
        source={isDark ? LOGIN_HERO_DARK : LOGIN_HERO_LIGHT}
        accessible={false}
        fadeDuration={0}
        resizeMode="contain"
        // 保留本地原图的解码细节，让硬件完成缩放，避免 Android 自动选用低分辨率采样。
        resizeMethod="scale"
        style={{
          position: 'absolute',
          width: artSize,
          height: artSize,
          left: (width - artSize) / 2,
          top: height - artSize * CARD_CONTACT,
        }}
      />
      {/* 图中只保留静态折射边沿，往内过渡到真实主题底色；表单中心始终不透明。 */}
      <Svg
        aria-hidden
        width="100%"
        height={fadeHeight}
        style={{ position: 'absolute', bottom: 0 }}
      >
        <Defs>
          <LinearGradient id={fadeId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={canvas} stopOpacity={0} />
            <Stop offset="45%" stopColor={canvas} stopOpacity={0.15} />
            <Stop offset="100%" stopColor={canvas} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
      </Svg>
    </View>
  );
}
