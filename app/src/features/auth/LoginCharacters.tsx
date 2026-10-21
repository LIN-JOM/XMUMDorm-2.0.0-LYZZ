import * as React from 'react';
import {
  Animated,
  AppState,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { useTheme } from '@/design-system/theme';

const GIRL_OPEN = require('../../../assets/brand/login-motion-girl-open.png');
const GIRL_CLOSED = require('../../../assets/brand/login-motion-girl-closed.png');
const GOAT_OPEN = require('../../../assets/brand/login-motion-goat-open.png');
const GOAT_CLOSED = require('../../../assets/brand/login-motion-goat-closed.png');

// 插画导演参数：约一到两像素的呼吸，手/蹄接触点固定，不作为控件动效令牌。
const GIRL_MOTION = { breath: 2400, scale: 1.006, blinkWait: 4100, rest: 1700, pivot: '69%' } as const;
const GOAT_MOTION = { breath: 2900, scale: 1.01, blinkWait: 6300, rest: 1900, pivot: '74%' } as const;
const useNativeDriver = Platform.OS !== 'web';

/** 只接收隐私状态，不接收密码内容。背景和玻璃留在父组件静态层。 */
export function LoginCharacters({
  size,
  active,
  eyesClosed,
}: {
  size: number;
  active: boolean;
  eyesClosed: boolean;
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
        motion={GIRL_MOTION} animate={animate} eyesClosed={eyesClosed} />
      <CharacterSprite name="goat" size={size} open={GOAT_OPEN} closed={GOAT_CLOSED}
        motion={GOAT_MOTION} animate={animate} eyesClosed={eyesClosed} />
    </View>
  );
}

function CharacterSprite({ name, size, open, closed, motion, animate, eyesClosed }: {
  name: 'girl' | 'goat';
  size: number;
  open: ImageSourcePropType;
  closed: ImageSourcePropType;
  motion: typeof GIRL_MOTION | typeof GOAT_MOTION;
  animate: boolean;
  eyesClosed: boolean;
}): React.ReactElement {
  const [breath] = React.useState(() => new Animated.Value(0));
  const [blink] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!animate) return;
    const timing = (toValue: number) => Animated.timing(breath, {
      toValue,
      duration: motion.breath,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver,
      isInteraction: false,
    });
    const loop = Animated.loop(Animated.sequence([timing(1), timing(0)]));
    loop.start();
    return () => {
      loop.stop();
      breath.setValue(0);
    };
  }, [animate, breath, motion]);

  React.useEffect(() => {
    if (!animate || eyesClosed) return;
    const timing = (toValue: number, duration: number) => Animated.timing(blink, {
      toValue, duration, useNativeDriver, isInteraction: false,
      easing: Easing.inOut(Easing.quad),
    });
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(motion.blinkWait), timing(1, 80),
      Animated.delay(100), timing(0, 120), Animated.delay(motion.rest),
    ]));
    loop.start();
    return () => {
      loop.stop();
      blink.setValue(0);
    };
  }, [animate, blink, eyesClosed, motion]);

  const still = !animate || eyesClosed;
  return (
    <Animated.View
      testID={`login-${name}-motion`}
      style={[StyleSheet.absoluteFill, {
        transformOrigin: ['50%', motion.pivot, 0],
        transform: [{ scaleY: animate ? breath.interpolate({
          inputRange: [0, 1], outputRange: [1, motion.scale],
        }) : 1 }],
      }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, {
        opacity: still ? (eyesClosed ? 0 : 1) : blink.interpolate({
          inputRange: [0, 1], outputRange: [1, 0],
        }),
      }]}>
        <Image source={open} accessible={false} fadeDuration={0} resizeMode="contain"
          resizeMethod="scale" style={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View testID={`login-${name}-closed`} style={[StyleSheet.absoluteFill, {
        opacity: still ? (eyesClosed ? 1 : 0) : blink,
      }]}>
        <Image source={closed} accessible={false} fadeDuration={0} resizeMode="contain"
          resizeMethod="scale" style={{ width: size, height: size }} />
      </Animated.View>
    </Animated.View>
  );
}
