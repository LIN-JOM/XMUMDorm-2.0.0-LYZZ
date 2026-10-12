import { useEffect, useRef } from 'react';
import { Check, ShoppingBag, Clock3, MapPin, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import { money, localized } from './shopLabels';
import './ShopOrderSuccess.css';

export default function ShopOrderSuccess({ order, merchant, isZh, onView, onContinue }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.closest('.shop-success')?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, []);
  const t = (zh, en) => isZh ? zh : en;
  const steps = [t('下单成功', 'Order placed'), t('付款核实', 'Verify payment'), t('商家备货', 'Preparation')];
  return <section className="shop-success" aria-labelledby="shop-success-title">
    <div className="shop-success-hero">
      <div className="shop-success-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
      <div className="shop-success-bag" aria-hidden="true"><ShoppingBag size={58} strokeWidth={1.7} /><span><Check size={25} strokeWidth={3} /></span></div>
      <p className="shop-success-kicker">{t('校园好物 · 轻松送达', 'Campus essentials, made easy')}</p>
      <h2 id="shop-success-title" tabIndex={-1} ref={heading}>{t('下单成功！', 'Order placed!')}</h2>
      <p>{t('付款截图已上传，等待商家核实', 'Payment screenshot uploaded. Awaiting merchant verification.')}</p>
      <span className="shop-success-status"><Clock3 size={14} />{t('待商家核实', 'Awaiting merchant verification')}</span>
    </div>
    <div className="shop-success-body">
      <ol className="shop-success-steps" aria-label={t('订单进度', 'Order progress')}>{steps.map((step, i) => <li key={step} className={i === 0 ? 'is-complete' : ''} aria-current={i === 1 ? 'step' : undefined}><span>{i === 0 ? <Check size={16} /> : i + 1}</span>{step}</li>)}</ol>
      <div className="shop-success-receipt">
        <div className="shop-success-total"><div><p>{localized(merchant, 'name', isZh) || t('校园商城', 'Campus shop')}</p><small>{t('订单', 'Order')} #{order.id}</small></div><strong>{money(order.total_cents)}</strong></div>
        <div className="shop-success-detail"><Clock3 size={19} /><div><small>{t('已选配送时段', 'Selected delivery slot')}</small><p>{order.slot_json.delivery_date} · {localized(order.slot_json, 'label', isZh)}</p></div></div>
        <div className="shop-success-detail"><MapPin size={19} /><div><small>{t('送达宿舍', 'Deliver to')}</small><p>{order.address_json.building} / {order.address_json.room}</p></div></div>
      </div>
      <p className="shop-success-hint">{t('截图上传成功不代表付款已核实，商家核实后会更新订单状态。', 'Uploading a receipt does not confirm payment. Your merchant will update the order after verification.')}</p>
      <div className="shop-success-actions"><Button className="shop-success-primary" iconRight={<ArrowRight size={18} />} onClick={onView}>{t('查看订单', 'View order')}</Button><Button variant="ghost" onClick={onContinue}>{t('继续逛逛', 'Keep shopping')}</Button></div>
    </div>
  </section>;
}
