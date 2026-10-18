/**
 * 搜索关键词高亮（字面匹配：关键词里的标点**不会**被当成正则）
 *
 * 只负责"把命中的片段加粗"，排版参数（字阶/颜色/行数）由调用方注入 ——
 * 旧实现把 `numberOfLines={3}` 写死，导致搜索结果与列表正文的截断口径不一致。
 */

import * as React from 'react';
import { Text } from '@/components/ui/Text';
import type { TextColorToken, TextProps } from '@/components/ui/Text';

export type SearchHighlightProps = {
  value: string;
  query: string;
  role?: TextProps['role'];
  colorToken?: TextColorToken;
  numberOfLines?: number;
  testID?: string;
};

export function SearchHighlight({
  value,
  query,
  role,
  colorToken,
  numberOfLines,
  testID,
}: SearchHighlightProps): React.ReactElement {
  const pieces: React.ReactNode[] = [];
  const source = value.toLowerCase();
  const needle = query.toLowerCase();
  let cursor = 0;
  let index = needle ? source.indexOf(needle) : -1;
  while (index >= 0) {
    pieces.push(value.slice(cursor, index));
    pieces.push(
      <Text key={`${index}-${needle}`} role={role} emphasis="strong" testID="campus-search-match">
        {value.slice(index, index + query.length)}
      </Text>
    );
    cursor = index + query.length;
    index = source.indexOf(needle, cursor);
  }
  pieces.push(value.slice(cursor));
  return (
    <Text testID={testID} role={role} colorToken={colorToken} numberOfLines={numberOfLines}>
      {pieces}
    </Text>
  );
}
