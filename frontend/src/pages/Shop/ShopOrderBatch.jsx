import { useRef, useState } from 'react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { statuses } from './shopLabels';
import { advanceOrderSteps, nextOrderStatus, selectedOrderSteps } from './shopBatchOrders';

export default function ShopOrderBatch({ orders, api, isZh, disabled, refresh, children }) {
  const t = (zh, en) => isZh ? zh : en;
  const [selection, setSelection] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [refreshError, setRefreshError] = useState(false);
  const eligible = orders.filter(order => nextOrderStatus(order.status));
  const selected = selectedOrderSteps(orders, selection);
  const locked = disabled || busy || !!confirmation || refreshError;
  const label = value => statuses[value]?.[isZh ? 0 : 1] || value;
  const execute = async () => {
    if (running.current || !confirmation?.length) return;
    running.current = true;
    setBusy(true);
    setResults(null);
    setRefreshError(false);
    setProgress(0);
    try {
      const outcome = await advanceOrderSteps(confirmation, api.status, setProgress);
      setResults(outcome);
      // Explicitly select again after failures; never retry a freshly computed "next" step.
      setSelection({});
      try { await refresh(); } catch { setRefreshError(true); }
    } finally {
      setConfirmation(null);
      running.current = false;
      setBusy(false);
    }
  };
  const groups = (confirmation || []).reduce((map, step) => {
    map[step.from] = (map[step.from] || 0) + 1;
    return map;
  }, {});
  return <>
    <div className="shop-batch-toolbar" aria-label={t('批量管理订单', 'Bulk order management')}>
      <label className="shop-order-select"><input type="checkbox" disabled={locked || !eligible.length}
        checked={eligible.length > 0 && selected.length === eligible.length}
        ref={node => { if (node) node.indeterminate = selected.length > 0 && selected.length < eligible.length; }}
        onChange={event => setSelection(event.target.checked ? Object.fromEntries(eligible.map(o => [o.id, o.status])) : {})}/>
        {t('全选可推进订单', 'Select all actionable orders')}</label>
      <span>{t(`已选 ${selected.length} 单`, `${selected.length} selected`)}</span>
      <Button disabled={locked || !selected.length} onClick={() => setConfirmation(selected)}>{t('批量推进', 'Advance selected')}</Button>
      <Button variant="outline" disabled={locked || !selected.length} onClick={() => setSelection({})}>{t('取消选择', 'Clear selection')}</Button>
      <p>{t('全选当前已加载的订单，每单只前进一步；已完成、已取消的订单不参与。', 'Select loaded orders and advance each by one step. Completed and cancelled orders are excluded.')}</p>
    </div>
    {results && <div className="shop-notice shop-batch-result" role="status">
      <p>{t(`处理完成：成功 ${results.filter(r => r.success).length} 单，失败 ${results.filter(r => !r.success).length} 单。`, `Finished: ${results.filter(r => r.success).length} succeeded, ${results.filter(r => !r.success).length} failed.`)}</p>
      {results.some(r => !r.success) && <><p>{t('请核对失败订单的最新状态，再重新勾选处理。', 'Check the latest status of failed orders before selecting them again.')}</p><ul>{results.filter(r => !r.success).map(r => <li key={r.id}>#{r.id}：{r.message}</li>)}</ul></>}
    </div>}
    {refreshError && <p role="alert">{t('状态刷新失败，请刷新页面核实结果后再操作。', 'Could not refresh orders. Reload and verify the results before continuing.')}</p>}
    {children({ locked: locked || refreshError, checkbox: order => <label className="shop-order-select"><input type="checkbox"
      aria-label={t(`选择订单 #${order.id}`, `Select order #${order.id}`)} disabled={locked || refreshError || !nextOrderStatus(order.status)}
      checked={selected.some(step => step.id === order.id)}
      onChange={event => setSelection(current => ({ ...current, [order.id]: event.target.checked ? order.status : undefined }))}/>
      <span>#{order.id}</span></label> })}
    <Modal open={!!confirmation} onClose={() => !busy && setConfirmation(null)} title={t('确认批量推进', 'Confirm batch update')}>
      <p>{t(`将更新 ${confirmation?.length || 0} 张订单：`, `Update ${confirmation?.length || 0} orders:`)}</p>
      <ul>{Object.entries(groups).map(([from, count]) => <li key={from}>{label(from)} → {label(nextOrderStatus(from))}：{count}</li>)}</ul>
      {groups.pending_verification && <p role="alert">{t('包含确认收款：请先逐单核实付款截图及实际到账。批量确认不会自动核实到账。', 'Includes payment verification: check each receipt and actual payment first. Bulk confirmation does not verify payments automatically.')}</p>}
      {groups.delivering && <p>{t('请确认这些配送中的订单已实际送达。', 'Confirm that these delivering orders have actually arrived.')}</p>}
      {busy && <p role="status">{t(`正在处理 ${progress} / ${confirmation.length}，请勿关闭页面。`, `Processing ${progress} / ${confirmation.length}. Keep this page open.`)}</p>}
      <div className="shop-actions"><Button disabled={busy || disabled} onClick={execute}>{t('确认推进', 'Confirm update')}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>{t('返回核对', 'Go back')}</Button></div>
    </Modal>
  </>;
}
