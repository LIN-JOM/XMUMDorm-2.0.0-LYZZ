import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '@shared/api/shop';
import { useAuth } from '../../context/AuthContextState';
import { useLanguage } from '../../context/LanguageContextState';
import Button from '../../components/ui/Button';
import './Shop.css';
import ShopCoupons from './ShopCoupons';

export default function ShopStoreAdmin(){
 const {user}=useAuth();
 const {isZh}=useLanguage();
 const t=(zh,en)=>isZh?zh:en;
 const [message,setMessage]=useState('');
 const [couponStore,setCouponStore]=useState(null);
 const qc=useQueryClient();
 const stores=useQuery({queryKey:['shop','admin','stores'],queryFn:shopApi.adminStores,enabled:user?.role==='admin',retry:false});
 const remove=useMutation({mutationFn:shopApi.deleteStore,onSuccess:()=>{setMessage(t('店铺已删除，历史订单和付款记录已保留。','Store deleted. Historical orders and payment records were preserved.'));qc.invalidateQueries({queryKey:['shop']});},onError:error=>setMessage(error.message)});
 if(user?.role!=='admin')return <section className="shop-page"><h1>{t('需要管理员权限','Admin access required')}</h1><Link to="/shop">{t('返回商城','Back to shop')}</Link></section>;
 return <section className="shop-page">
  <header className="shop-heading"><h1>{t('商城店铺管理','Shop store management')}</h1><Link to="/myzone/admin">{t('管理员后台','Admin panel')}</Link></header>
  <p>{t('可删除任意店铺。删除会立即下架店铺并保留历史订单和付款记录。','Admins can remove any store. Removal immediately takes it offline while preserving historical orders and payment records.')}</p>
  {message&&<p role="status" className="shop-notice">{message}</p>}
  {stores.isLoading&&<p role="status">{t('正在加载店铺…','Loading stores…')}</p>}
  {stores.error&&<p role="alert">{t('店铺列表加载失败：','Unable to load stores: ')}{stores.error.message}<Button variant="outline" onClick={()=>stores.refetch()}>{t('重试','Retry')}</Button></p>}
  {stores.data?.map(store=><article className="shop-order shop-store-admin-row" key={store.id}>
   <div><strong>{isZh?store.name_zh:store.name_en}</strong><p>{store.slug} · {store.enabled?t('营业中','Enabled'):t('已停用','Disabled')}</p></div>
   {store.enabled?<Link to={`/shop/store/${store.slug}`}>{t('查看店铺','View store')}</Link>:<span>{t('店铺已停用','Store disabled')}</span>}
   <Button variant="outline" onClick={()=>setCouponStore(store)}>{t('优惠券','Coupons')}</Button><Button variant="danger" loading={remove.isPending&&remove.variables===store.id} disabled={remove.isPending} onClick={()=>{if(window.confirm(t(`确定删除「${store.name_zh}」吗？店铺会下架，历史订单和付款记录保留。`,`Delete “${store.name_en}”? The store will go offline; historical orders and payment records will be kept.`)))remove.mutate(store.id);}}>{t('删除店铺','Delete store')}</Button>
  </article>)}
  {couponStore&&<div className="shop-order"><h2>{isZh?couponStore.name_zh:couponStore.name_en}</h2><Button variant="outline" onClick={()=>setCouponStore(null)}>{t('关闭','Close')}</Button><ShopCoupons key={couponStore.slug} slug={couponStore.slug} isZh={isZh}/></div>}
  {stores.data?.length===0&&<p>{t('目前没有营业中的店铺。','There are no active stores.')}</p>}
 </section>;
}
