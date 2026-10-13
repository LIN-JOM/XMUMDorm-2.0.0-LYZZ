import Input from '../../components/ui/Input';

function TimeSelect({ label, value, onChange, end = false, isZh }) {
  const [hour = '', minute = ''] = value.split(':');
  const values = count => Array.from({ length: count }, (_, i) => String(i).padStart(2, '0'));
  return <fieldset className="shop-time-select">
    <legend>{label}</legend>
    <div className="shop-time-parts">
      <label className="shop-field">{isZh ? '小时' : 'Hour'}
        <select required aria-label={`${label} ${isZh ? '小时' : 'hour'}`} value={hour}
          onChange={e => onChange(`${e.target.value}:${e.target.value === '24' ? '00' : minute || '00'}`)}>
          <option value="" disabled>--</option>
          {values(end ? 25 : 24).map(h => <option key={h} value={h}>{h === '24' ? (isZh ? '24（次日零点）' : '24 (midnight)') : h}</option>)}
        </select>
      </label>
      <span aria-hidden="true">:</span>
      <label className="shop-field">{isZh ? '分钟' : 'Minute'}
        <select required aria-label={`${label} ${isZh ? '分钟' : 'minute'}`} value={minute} disabled={hour === '24'}
          onChange={e => onChange(`${hour || '00'}:${e.target.value}`)}>
          <option value="" disabled>--</option>
          {values(60).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
    </div>
  </fieldset>;
}

export default function ShopOrderWindowFields({ draft, setDraft, isZh }) {
  const update = patch => setDraft(current => ({ ...current, ...patch }));
  return <>
    <Input id="edit-delivery_date" label={isZh ? '开放下单日期' : 'Order date'} required type="date"
      value={draft.delivery_date || ''} onChange={e => update({ delivery_date: e.target.value })} />
    <label className="shop-checkbox"><input type="checkbox" checked={!!draft.all_day}
      onChange={e => update({ all_day: e.target.checked })} />{isZh ? '全天' : 'All day'}</label>
    {draft.all_day ? <p role="status">{isZh ? '所选日期 00:00 至次日 00:00 均可下单（马来西亚时间）。' : 'Orders are open from 00:00 on the selected date until midnight (Malaysia time).'}</p> : <>
      <p>{isZh ? '24 小时制（马来西亚时间），例如下午 1 点选择 13:00。' : '24-hour clock (Malaysia time), e.g. 13:00 for 1 PM.'}</p>
      <TimeSelect label={isZh ? '开始时间' : 'Start time'} value={draft.delivery_start || ''} isZh={isZh} onChange={delivery_start => update({ delivery_start })} />
      <TimeSelect label={isZh ? '结束时间' : 'End time'} value={draft.delivery_end || ''} isZh={isZh} end onChange={delivery_end => update({ delivery_end })} />
      {draft.delivery_start && draft.delivery_end && draft.delivery_start >= draft.delivery_end && <p role="alert">{isZh ? '结束时间必须晚于开始时间；全天开放请勾选“全天”。' : 'End time must be later than start time; select All day for a full day.'}</p>}
    </>}
  </>;
}
