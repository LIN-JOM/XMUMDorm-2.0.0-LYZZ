import { BottomSheet, Button, TextArea } from 'heroui-native';
import * as React from 'react';
import { Text, View } from 'react-native';

type Reason={value:string;label:string};
type TreeholeReportProps={visible:boolean;reasons:readonly Reason[];reason:string|null;detail:string;busy:boolean;message?:string;action?:{label:string;onPress:()=>void};labels:{title:string;detail:string;submit:string;cancel:string};onReason:(value:string)=>void;onDetail:(value:string)=>void;onSubmit:()=>void;onCancel:()=>void};

/** HeroUI sheet that projects the existing report state machine without owning report data or writes. */
export function TreeholeReport({visible,reasons,reason,detail,busy,message,action,labels,onReason,onDetail,onSubmit,onCancel}:TreeholeReportProps):React.ReactElement{
 return <BottomSheet isOpen={visible} onOpenChange={open=>{if(!open&&!busy)onCancel();}}>
  {visible?<BottomSheet.Portal><BottomSheet.Overlay testID="treehole-report-overlay"/><BottomSheet.Content testID="treehole-report-sheet" index={0} snapPoints={['65%']}><View style={{gap:12,padding:16}}><BottomSheet.Title>{labels.title}</BottomSheet.Title><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{reasons.map(item=><Button key={item.value} testID={`treehole-report-reason-${item.value}`} size="sm" variant={reason===item.value?'secondary':'ghost'} onPress={()=>onReason(item.value)} isDisabled={busy}>{item.label}</Button>)}</View><TextArea testID="treehole-report-detail" value={detail} onChangeText={onDetail} placeholder={labels.detail} accessibilityLabel={labels.detail} multiline maxLength={1000} isDisabled={busy}/>{message?<Text accessibilityLiveRegion="polite">{message}</Text>:null}{action?<Button variant="outline" onPress={action.onPress}>{action.label}</Button>:null}<Button testID="treehole-report-submit" variant="danger" onPress={onSubmit} isDisabled={!reason||busy}>{labels.submit}</Button><Button variant="ghost" onPress={onCancel} isDisabled={busy}>{labels.cancel}</Button></View></BottomSheet.Content></BottomSheet.Portal>:null}
 </BottomSheet>;
}
