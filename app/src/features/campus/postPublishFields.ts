import type {FormValues,FormFieldDescriptor,FormOption} from '@/components/ui/FormField';
import {validateAll} from '@/components/ui/Form';
import type {Translate} from '@/i18n';
import {fieldsOf,type PublishFormDescriptor} from '@/features/publish/descriptor';
import {getQueryClient} from '@/shared/queryClient';
const invalid='publish.bing.invalid' as const;
const text=(max:number)=>(value:unknown)=>typeof value==='string'&&value.trim().length<=max?undefined:invalid;
const idOf=(result:unknown)=>{const id=(result as {id?:unknown})?.id;if(typeof id!=='number'||!Number.isSafeInteger(id)||id<=0)throw {kind:'unknown'};return id;};
function validate(d:PublishFormDescriptor,values:FormValues){if(Object.keys(validateAll(fieldsOf(d),values)).length)throw {kind:'validation'};}
type FieldRender=NonNullable<FormFieldDescriptor['render']>;
type MediaRender=FieldRender;
import {Platform} from 'react-native';
import {createPost} from '../../../../shared/api/posts';
import {isValidPublishImages} from '@/features/publish/images';
import {POST_CONTENT_ORIGINS,POST_REPOST_SOURCES,POST_REPOST_SOURCE_MAX_LENGTH,normalizePostRepostSource} from '../../../../shared/constants/postAttribution';

export function createPostPublishDescriptor(t:Translate,options:{tags:readonly FormOption[];renderMedia:MediaRender;renderTags?:FieldRender}):PublishFormDescriptor {
 const d:PublishFormDescriptor={id:'confession',semantic:'create',listAfterSubmit:'/',mediaFields:['images'],sections:[{title:'publish.entry.confession',fields:[
 {kind:'text',name:'title',labelKey:'publish.bing.title',required:true,maxLength:120,validate:text(120)},
 {kind:'textarea',name:'content',labelKey:'publish.bing.content',required:true,validate:v=>typeof v==='string'?undefined:invalid},
 {kind:'segmented',name:'contentOrigin',labelKey:'publish.treehole.declaration',required:true,source:{kind:'constants',options:POST_CONTENT_ORIGINS.map(value=>({value,label:t(value==='original'?'publish.treehole.original':'publish.treehole.repost')}))},validate:v=>typeof v==='string'&&POST_CONTENT_ORIGINS.includes(v)?undefined:invalid},
 {kind:'select',name:'repostSource',labelKey:'publish.treehole.source',required:true,
  source:{kind:'constants',options:[...POST_REPOST_SOURCES.map(value=>({value,label:value})),{value:'custom',label:t('publish.treehole.custom')}]},
  visibleWhen:values=>values.contentOrigin==='repost',validate:v=>v==='custom'||typeof v==='string'&&POST_REPOST_SOURCES.includes(v)?undefined:invalid},
 {kind:'text',name:'customRepostSource',labelKey:'publish.treehole.customSource',placeholderKey:'publish.treehole.sourcePlaceholder',required:true,maxLength:POST_REPOST_SOURCE_MAX_LENGTH,
  visibleWhen:values=>values.contentOrigin==='repost'&&values.repostSource==='custom',validate:v=>normalizePostRepostSource(v)!==null?undefined:'publish.treehole.sourceInvalid'},
 options.renderTags
   ? {kind:'custom',name:'tagIds',labelKey:'publish.bing.tags',initialValue:[],render:options.renderTags,validate:v=>Array.isArray(v)&&v.length<=3&&new Set(v).size===v.length&&v.every(x=>options.tags.some(o=>o.value===x)&&/^[1-9]\d*$/.test(String(x)))?undefined:invalid}
   : {kind:'multiselect',name:'tagIds',labelKey:'publish.bing.tags',max:3,source:{kind:'remote',options:options.tags},validate:v=>Array.isArray(v)&&v.length<=3&&new Set(v).size===v.length&&v.every(x=>options.tags.some(o=>o.value===x)&&/^[1-9]\d*$/.test(String(x)))?undefined:invalid},
 {kind:'custom',name:'images',labelKey:'publish.bing.images',neverDraft:true,render:options.renderMedia,validate:v=>isValidPublishImages(v,3,true)?undefined:invalid},
 ]}],submit:async values=>{
  validate(d,values);
  const repostSource=values.contentOrigin==='repost'?normalizePostRepostSource(values.repostSource==='custom'?values.customRepostSource:values.repostSource):null;
  const id=idOf(await createPost({title:String(values.title).trim(),content:String(values.content).trim(),type:'normal',contentOrigin:values.contentOrigin,repostSource,tagIds:(values.tagIds as string[]).map(Number),images:Array.isArray(values.images)?await Promise.all(values.images.map(async ({uri,name,type})=>{if(Platform.OS!=='web')return {uri,name,type};const response=await fetch(uri);if(!response.ok)throw {kind:'content'};return new File([await response.blob()],name,{type});})):[]}));
  getQueryClient().removeQueries({queryKey:['posts','infinite']});return {id};
 },routeAfterSubmit:r=>r?.id?`/campus/${r.id}?published=1`:'/'};
 return d;
}
