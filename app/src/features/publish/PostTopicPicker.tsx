import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/MultiSelect';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';

export type PostTopicPickerCopy = {
  searchPlaceholder: string;
  nameZh: string;
  nameEn: string;
  create: string;
  createFailed: string;
};

export type PostTopicPickerProps = {
  label: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** The current server result, not a client-filtered catalog. */
  options: readonly MultiSelectOption[];
  /** Previously selected rows stay visible when a later search narrows the result. */
  selectedOptions?: readonly MultiSelectOption[];
  onSearch: (term: string) => void;
  createTopic: (input: { name_zh: string; name_en: string }) => Promise<MultiSelectOption>;
  copy: PostTopicPickerCopy;
  disabled?: boolean;
  errorText?: string;
  testID?: string;
};

function mergeOptions(options: readonly MultiSelectOption[], selectedOptions: readonly MultiSelectOption[], value: readonly string[]): MultiSelectOption[] {
  const merged = new Map<string, MultiSelectOption>();
  for (const option of options) merged.set(option.value, option);
  for (const option of selectedOptions) {
    if (value.includes(option.value)) merged.set(option.value, option);
  }
  return [...merged.values()];
}

/**
 * Treehole's remote topic control. It stays inside the registered publish host:
 * form values contain only server IDs, while search and creation remain callbacks
 * owned by `useResolvedDescriptor`.
 */
export function PostTopicPicker({
  label,
  value,
  onChange,
  options,
  selectedOptions = [],
  onSearch,
  createTopic,
  copy,
  disabled = false,
  errorText,
  testID,
}: PostTopicPickerProps): React.ReactElement {
  const theme = useTheme();
  const [term, setTerm] = React.useState('');
  const [nameZh, setNameZh] = React.useState('');
  const [nameEn, setNameEn] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [createFailed, setCreateFailed] = React.useState(false);
  const creatingRef = React.useRef(false);
  const visibleOptions = React.useMemo(
    () => mergeOptions(options, selectedOptions, value),
    [options, selectedOptions, value]
  );

  React.useEffect(() => {
    const timeout = setTimeout(() => onSearch(term.trim()), 300);
    return () => clearTimeout(timeout);
  }, [onSearch, term]);

  const submitCreate = React.useCallback(async () => {
    const name_zh = nameZh.trim();
    const name_en = nameEn.trim();
    if (disabled || creatingRef.current || !name_zh || !name_en) return;
    creatingRef.current = true;
    setCreating(true);
    setCreateFailed(false);
    try {
      const created = await createTopic({ name_zh, name_en });
      onChange(value.includes(created.value) ? [...value] : [...value, created.value]);
      setNameZh('');
      setNameEn('');
    } catch {
      setCreateFailed(true);
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }, [createTopic, disabled, nameEn, nameZh, onChange, value]);

  return (
    <View style={{ gap: theme.space('space_3') }}>
      <SearchField
        testID={testID ? `${testID}-search` : undefined}
        value={term}
        onChangeText={setTerm}
        placeholder={copy.searchPlaceholder}
      />
      <MultiSelect
        testID={testID ? `${testID}-options` : undefined}
        label={label}
        options={visibleOptions}
        value={value}
        onChange={onChange}
        max={3}
        errorText={errorText}
        disabled={disabled}
      />
      <Input
        testID={testID ? `${testID}-name-zh` : undefined}
        label={copy.nameZh}
        value={nameZh}
        onChangeText={setNameZh}
        maxLength={100}
        disabled={disabled || creating}
      />
      <Input
        testID={testID ? `${testID}-name-en` : undefined}
        label={copy.nameEn}
        value={nameEn}
        onChangeText={setNameEn}
        maxLength={100}
        disabled={disabled || creating}
      />
      <Button
        testID={testID ? `${testID}-create` : undefined}
        label={copy.create}
        variant="secondary"
        size="small"
        loading={creating}
        disabled={disabled || !nameZh.trim() || !nameEn.trim()}
        onPress={() => void submitCreate()}
      />
      {createFailed ? (
        <Text testID={testID ? `${testID}-create-error` : undefined} role="caption" colorToken="text-danger">
          {copy.createFailed}
        </Text>
      ) : null}
    </View>
  );
}
