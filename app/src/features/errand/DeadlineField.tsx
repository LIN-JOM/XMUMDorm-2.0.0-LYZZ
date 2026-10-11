import * as React from 'react';
import {View} from 'react-native';
import {DateTimeField} from '@/components/ui/DateTimeField';
import {useTheme} from '@/design-system/theme';
import {useI18n} from '@/i18n';
import {Text} from '@/components/ui/Text';
import type {FormFieldDescriptor} from '@/components/ui/FormField';
import type {MessageKey} from '@/i18n';

export function localDeadlineToISO(date: string, time: string): string | null {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
 const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 const value=new Date(year,month-1,day,hour,minute);
 if(value.getFullYear()!==year || value.getMonth()!==month-1 || value.getDate()!==day || value.getHours()!==hour || value.getMinutes()!==minute)return null;
 return value.toISOString();
}
function DeadlineField({value,onChange,disabled,labelKey,testIDPrefix}: {value:unknown;onChange:(value:unknown)=>void;disabled:boolean;labelKey:MessageKey;testIDPrefix:string}) {
 const theme=useTheme();const {t}=useI18n();
 let date='',time='';
 if(typeof value==='string'&&value){
  if(value.startsWith('local:'))[date,time]=value.slice(6).split('|');
  else {const d=new Date(value);if(Number.isFinite(d.getTime())){const pad=(n:number)=>String(n).padStart(2,'0');date=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;time=`${pad(d.getHours())}:${pad(d.getMinutes())}`;}}
 }
 const change=(nextDate:string,nextTime:string)=>onChange(!nextDate&&!nextTime?'':localDeadlineToISO(nextDate,nextTime)??`local:${nextDate}|${nextTime}`);
 return <View style={{gap:theme.space('space_2')}}><Text role="label">{t(labelKey)}</Text>
  <DateTimeField mode="date" value={date} onChange={next=>change(next,time)} disabled={disabled} testID={`${testIDPrefix}-date`}/>
  <DateTimeField mode="time" value={time} onChange={next=>change(date,next)} disabled={disabled} testID={`${testIDPrefix}-time`}/>
 </View>;
}
export function renderDateTime(labelKey: MessageKey, testIDPrefix: string): NonNullable<FormFieldDescriptor['render']> {
 return function RenderDateTime(api) {
  return <DeadlineField {...api} labelKey={labelKey} testIDPrefix={testIDPrefix}/>;
 };
}
export const renderDeadline = renderDateTime('publish.bing.deadline', 'errand-deadline');
