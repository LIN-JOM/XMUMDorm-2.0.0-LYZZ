import { Avatar, Button, Card } from 'heroui-native';
import * as React from 'react';
import { Text, View } from 'react-native';
import { canReplyTo, groupComments, REPLY_PREVIEW_COUNT, type CommentNode, type CommentThreadLabels, visibleReplies } from '@/components/ui/CommentThread';

type TreeholeCommentThreadProps={nodes:readonly CommentNode[];labels:CommentThreadLabels;onReply?:(id:string)=>void;onRetry?:()=>void;retryLabel?:string;showRetry?:boolean;footer?:React.ReactNode;testID?:string};

function author(node:CommentNode,anonymous:string):React.ReactElement{
 if(node.author.kind==='anonymous')return <Text>{anonymous}</Text>;
 return <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Avatar size="sm" accessibilityLabel={node.author.name}>{node.author.avatarUri?<Avatar.Image source={{uri:node.author.avatarUri}}/>:null}<Avatar.Fallback>{node.author.name.slice(0,1)}</Avatar.Fallback></Avatar><Text>{node.author.name}</Text>{node.author.levelLabel?<Text>{node.author.levelLabel}</Text>:null}</View>;
}

/** HeroUI presentation for the existing two-level comment projection; it never reads or writes the API. */
export function TreeholeCommentThread({nodes,labels,onReply,onRetry,retryLabel,showRetry=false,footer,testID}:TreeholeCommentThreadProps):React.ReactElement{
 const [expanded,setExpanded]=React.useState<ReadonlySet<string>>(new Set());
 return <View testID={testID} style={{gap:8}}>{groupComments(nodes).map(group=>{
  const isExpanded=expanded.has(group.root.id),replies=visibleReplies(group.replies,isExpanded),hidden=group.replies.length-replies.length;
  const renderNode=(node:CommentNode,depth:0|1)=><Card key={node.id} testID={testID?`${testID}-${node.id}`:undefined} variant="transparent" animation="disable-all"><Card.Header>{author(node,labels.anonymous)}<Text>{node.createdAtLabel}</Text></Card.Header><Card.Body><Card.Description>{node.content}</Card.Description></Card.Body>{depth===0&&onReply&&canReplyTo(node.depth)?<Card.Footer><Button size="sm" variant="ghost" onPress={()=>onReply(node.id)} accessibilityLabel={labels.replyLabel}>{labels.replyLabel}</Button></Card.Footer>:null}</Card>;
  return <View key={group.root.id} style={{gap:8}}>{renderNode(group.root,0)}{replies.length?<View style={{paddingLeft:24,gap:8}}>{replies.map(reply=>renderNode(reply,1))}</View>:null}{group.replies.length>REPLY_PREVIEW_COUNT?<Button testID={testID?`${testID}-${group.root.id}-toggle`:undefined} size="sm" variant="ghost" onPress={()=>setExpanded(current=>{const next=new Set(current);if(next.has(group.root.id))next.delete(group.root.id);else next.add(group.root.id);return next;})}>{hidden>0?labels.moreReplies(hidden):labels.collapse}</Button>:null}</View>;
 })}{showRetry&&onRetry&&retryLabel?<Button testID={testID?`${testID}-retry`:undefined} variant="outline" onPress={onRetry}>{retryLabel}</Button>:null}{footer}</View>;
}
