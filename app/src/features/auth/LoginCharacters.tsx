import * as React from 'react';
import {
  Animated, AppState, Easing, Image, Platform, StyleSheet, View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from 'react-native-svg';

import { useTheme } from '@/design-system/theme';

const GIRL_OPEN = require('../../../assets/brand/login-motion-girl-open.png');
const GIRL_CLOSED = require('../../../assets/brand/login-motion-girl-closed.png');
const GOAT_OPEN = require('../../../assets/brand/login-motion-goat-open.png');
const GOAT_CLOSED = require('../../../assets/brand/login-motion-goat-closed.png');

const ART_SIZE = 1254;
type EyeRegion = { x: number; y: number; width: number; height: number };
// 原素材局部坐标：只覆盖眼睛，不切换人物身体、发丝或嘴部。
const GIRL_EYES: readonly EyeRegion[] = [
  { x: 375, y: 482, width: 126, height: 94 },
  { x: 542, y: 540, width: 111, height: 88 },
];
const GOAT_EYES: readonly EyeRegion[] = [
  { x: 815, y: 616, width: 55, height: 77 },
  { x: 944, y: 660, width: 88, height: 77 },
];
const GOAT_EAR = 'M1070 590 C1100 590 1150 608 1200 626 L1210 656 C1170 696 1110 683 1074 653 Z';
const GIRL_MOTION = { breath: 3800, scale: 1.008, blinkWait: 4200, pivot: '69%' } as const;
const GOAT_MOTION = { breath: 4600, scale: 1.012, blinkWait: 6700, pivot: '74%' } as const;
const useNativeDriver = Platform.OS !== 'web';

/** 装饰仅接收隐私布尔值，不接收密码。 */
export function LoginCharacters({ size, active, eyesClosed }: {
  size: number; active: boolean; eyesClosed: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const [foreground, setForeground] = React.useState(AppState.currentState === 'active');
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  const animate = active && foreground && !theme.reduceMotion;
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <CharacterSprite name="girl" size={size} open={GIRL_OPEN} closed={GIRL_CLOSED}
        motion={GIRL_MOTION} eyes={GIRL_EYES} animate={animate} eyesClosed={eyesClosed} />
      <CharacterSprite name="goat" size={size} open={GOAT_OPEN} closed={GOAT_CLOSED}
        motion={GOAT_MOTION} eyes={GOAT_EYES} animate={animate} eyesClosed={eyesClosed} />
    </View>
  );
}

function CharacterSprite({ name, size, open, closed, motion, eyes, animate, eyesClosed }: {
  name: 'girl' | 'goat'; size: number;
  open: ImageSourcePropType; closed: ImageSourcePropType;
  motion: typeof GIRL_MOTION | typeof GOAT_MOTION;
  eyes: readonly EyeRegion[]; animate: boolean; eyesClosed: boolean;
}): React.ReactElement {
  const [breath] = React.useState(() => new Animated.Value(0));
  const [blink] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!animate) return;
    const timing = (toValue: number) => Animated.timing(breath, {
      toValue, duration: motion.breath, easing: Easing.inOut(Easing.sin),
      useNativeDriver, isInteraction: false,
    });
    const loop = Animated.loop(Animated.sequence([timing(1), timing(0)]));
    loop.start();
    return () => { loop.stop(); breath.setValue(0); };
  }, [animate, breath, motion]);

  React.useEffect(() => {
    if (!animate) {
      blink.setValue(eyesClosed ? 1 : 0);
      return;
    }
    const timing = (toValue: number, duration: number) => Animated.timing(blink, {
      toValue, duration, easing: Easing.inOut(Easing.sin),
      useNativeDriver, isInteraction: false,
    });
    if (eyesClosed) {
      const closing = timing(1, 900);
      closing.start();
      return () => closing.stop();
    }
    // 不复位 Value：失焦或中途反向时从当前位置展开，循环边界也不跳帧。
    const loop = Animated.loop(Animated.sequence([
      timing(0, 1100), Animated.delay(motion.blinkWait),
      timing(1, 900), Animated.delay(450), timing(0, 1200), Animated.delay(1800),
    ]), { resetBeforeIteration: false });
    loop.start();
    return () => loop.stop();
  }, [animate, blink, eyesClosed, motion]);

  const openness = animate ? blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
    : eyesClosed ? 0 : 1;
  return (
    <Animated.View testID={`login-${name}-motion`} style={[StyleSheet.absoluteFill, {
      transformOrigin: ['50%', motion.pivot, 0],
      transform: [{ scaleY: animate ? breath.interpolate({
        inputRange: [0, 1], outputRange: [1, motion.scale],
      }) : 1 }],
    }]}>
      {name === 'goat' ? <GoatBody size={size} source={open} breath={breath} animate={animate} /> : (
        <Image testID="login-girl-base" source={open} accessible={false} fadeDuration={0}
          resizeMethod="scale" style={{ width: size, height: size, opacity: 1 }} />
      )}
      {eyes.map((region, index) => (
        <EyePatch key={index} testID={`login-${name}-eye-${index}`} region={region}
          size={size} open={open} closed={closed} openness={openness} />
      ))}
    </Animated.View>
  );
}

