import ShopProductImage from './ShopProductImage';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const makeMethod = () => ({
 id: globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 name_zh: '', name_en: '', qr_url: '',
});

export default function ShopSettingsFields({draft,setDraft,isZh,slug,onUploadStateChange,uploading}){
 const t=(a,b)=>isZh?a:b;
 const methods=draft.payment_methods||[];
 const update=(index,field,value)=>setDraft(current=>({...current,payment_methods:(current.payment_methods||[]).map((row,i)=>i===index?{...row,[field]:value}:row)}));
 return <section aria-label={t('收款方式','Payment methods')}>
  <h3>{t('收款方式','Payment methods')}</h3>
  <p className="shop-preserve">{t('每种收款方式只需填写中英文名称并上传对应二维码。上传的图片不会自动验证收款信息，请先自行扫码确认。','For each payment method, enter its Chinese and English names and upload the matching QR image. The image cannot verify payment details; scan it yourself before saving.')}</p>
  {methods.map((row,index)=><fieldset className="shop-order" key={row.id||index}>
   <Input id={`payment-${index}-name-zh`} label={t('中文名称','Chinese name')} required value={row.name_zh||''} onChange={e=>update(index,'name_zh',e.target.value)}/>
   <Input id={`payment-${index}-name-en`} label={t('英文名称','English name')} required value={row.name_en||''} onChange={e=>update(index,'name_en',e.target.value)}/>
   <ShopProductImage slug={slug} onUploadStateChange={onUploadStateChange} payment value={row.qr_url||''} isZh={isZh} onChange={value=>update(index,'qr_url',value)}/>
   <Button type="button" disabled={uploading} variant="outline" onClick={()=>setDraft(current=>({...current,payment_methods:(current.payment_methods||[]).filter((_,i)=>i!==index)}))}>{t('移除','Remove')}</Button>
  </fieldset>)}
  <Button type="button" disabled={uploading} variant="outline" onClick={()=>setDraft(current=>({...current,payment_methods:[...(current.payment_methods||[]),makeMethod()]}))}>{t('添加付款方式','Add payment method')}</Button>
 </section>;
}
