import * as React from 'react';
import { View } from 'react-native';
import { Screen, useScreenInsets, type ScreenProps } from './Screen';

export type FeatureScreenProps = ScreenProps & { embedded?: boolean };

/** 同页模块继承外层 Screen；独立路由仍拥有自己的顶栏和安全区。 */
export function FeatureScreen({ embedded = false, ...props }: FeatureScreenProps): React.ReactElement {
  if (embedded) return <EmbeddedContent {...props} />;
  return <Screen {...props} />;
}

function EmbeddedContent({ children, testID, style }: ScreenProps): React.ReactElement {
  // 防止模块在没有外层安全区容器时误用嵌入模式。
  useScreenInsets();
  return <View testID={testID} style={[{ flex: 1, minHeight: 0 }, style]}>{children}</View>;
}