/** 睁眼区域逐渐压合，露出同位置的闭眼底片；人物外轮廓始终固定。 */
function EyePatch({ region, size, open, closed, openness, testID }: {
  region: EyeRegion; size: number; open: ImageSourcePropType; closed: ImageSourcePropType;
  openness: number | Animated.AnimatedInterpolation<number>; testID: string;
}): React.ReactElement {
  const unit = size / ART_SIZE;
  const imageStyle = { position: 'absolute' as const, width: size, height: size,
    left: -region.x * unit, top: -region.y * unit };
  return (
    <View style={{ position: 'absolute', left: region.x * unit, top: region.y * unit,
      width: region.width * unit, height: region.height * unit,
      borderRadius: region.height * unit / 2, overflow: 'hidden' }}>
      <Image source={closed} accessible={false} fadeDuration={0} resizeMethod="scale" style={imageStyle} />
      <Animated.View testID={testID} style={[StyleSheet.absoluteFill, {
        overflow: 'hidden',
        transformOrigin: ['50%', '50%', 0], transform: [{ scaleY: openness }],
      }]}>
        <Image source={open} accessible={false} fadeDuration={0} resizeMethod="scale" style={imageStyle} />
      </Animated.View>
    </View>
  );
}

/** 耳部从原图中独立裁出，围绕耳根连续摆动；原位置不留第二只耳朵。 */
function GoatBody({ size, source, breath, animate }: {
  size: number; source: ImageSourcePropType; breath: Animated.Value; animate: boolean;
}): React.ReactElement {
  const id = React.useId().replace(/:/g, '');
  return (
    <View testID="login-goat-base" style={[StyleSheet.absoluteFill, { opacity: 1 }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}>
        <Defs><ClipPath id={`${id}body`}><Path d={`M0 0H1254V1254H0Z ${GOAT_EAR}`}
          clipRule="evenodd" fillRule="evenodd" /></ClipPath></Defs>
        <SvgImage href={source} width={ART_SIZE} height={ART_SIZE} clipPath={`url(#${id}body)`} />
      </Svg>
      <Animated.View testID="login-goat-ear" style={[StyleSheet.absoluteFill, {
        transformOrigin: [1080 / ART_SIZE * size, 625 / ART_SIZE * size, 0],
        transform: [{ rotate: animate ? breath.interpolate({
          inputRange: [0, 1], outputRange: ['0deg', '-4deg'],
        }) : '0deg' }],
      }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}>
          <Defs><ClipPath id={`${id}ear`}><Path d={GOAT_EAR} /></ClipPath></Defs>
          <SvgImage href={source} width={ART_SIZE} height={ART_SIZE} clipPath={`url(#${id}ear)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
