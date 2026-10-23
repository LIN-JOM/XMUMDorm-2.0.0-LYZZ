import {money} from './shopLabels';
export default function ShopOrderAmounts({order,isZh}) {
  const t=(zh,en)=>isZh?zh:en;
  return <div className="shop-order-amounts">
    <div className="shop-line"><span>{t('商品原价','Subtotal')}</span><span>{money(order.subtotal_cents??order.total_cents)}</span></div>
    {!!order.discount_cents&&<><div className="shop-line"><span>{t('优惠减免','Coupon discount')}</span><span>− {money(order.discount_cents)}</span></div><p className="shop-coupon-code">{t('优惠码','Coupon')}: {order.coupon_json?.code}</p></>}
    <div className="shop-line"><strong>{t('应付金额','Amount due')}</strong><strong>{money(order.total_cents)}</strong></div>
  </div>;
}
