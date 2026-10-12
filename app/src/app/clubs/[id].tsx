import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ClubProfileScreen } from '@/features/clubs/ClubScreens';

export default function ClubProfileRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <ClubProfileScreen clubId={typeof id === 'string' ? id : ''} />;
}
