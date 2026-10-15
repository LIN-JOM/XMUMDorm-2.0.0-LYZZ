jest.mock('../../database', () => ({pool:{getConnection:jest.fn()}}));
const {pool}=require('../../database');
const {changeStatus}=require('../../services/shop');
let conn;
beforeEach(()=>{
  conn={beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),release:jest.fn(),execute:jest.fn()};
  pool.getConnection.mockResolvedValue(conn);
});
test('replayed target does not write again or advance another step',async()=>{
  conn.execute.mockResolvedValue([[{id:1,merchant_id:1,status:'preparing'}]]);
  expect(await changeStatus(1,'preparing',1)).toMatchObject({status:'preparing'});
  expect(conn.execute).toHaveBeenCalledTimes(1);
});
test('another merchant cannot update selected orders',async()=>{
  conn.execute.mockResolvedValue([[{id:1,merchant_id:2,status:'confirmed'}]]);
  await expect(changeStatus(1,'preparing',1)).rejects.toMatchObject({status:404});
  expect(conn.rollback).toHaveBeenCalled();
  expect(conn.execute).toHaveBeenCalledTimes(1);
});
test('stale batch cannot move an already advanced order backwards',async()=>{
  conn.execute.mockResolvedValue([[{id:1,merchant_id:1,status:'delivering'}]]);
  await expect(changeStatus(1,'preparing',1)).rejects.toMatchObject({status:409});
  expect(conn.execute).toHaveBeenCalledTimes(1);
});
test('batch uses existing payment receipt requirement',async()=>{
  conn.execute.mockResolvedValueOnce([[{id:1,merchant_id:1,status:'pending_verification',payment_json:{selected_method:'qr'}}]]).mockResolvedValueOnce([[]]);
  await expect(changeStatus(1,'confirmed',1)).rejects.toMatchObject({status:409});
  expect(conn.rollback).toHaveBeenCalled();
  expect(conn.execute).toHaveBeenCalledTimes(2);
});
test('valid one-step update locks the order and commits only the fixed target',async()=>{
  conn.execute.mockResolvedValueOnce([[{id:1,merchant_id:1,status:'confirmed'}]]).mockResolvedValueOnce([{affectedRows:1}]);
  await expect(changeStatus(1,'preparing',1)).resolves.toMatchObject({status:'preparing'});
  expect(conn.execute.mock.calls[0][0]).toContain('FOR UPDATE');
  expect(conn.execute.mock.calls[1]).toEqual(['UPDATE shop_orders SET status = ? WHERE id = ?',['preparing',1]]);
  expect(conn.commit).toHaveBeenCalled();
});
