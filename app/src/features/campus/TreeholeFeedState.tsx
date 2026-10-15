import { Button, Card, Skeleton } from 'heroui-native';
import * as React from 'react';
import type { AppError } from '@/i18n/errors';
import { toErrorCopy } from '@/i18n/errors';
import { useI18n } from '@/i18n';

type TreeholeFeedStateProps={state:'loading'|'empty'|'error';title:string;actionLabel:string;error?:AppError|null;onAction:()=>void;testID?:string};

/** HeroUI state surface for the treehole stream; pagination and retry ownership stay in CampusFeedData. */
export function TreeholeFeedState({state,title,actionLabel,error,onAction,testID}:TreeholeFeedStateProps):React.ReactElement{
 const {t}=useI18n();const copy=state==='error'?toErrorCopy(error??{kind:'unknown'},t):null;
 if(state==='loading')return <Card testID={testID} variant="transparent" animation="disable-all"><Card.Body><Skeleton style={{height:96}}/><Skeleton style={{height:72}}/><Skeleton style={{height:88}}/></Card.Body></Card>;
 return <Card testID={testID} variant="default" animation="disable-all"><Card.Body><Card.Title>{copy?.perceive??title}</Card.Title>{copy?.objectLabel?<Card.Description>{copy.objectLabel}</Card.Description>:null}{copy?<Card.Description>{copy.understand}</Card.Description>:null}<Button testID={testID?`${testID}-action`:undefined} variant={state==='error'?'outline':'primary'} onPress={onAction}>{copy?.fix??actionLabel}</Button></Card.Body></Card>;
}
