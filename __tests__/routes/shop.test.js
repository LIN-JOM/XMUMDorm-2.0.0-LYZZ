const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sharp = require('sharp');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
jest.mock('../../database', () => {
  const shopQuery = jest.fn();
  const accountQuery = jest.fn();
  return {
    query: (sql, ...args) => sql === 'SELECT status FROM users WHERE id = ? LIMIT 1'
      ? accountQuery(sql, ...args) : shopQuery(sql, ...args),
    shopQuery, accountQuery, pool: { getConnection: jest.fn() },
  };
});
const { shopQuery: query, accountQuery, pool } = require('../../database');
const service = require('../../services/shop');
const app = express();app.use(express.json());app.use('/api/shop',require('../../routes/shop'));
const token = (role='student') => jwt.sign({id:1,role},process.env.JWT_SECRET);
const authed = (method,path,role='student') => request(app)[method]('/api/shop'+path).set('Authorization',`Bearer ${token(role)}`);
const product={category:'water',name_zh:'演示',name_en:'Demo',spec_zh:'1瓶',spec_en:'1 bottle',description_zh:'演示商品',description_en:'Demo only',image_url:'/shop-demo/water.svg',price_cents:100,stock:3,sold_out:false,is_demo:true};
beforeEach(()=>{jest.clearAllMocks();accountQuery.mockReset().mockResolvedValue([{status:'active'}]);query.mockImplementation(async sql => {
  if(sql.includes('FROM shop_merchants'))return [{id:1,slug:'water-home',enabled:1}];
  if(sql.includes('user_sanctions'))return [];
  if(sql.includes('SELECT role'))return [{role:'student',status:'active'}];
  return [];
});});
describe('shop public and authorization contracts',()=>{
  test('deactivated account is rejected before shop access',async()=>{
    accountQuery.mockResolvedValueOnce([{status:'deactivated'}]);
    const res=await authed('get','/address');
    expect(res.status).toBe(403);expect(res.body.accountDeactivated).toBe(true);
    expect(query.mock.calls.some(([sql])=>sql.includes('shop_addresses'))).toBe(false);
  });
  test('public catalog returns products, settings and available slots',async()=>{
    const today=service.campusNow().slice(0,10);
    query.mockResolvedValueOnce([{id:1,slug:'water-home',enabled:1}]).mockResolvedValueOnce([product]).mockResolvedValueOnce([{id:2,delivery_date:today,delivery_start:'00:00:00',delivery_end:'23:59:59',capacity:2,is_special:1,enabled:1}]).mockResolvedValueOnce([{payment_zh:'演示',payment_methods:[{id:'qr'}]}]).mockResolvedValueOnce([{slot_id:2,n:1}]);
    const res=await request(app).get('/api/shop/catalog');expect(res.status).toBe(200);expect(res.body.data.slots).toHaveLength(1);expect(res.body.data.slots[0].is_special).toBe(1);expect(res.body.data.order_window_open).toBe(true);expect(res.body.data.settings.payment_methods).toEqual([{id:'qr'}]);expect(query.mock.calls.some(([sql])=>sql.includes('shop_daily_schedules'))).toBe(false);
  });
  test('public catalog hides payment methods outside the open date and time',async()=>{
    query.mockResolvedValueOnce([{id:1,slug:'water-home',enabled:1}]).mockResolvedValueOnce([product]).mockResolvedValueOnce([{id:2,delivery_date:'2099-01-01',delivery_start:'10:00:00',delivery_end:'12:00:00',capacity:2,is_special:1,enabled:1}]).mockResolvedValueOnce([{payment_zh:'',payment_methods:[{id:'qr'}]}]).mockResolvedValueOnce([]);
    const res=await request(app).get('/api/shop/catalog');expect(res.status).toBe(200);expect(res.body.data.has_scheduled_slots).toBe(true);expect(res.body.data.order_window_open).toBe(false);expect(res.body.data.slots).toEqual([]);expect(res.body.data.settings.payment_methods).toEqual([]);expect(res.body.data.settings.has_payment_methods).toBe(true);
  });
  test('database failure returns generic error',async()=>{query.mockRejectedValueOnce(new Error('private data'));const spy=jest.spyOn(console,'error').mockImplementation(()=>{});const res=await request(app).get('/api/shop/catalog');expect(res.status).toBe(500);expect(JSON.stringify(res.body)).not.toContain('private data');spy.mockRestore();});
  test.each([['get','/cart'],['get','/address'],['get','/orders'],['get','/orders/1'],['get','/requests/abcdefghijklmnop'],['put','/cart/1'],['post','/orders'],['post','/orders/1/reorder'],['get','/admin/products'],['get','/admin/slots'],['get','/admin/special-slots'],['get','/admin/orders'],['put','/admin/products/new'],['put','/admin/slots/new'],['put','/admin/special-slots/new'],['put','/admin/settings'],['patch','/admin/orders/1/status']])('%s %s requires login',async(method,path)=>{expect((await request(app)[method]('/api/shop'+path)).status).toBe(401);});
  test.each([['get','/admin/products'],['get','/admin/slots'],['get','/admin/special-slots'],['get','/admin/orders'],['put','/admin/products/new'],['put','/admin/slots/new'],['put','/admin/special-slots/new'],['put','/admin/settings'],['patch','/admin/orders/1/status']])('student cannot %s %s',async(method,path)=>{expect((await authed(method,path)).status).toBe(403);});
  test('revoked admin JWT does not grant access',async()=>{expect((await authed('get','/admin/orders','admin')).status).toBe(403);});
  test('address defaults to null',async()=>{expect((await authed('get','/address')).body.data).toBeNull();});
  test('cart amount is calculated from stored prices',async()=>{query.mockImplementation(async sql=>sql.includes('FROM shop_merchants')?[{id:1,slug:'water-home',enabled:1}]:sql.includes('JOIN shop_products')?[{price_cents:123,quantity:2}]:[]);expect((await authed('get','/cart')).body.data.total_cents).toBe(246);});
  test('non-owned order is hidden',async()=>{expect((await authed('get','/orders/1')).status).toBe(404);});
  test('missing checkout fields are rejected',async()=>{expect((await authed('post','/orders').send({})).status).toBe(400);});
  test('invalid cart quantity is rejected before a transaction',async()=>{expect((await authed('put','/cart/1').send({quantity:-1})).status).toBe(400);expect(pool.getConnection).not.toHaveBeenCalled();});
  test('invalid history page is rejected',async()=>{expect((await authed('get','/orders?page=-2')).status).toBe(400);});
  test('request recovery is scoped to user',async()=>{const res=await authed('get','/requests/abcdefghijklmnop');expect(res.status).toBe(200);expect(query).toHaveBeenLastCalledWith(expect.stringContaining('user_id = ?'),[1,1,'abcdefghijklmnop']);});
  test('invalid recovery key rejected',async()=>{expect((await authed('get','/requests/no')).status).toBe(400);});
  test('receipt upload rejects unsupported HEIC with conversion guidance',async()=>{
    const res=await authed('post','/orders/1/proof').attach('proof',Buffer.from('not-an-image'),{filename:'phone-photo.heic',contentType:'image/heic'});
    expect(res.status).toBe(400);expect(res.body.message).toMatch(/HEIC.*JPG/i);expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test('receipt upload normalizes mobile AVIF photos to JPEG before storage',async()=>{
    const image=await sharp({create:{width:2,height:2,channels:3,background:'#e0b000'}}).avif().toBuffer();
    const execute=jest.fn().mockResolvedValueOnce([[{id:1,status:'pending_verification'}]]).mockResolvedValueOnce([{}]);
    const conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn(),execute};pool.getConnection.mockResolvedValue(conn);
    const res=await authed('post','/orders/1/proof').attach('proof',image,{filename:'phone-photo.avif',contentType:'image/avif'});
    expect(res.status).toBe(200);expect(execute.mock.calls[1][1][1]).toBe('image/jpeg');expect(execute.mock.calls[1][1][2].subarray(0,3)).toEqual(Buffer.from([0xff,0xd8,0xff]));
  });
});
describe('shop validation and atomic service',()=>{
  test.each([NaN,1.5,-1,'1',Infinity])('reject invalid integer %s',v=>{expect(()=>service.integer(v)).toThrow();});
  test('sanitizes text',()=>expect(service.text('<b>Demo</b>',20)).toBe('Demo'));
  test('valid product',()=>expect(service.product(product).price_cents).toBe(100));
  test.each([{category:'invalid'},{image_url:'javascript:alert(1)'},{price_cents:0},{stock:-1},{sold_out:1}])('invalid product %s',changes=>expect(()=>service.product({...product,...changes})).toThrow());
  test('valid slot',()=>expect(service.slot({delivery_date:'2099-01-01',cutoff_at:'2099-01-01T16:00:00',label_zh:'演示',label_en:'Demo',capacity:2,enabled:true,is_demo:true}).cutoff_at).toBe('2099-01-01 16:00:00'));
  test('specific-date slot is open without merchant capacity or status settings',()=>expect(service.specialSlot({delivery_date:'2099-01-01',delivery_start:'10:30',delivery_end:'12:00',label_zh:'指定日期配送',label_en:'Special delivery'})).toMatchObject({delivery_date:'2099-01-01',delivery_start:'10:30:00',delivery_end:'12:00:00',capacity:100000,enabled:1}));
  test('order window includes its start and excludes its end',()=>{
    const slot={delivery_date:'2026-10-12',delivery_start:'10:00:00',delivery_end:'12:00:00'};
    expect(service.isSpecialSlotOpen(slot,'2026-10-12 10:00:00')).toBe(true);
    expect(service.isSpecialSlotOpen(slot,'2026-10-12 11:59:59')).toBe(true);
    expect(service.isSpecialSlotOpen(slot,'2026-10-12 12:00:00')).toBe(false);
    expect(service.isSpecialSlotOpen(slot,'2026-10-12 09:59:59')).toBe(false);
    expect(service.isSpecialSlotOpen(slot,'2026-10-13 10:30:00')).toBe(false);
  });
  test.each([{delivery_date:'2099-02-30'},{delivery_start:'25:00'},{delivery_end:'09:00'}])('rejects invalid specific-date window %s',changes=>expect(()=>service.specialSlot({delivery_date:'2099-01-01',delivery_start:'10:00',delivery_end:'12:00',label_zh:'指定日期配送',label_en:'Special delivery',capacity:12,enabled:true,...changes})).toThrow());
  test.each(['2099-02-30','2099-99-99','tomorrow'])('invalid date %s',date=>expect(()=>service.slot({delivery_date:date,cutoff_at:'2099-01-01 16:00:00',label_zh:'演示',label_en:'Demo',capacity:1,enabled:true,is_demo:true})).toThrow());
  test('JSON snapshots decoded',()=>expect(service.decode({items_json:'[1]'}).items_json).toEqual([1]));
  test('transaction commits and releases',async()=>{const conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn()};pool.getConnection.mockResolvedValue(conn);expect(await service.transaction(async()=>5)).toBe(5);expect(conn.commit).toHaveBeenCalled();expect(conn.release).toHaveBeenCalled();});
  test('transaction failure rolls back and releases',async()=>{const conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn()};pool.getConnection.mockResolvedValue(conn);await expect(service.transaction(async()=>{throw Error('test');})).rejects.toThrow('test');expect(conn.rollback).toHaveBeenCalled();expect(conn.commit).not.toHaveBeenCalled();expect(conn.release).toHaveBeenCalled();});
  test('deactivated user cannot write',async()=>{const conn={execute:jest.fn().mockResolvedValue([[{id:1,status:'deactivated'}]])};await expect(service.lockUser(conn,1)).rejects.toThrow();});
  test('checkout rejects legacy and recurring dates that were not explicitly opened',async()=>{
    const execute=jest.fn().mockResolvedValueOnce([[{id:1,status:'active'}]]).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{id:4,merchant_id:1,is_special:0,enabled:1,delivery_date:'2099-01-01',cutoff_at:'2099-01-01 10:00:00'}]]);
    const conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn(),execute};pool.getConnection.mockResolvedValue(conn);
    await expect(service.checkout(1,{address:{contact_name:'Demo',contact:'demo@example.test',building:'A',room:'1'},slot_id:4,expected_total_cents:100},'explicit-date-key-1234',1)).rejects.toMatchObject({status:409});
    expect(execute).toHaveBeenCalledTimes(3);expect(conn.rollback).toHaveBeenCalled();
  });
  test('checkout rejects a specific-date slot outside its configured date and time window',async()=>{
    const execute=jest.fn().mockResolvedValueOnce([[{id:1,status:'active'}]]).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{id:4,merchant_id:1,is_special:1,enabled:1,delivery_date:'2099-01-01',delivery_start:'10:00:00',delivery_end:'12:00:00'}]]);
    const conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn(),execute};pool.getConnection.mockResolvedValue(conn);
    await expect(service.checkout(1,{address:{contact_name:'Demo',contact:'demo@example.test',building:'A',room:'1'},slot_id:4,expected_total_cents:100},'explicit-date-key-1234',1)).rejects.toMatchObject({status:409,message:expect.stringContaining('下单时段')});
    expect(execute).toHaveBeenCalledTimes(3);expect(conn.rollback).toHaveBeenCalled();
  });
  test('invalid state never opens transaction',async()=>{await expect(service.changeStatus(1,'paid')).rejects.toThrow();expect(pool.getConnection).not.toHaveBeenCalled();});
});

