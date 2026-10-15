import { Button, TextArea } from 'heroui-native';
import * as React from 'react';
import { Text, View } from 'react-native';
import type { CommentReplyContext } from '@/components/ui/CommentComposer';

type TreeholeComposerProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  sendLabel: string;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  maxLength?: number;
  replyContext?: CommentReplyContext;
  testID?: string;
};

/** Presentation-only HeroUI editor; comment writes and draft ownership remain in useCampusActions. */
export function TreeholeComposer({value,onChangeText,placeholder,sendLabel,onSend,sending,disabled,maxLength,replyContext,testID}:TreeholeComposerProps):React.ReactElement {
 const replyLabel=replyContext===undefined?null:replyContext.kind==='named'?replyContext.label:replyContext.anonymousLabel;
 const sendDisabled=disabled||sending||!value.trim()||(maxLength!==undefined&&value.length>maxLength);
 return <View testID={testID} style={{gap:8}}>
  {replyLabel?<View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{flex:1}} numberOfLines={1}>{replyLabel}</Text><Button testID={testID?`${testID}-cancel-reply`:undefined} size="sm" variant="ghost" onPress={replyContext?.onCancel} accessibilityLabel={replyContext?.cancelLabel}>{replyContext?.cancelLabel}</Button></View>:null}
  <TextArea testID={testID?`${testID}-input`:undefined} value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={placeholder} multiline maxLength={maxLength} isDisabled={disabled}/>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   {maxLength!==undefined?<Text accessibilityLiveRegion="polite">{`${value.length}/${maxLength}`}</Text>:<View/>}
   <Button testID={testID?`${testID}-send`:undefined} size="sm" variant="primary" onPress={onSend} isDisabled={sendDisabled} accessibilityState={{busy:sending,disabled:sendDisabled}}>{sendLabel}</Button>
  </View>
 </View>;
}
