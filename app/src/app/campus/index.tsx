/**
 * `/campus` —— **旧独立壳，已废弃**（负责人 2026-10-18：重定向并清理旧壳）
 *
 * 树洞 / 万能墙的唯一壳是广场首页的模块（`SquareHome` → `CampusFeed`）。
 * 这里只保留一个**重定向**，让旧深链/旧回退路径仍然落到正确的模块，⛔ 不再渲染第二套顶栏 + Tab + 搜索 + 筛选。
 */

import * as React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CampusRoute(): React.ReactElement {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const target = tab === 'wall' ? '/?tab=wall' : '/?tab=confession';
  return <Redirect href={target as never} />;
}