describe('receipt deletion and merchant payment image permissions',()=>{
  const mockTx=rows=>{
    const execute=jest.fn().mockResolvedValueOnce([rows]).mockResolvedValue([{}]);
    const conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn(),execute};
    pool.getConnection.mockResolvedValue(conn);return conn;
  };
  const allowMerchant=()=>query.mockImplementation(async sql=>{
    if(sql.includes('FROM shop_merchants'))return [{id:1,slug:'water-home',enabled:1}];
    if(sql.includes('SELECT role'))return [{role:'merchant',status:'active'}];
    if(sql.includes('shop_merchant_members'))return [{user_id:1}];
    return [];
  });
  test('merchant settings save does not require obsolete delivery-rule text',async()=>{
    allowMerchant();const conn=mockTx([]);
    const res=await authed('put','/admin/settings','merchant').send({payment_zh:'',payment_en:'',payment_methods:[],delivery_zones:[]});
    expect(res.status).toBe(200);expect(conn.execute).toHaveBeenCalledTimes(1);
    const [sql,params]=conn.execute.mock.calls[0];expect(sql).toContain("delivery_notice_zh,delivery_notice_en");expect(sql).not.toContain("delivery_notice_zh = VALUES");expect(params).toHaveLength(5);
  });
  test.each([['get','/admin/daily-schedule'],['put','/admin/daily-schedule'],['get','/admin/slots'],['put','/admin/slots/new']])('old recurring or generic schedule API is unavailable: %s %s',async(method,path)=>{
    allowMerchant();expect((await authed(method,path,'merchant').send({})).status).toBe(404);
  });
  test('receipt deletion requires login',async()=>expect((await request(app).delete('/api/shop/orders/1/proof')).status).toBe(401));
  test('owner can delete pending receipt atomically and repeatedly',async()=>{
    const conn=mockTx([{id:1,status:'pending_verification'}]);
    expect((await authed('delete','/orders/1/proof')).status).toBe(200);
    expect(conn.execute.mock.calls[0][1]).toEqual([1,1,1]);
    expect(conn.execute.mock.calls[1]).toEqual(['DELETE FROM shop_payment_proofs WHERE order_id=?',[1]]);
    expect(conn.commit).toHaveBeenCalled();
  });
  test('other users or stores cannot delete a receipt',async()=>{const conn=mockTx([]);expect((await authed('delete','/orders/1/proof')).status).toBe(404);expect(conn.execute).toHaveBeenCalledTimes(1);expect(conn.rollback).toHaveBeenCalled();});
  test.each(['confirmed','preparing','delivering','completed','cancelled'])('receipt deletion rejects %s orders',async status=>{const conn=mockTx([{id:1,status}]);expect((await authed('delete','/orders/1/proof')).status).toBe(409);expect(conn.execute).toHaveBeenCalledTimes(1);});
  test('student cannot upload merchant payment codes',async()=>{expect((await authed('post','/admin/payment-images').attach('image',Buffer.from('x'),'qr.png')).status).toBe(403);});
  test('merchant cannot upload into another store',async()=>{query.mockImplementation(async sql=>sql.includes('FROM shop_merchants')?[{id:1}]:sql.includes('SELECT role')?[{role:'merchant',status:'active'}]:[]);expect((await authed('post','/admin/payment-images').attach('image',Buffer.from('x'),'qr.png')).status).toBe(403);});
  test('payment QR rejects forged image bytes',async()=>{allowMerchant();expect((await authed('post','/admin/payment-images','merchant').attach('image',Buffer.from('invalid'),{filename:'qr.png',contentType:'image/png'})).status).toBe(400);});
  test('payment QR rejects files larger than five megabytes',async()=>{allowMerchant();expect((await authed('post','/admin/payment-images','merchant').attach('image',Buffer.alloc(5*1024*1024+1),{filename:'qr.png',contentType:'image/png'})).status).toBe(400);});
  test('merchant QR is decoded and stored under its own store',async()=>{
    allowMerchant();const fs=require('fs');const mkdir=jest.spyOn(fs.promises,'mkdir').mockResolvedValue();const write=jest.spyOn(fs.promises,'writeFile').mockResolvedValue();
    try{const png=await sharp({create:{width:3,height:3,channels:3,background:'#ffffff'}}).png().toBuffer();const r=await authed('post','/admin/payment-images','merchant').attach('image',png,{filename:'qr.png',contentType:'image/png'});expect(r.status).toBe(200);expect(r.body.data.url).toMatch(/^\/api\/shop\/assets\/payment\/1\/[a-f0-9]+\.png$/);expect((await sharp(write.mock.calls[0][1]).metadata()).format).toBe('png');}finally{mkdir.mockRestore();write.mockRestore();}
  });
  test('store member can create a specific-date delivery window',async()=>{
    allowMerchant();query.mockImplementation(async sql=>{
      if(sql.includes('FROM shop_merchants'))return [{id:1,slug:'water-home',enabled:1}];
      if(sql.includes('SELECT role'))return [{role:'merchant',status:'active'}];
      if(sql.includes('shop_merchant_members'))return [{user_id:1}];
      if(sql.includes('INSERT INTO shop_slots'))return {insertId:42};
      return [];
    });
    const res=await authed('put','/admin/special-slots/new','merchant').send({delivery_date:'2099-01-01',delivery_start:'10:30',delivery_end:'12:00',label_zh:'指定日期配送',label_en:'Special delivery'});
    expect(res.status).toBe(200);expect(res.body.data.id).toBe(42);
    expect(query.mock.calls.find(([sql])=>sql.includes('INSERT INTO shop_slots'))[1]).toEqual([1,'2099-01-01','10:30:00','12:00:00','指定日期配送 10:30-12:00','Special delivery 10:30-12:00','2099-01-01 10:30:00',100000,1]);
  });
});

