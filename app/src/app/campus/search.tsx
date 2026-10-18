/**
 * `/campus/search` —— **旧独立搜索页，已废弃**（负责人 2026-10-18：搜索改为就地展开）
 *
 * 搜索现在在广场首页树洞模块顶部展开（`TreeholeSearchBar`）。旧深链统一回落到树洞模块。
 */

import * as React from 'react';
import { Redirect } from 'expo-router';

export default function CampusSearchRoute(): React.ReactElement {
  return <Redirect href={'/?tab=confession' as never} />;
}
