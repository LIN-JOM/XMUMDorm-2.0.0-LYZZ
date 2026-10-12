import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
export default function ReceiptViewer({api,order,isZh}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>()=>{if(url) URL.revokeObjectURL(url);},[url]);
 if(!order.has_proof)return <p>{isZh?'尚未上传付款截图':'No receipt uploaded'}</p>;
 return <div>{!url&&<Button variant="outline" onClick={async()=>{try{setUrl(URL.createObjectURL(await api.receipt(order.id)));}catch(e){setError(e.message);}}}>{isZh?'查看付款截图':'View receipt'}</Button>}{url&&<img className="shop-receipt" src={url} alt={isZh?'付款截图':'Payment receipt'}/ >}{error&&<p role="alert">{error}</p>}</div>;
}