describe('24-hour and all-day order windows', () => {
  const body = {delivery_date:'2026-10-13',label_zh:'开放下单',label_en:'Order window'};
  test('all day derives complete boundaries on the server', () => {
    expect(service.specialSlot({...body,all_day:true,delivery_start:'12:59',delivery_end:'13:00'}))
      .toMatchObject({delivery_start:'00:00:00',delivery_end:'24:00:00'});
  });
  test.each(['2026-10-13 00:00:00','2026-10-13 12:59:00','2026-10-13 23:59:59'])('all day includes %s', now => {
    expect(service.isSpecialSlotOpen(service.specialSlot({...body,all_day:true}),now)).toBe(true);
  });
  test.each(['2026-10-12 23:59:59','2026-10-14 00:00:00'])('all day excludes %s', now => {
    expect(service.isSpecialSlotOpen(service.specialSlot({...body,all_day:true}),now)).toBe(false);
  });
  test('late evening is valid, including the last minute before midnight', () => {
    const slot=service.specialSlot({...body,delivery_start:'13:00',delivery_end:'24:00'});
    expect(service.isSpecialSlotOpen(slot,'2026-10-13 12:59:59')).toBe(false);
    expect(service.isSpecialSlotOpen(slot,'2026-10-13 13:00:00')).toBe(true);
    expect(service.isSpecialSlotOpen(slot,'2026-10-13 23:59:59')).toBe(true);
  });
  test.each([
    {delivery_start:'24:00',delivery_end:'24:00'},
    {delivery_start:'12:59',delivery_end:'24:01'},
    {delivery_start:'13:00',delivery_end:'12:59'},
    {delivery_start:'12:60',delivery_end:'13:00'},
    {all_day:'true'}, {all_day:true,delivery_date:'2026-02-30'},
  ])('rejects invalid window %j', invalid => expect(()=>service.specialSlot({...body,...invalid})).toThrow());
  test('merchant all-day save uses the existing TIME columns and scoped ownership', async () => {
    query.mockImplementation(async sql => {
      if(sql.includes('FROM shop_merchants'))return [{id:1,slug:'water-home',enabled:1}];
      if(sql.includes('SELECT role'))return [{role:'merchant',status:'active'}];
      if(sql.includes('shop_merchant_members'))return [{user_id:1}];
      if(sql.includes('INSERT INTO shop_slots'))return {insertId:43};
      return [];
    });
    const res=await authed('put','/admin/special-slots/new','merchant').send({...body,all_day:true});
    expect(res.status).toBe(200);
    expect(query.mock.calls.find(([sql])=>sql.includes('INSERT INTO shop_slots'))[1])
      .toEqual([1,'2026-10-13','00:00:00','24:00:00','开放下单 00:00-24:00','Order window 00:00-24:00','2026-10-13 00:00:00',100000,1]);
  });
});
