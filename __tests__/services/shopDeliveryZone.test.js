jest.mock('../../database', () => ({pool:{getConnection:jest.fn()}}));
const {pool}=require('../../database');
const service=require('../../services/shop');

describe('student-entered delivery addresses',()=>{
  const location={contact_name:'Test student',contact:'test@example.test',building:'NEW-DORM',room:'123'};
  beforeEach(()=>jest.clearAllMocks());
  test.each(['LY1','NEW-DORM','任意宿舍楼'])('accepts a valid student-entered building: %s', building=>{
    expect(service.address({...location,building})).toMatchObject({building,room:'123'});
  });
  test.each(['building','room','contact'])('still requires %s',field=>{
    expect(()=>service.address({...location,[field]:''})).toThrow();
  });
  test('checkout ignores legacy area restrictions and fees and preserves student address',async()=>{
    const today=service.campusNow().slice(0,10);
    const execute=jest.fn(async(sql)=>{
      if(sql.includes('SELECT id, status FROM users'))return [[{id:1,status:'active'}]];
      if(sql.includes('FROM shop_merchants'))return [[{id:1}]];
      if(sql.includes('idempotency_key ='))return [[]];
      if(sql.includes('FROM shop_slots'))return [[{id:1,merchant_id:1,is_special:1,enabled:1,delivery_date:today,delivery_start:'00:00:00',delivery_end:'23:59:00',cutoff_at:`${today} 00:00:00`,label_zh:'今日配送 00:00-23:59',label_en:'Today 00:00-23:59',capacity:100000}]];
      if(sql.includes('SELECT id FROM shop_orders'))return [[]];
      if(sql.includes('SELECT c.product_id'))return [[{product_id:2,quantity:1}]];
      if(sql.includes('SELECT * FROM shop_products'))return [[{id:2,merchant_id:1,price_cents:100,stock:2}]];
      if(sql.includes('FROM shop_settings'))return [[{payment_methods:[{id:'qr',name_zh:'电子钱包',name_en:'E-wallet',qr_url:'/qr.png',note_zh:'legacy'}],delivery_zones:[{id:'old',name_zh:'LY1',name_en:'LY1',fee_cents:250}]}]];
      if(sql.includes('INSERT INTO shop_orders'))return [{insertId:3}];
      if(sql.includes('SELECT * FROM shop_orders'))return [[{id:3}]];
      return [{}];
    });
    const conn={execute,beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn()};
    pool.getConnection.mockResolvedValue(conn);
    await service.checkout(1,{address:location,slot_id:1,expected_total_cents:100,payment_method:'qr'},'address-test-key-1234');
    const args=execute.mock.calls.find(([sql])=>sql.includes('INSERT INTO shop_orders'))[1];
    expect(JSON.parse(args[4])).toEqual(location);
    expect(JSON.parse(args[7])).toMatchObject({delivery_zone:null,delivery_zones:[]});
    expect(JSON.parse(args[7]).payment_methods).toEqual([{id:'qr',name_zh:'电子钱包',name_en:'E-wallet',qr_url:'/qr.png'}]);
    expect(JSON.parse(args[7]).selected_method).not.toHaveProperty('note_zh');
    expect(args[8]).toBe(100);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.rollback).not.toHaveBeenCalled();
  });
});
