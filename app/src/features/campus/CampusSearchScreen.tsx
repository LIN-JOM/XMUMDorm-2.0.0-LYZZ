import * as React from 'react';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/ui/Screen';
import {Button} from 'heroui-native';
import {Text} from '@/components/ui/Text';
import {useI18n} from '@/i18n';
import {CampusFeed} from './CampusScreens';
import {TreeholeSearchEntry} from './TreeholeSearchEntry';

/** Business composition of P14; search never writes either browsing tab's state. */
export function CampusSearchScreen():React.ReactElement {
 const {t}=useI18n();const router=useRouter();
 const [draft,setDraft]=React.useState(''),[query,setQuery]=React.useState('');
 const [history,setHistory]=React.useState<string[]>([]);
 const submit=React.useCallback((value:string)=>{
  const next=value.trim().slice(0,200);
  setQuery(next);
  if(next)setHistory(items=>[next,...items.filter(item=>item!==next)].slice(0,5));
 },[]);
 // Keep requests quiet during typing; explicit submit bypasses the debounce.
 React.useEffect(()=>{
  const timer=setTimeout(()=>submit(draft),400);
  return()=>clearTimeout(timer);
 },[draft,submit]);
 const change=(value:string)=>{setDraft(value);setQuery('');};
 return <Screen titleKey="screen.campus.search.title" showMailbox={false} testID="campus-search">
  <Button size="sm" variant="ghost" onPress={()=>router.canGoBack()?router.back():router.replace('/campus' as never)}>{t('action.back')}</Button>
  <TreeholeSearchEntry value={draft} onChangeText={change} onSubmit={()=>submit(draft)}
   placeholder={t('screen.campus.search.placeholder')} clearLabel={t('screen.campus.search.clear')} testID="campus-search-field"/>
  <Button testID="campus-search-submit" size="sm" onPress={()=>submit(draft)}>{t('screen.campus.search.submit')}</Button>
  {query?<><Text role="label">{t('screen.campus.search.results')}</Text>
   <Button size="sm" variant="ghost" onPress={()=>change('')}>{t('screen.campus.search.change')}</Button>
   <CampusFeed key={query} kind="confession" query={query}/></>:<>
   <Text>{t('screen.campus.search.hint')}</Text>
   {history.length>0?<><Text role="label">{t('screen.campus.search.history')}</Text>
    {history.map(item=><Button key={item} size="sm" variant="ghost" onPress={()=>{setDraft(item);submit(item);}}>{item}</Button>) }
    <Button size="sm" variant="ghost" onPress={()=>setHistory([])}>{t('screen.campus.search.clearHistory')}</Button></>:null}
  </>}
 </Screen>;
}
