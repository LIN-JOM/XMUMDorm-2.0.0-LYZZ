import { SearchField } from 'heroui-native';
import * as React from 'react';

/** Treehole owns only search presentation; query timing and history remain in its screen. */
export function TreeholeSearchEntry({ value, onChangeText, onSubmit, placeholder, clearLabel, testID }: { value: string; onChangeText: (value: string) => void; onSubmit: () => void; placeholder: string; clearLabel: string; testID?: string }): React.ReactElement {
  return <SearchField testID={testID} value={value} onChange={onChangeText} animation="disable-all">
    <SearchField.Group>
      <SearchField.SearchIcon />
      <SearchField.Input placeholder={placeholder} returnKeyType="search" onSubmitEditing={onSubmit} />
      <SearchField.ClearButton testID={testID ? `${testID}-clear` : undefined} accessibilityLabel={clearLabel} />
    </SearchField.Group>
  </SearchField>;
}
