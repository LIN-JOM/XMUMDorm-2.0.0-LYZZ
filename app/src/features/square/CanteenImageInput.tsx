import * as React from 'react';
import { View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import { Image } from 'expo-image';
import { IconButton } from '@/components/ui/IconButton';
import { MediaPicker, type PickedImage, type PickResult } from '@/components/ui/MediaPicker';
import { useI18n } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import type { MessageKey } from '@/i18n';

export function CanteenImageInput({ images, onChange, pickImage, limit, disabled, testID, unavailableKey = 'canteen.review.imagesUnavailable' }: {
  images: readonly PickedImage[]; onChange: (images: readonly PickedImage[]) => void; pickImage?: () => Promise<PickResult>;
  limit: number; disabled?: boolean; testID: string; unavailableKey?: MessageKey;
}): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  return <View style={{ gap: theme.space('space_2') }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
      {images.map((image, index) => <View key={`${image.uri}:${index}`} style={{ gap: theme.space('space_1') }}>
        <Image source={{ uri: image.uri }} style={{ width: theme.touchTarget * 2, height: theme.touchTarget * 2 }} contentFit="cover" accessible accessibilityLabel={t('canteen.review.images')} />
        <IconButton testID={`${testID}-remove-${index}`} Icon={X} disabled={disabled} accessibilityLabel={t('canteen.review.removeImage')} onPress={() => onChange(images.filter((_, current) => current !== index))} />
      </View>)}
    </View>
    {images.length < limit ? <MediaPicker testID={`${testID}-add`} value={null} disabled={disabled} onPick={pickImage}
      onChange={(image) => { if (image && images.length < limit) onChange([...images, image]); }}
      maxBytes={8 * 1024 * 1024} allowGif={false} pickLabel={t('canteen.review.pickImage')} removeLabel={t('canteen.review.removeImage')}
      unavailableLabel={t(unavailableKey)} failureLabel={t('canteen.review.pickFailed')} tooLargeLabel={t('canteen.review.imageTooLarge')} gifNotAllowedLabel={t('canteen.review.imageFormat')} /> : null}
  </View>;
}
