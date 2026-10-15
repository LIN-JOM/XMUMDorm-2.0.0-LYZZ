import { Button, Chip } from 'heroui-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

type TagOption={key:string;label:string};

/** HeroUI presentation for the existing tag filter state; selection remains owned by CampusFeed. */
export function TreeholeTagFilters({options,selected,onToggle,onClear,testID}:{options:readonly TagOption[];selected:readonly string[];onToggle:(key:string)=>void;onClear:()=>void;testID?:string}):React.ReactElement|null{
 if(!options.length)return null;
 return <View testID={testID} style={{flexDirection:'row',alignItems:'center'}}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{options.map(option=>{const active=selected.includes(option.key);return <Button key={option.key} testID={`filter-chip-${option.key}`} size="sm" variant={active?'secondary':'ghost'} onPress={()=>onToggle(option.key)} accessibilityRole="button" accessibilityState={{selected:active}}><Chip size="sm" variant={active?'soft':'primary'} color="accent"><Chip.Label>{option.label}</Chip.Label></Chip></Button>;})}</ScrollView>{selected.length?<Button testID="filter-chips-clear" size="sm" variant="ghost" onPress={onClear}>清除</Button>:null}</View>;
}
