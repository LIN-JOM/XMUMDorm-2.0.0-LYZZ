import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ClubPostDetailScreen } from '@/features/clubs/ClubScreens';

export default function ClubPostRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <ClubPostDetailScreen postId={typeof id === 'string' ? id : ''} />;
}
