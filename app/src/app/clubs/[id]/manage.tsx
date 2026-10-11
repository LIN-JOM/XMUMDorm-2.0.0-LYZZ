import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ClubManageScreen } from '@/features/clubs/ClubScreens';

export default function ClubManageRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <ClubManageScreen clubId={typeof id === 'string' ? id : ''} />;
}
