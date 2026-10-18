import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ClubActivityDetailScreen } from '@/features/clubs/ClubScreens';

export default function ClubActivityRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <ClubActivityDetailScreen activityId={typeof id === 'string' ? id : ''} />;
}
