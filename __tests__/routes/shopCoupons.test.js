const express=require('express'),request=require('supertest'),jwt=require('jsonwebtoken'),crypto=require('crypto');
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
jest.mock('../../database',()=>({query:jest.fn(),pool:{}}));
jest.mock('../../services/shopCoupons',()=>({ready:jest.fn().mockResolvedValue(true),create:jest.fn(),list:jest.fn(),setStatus:jest.fn(),redemptions:jest.fn()}));
jest.mock('../../services/auditLog',()=>({logAudit:jest.fn().mockResolvedValue()}));
const {query}=require('../../database'),coupons=require('../../services/shopCoupons');
const app=express();app.use(express.json());app.use('/api/shop/stores/:slug',require('../../routes/shop'));
const call=(method,url,role)=>{query.mockImplementation(async sql=>sql.includes('shop_merchants')?[{id:1,slug:'demo',enabled:1}]:sql.includes('SELECT status FROM users')?[{status:'active'}]:sql.includes('SELECT role')?[{role,status:'active'}]:sql.includes('shop_merchant_members')?(role==='merchant'?[{user_id:1}]:[]):[]);return request(app)[method]('/api/shop/stores/demo'+url).set('Authorization','Bearer '+jwt.sign({id:1,role},process.env.JWT_SECRET));};
beforeEach(()=>{jest.clearAllMocks();coupons.list.mockResolvedValue({items:[],page:1});coupons.create.mockResolvedValue({id:1,code:'DEMOCODE1234'});});
test('student cannot create coupons',async()=>{expect((await call('post','/admin/coupons','student').send({})).status).toBe(403);expect(coupons.create).not.toHaveBeenCalled();});
test.each(['merchant','admin'])('%s may create a coupon scoped to the route merchant',async role=>{
  const response=await call('post','/admin/coupons',role).set('Idempotency-Key','create-coupon-test-123').send({merchant_id:999});
  expect(response.status).toBe(200);expect(coupons.create.mock.calls[0].slice(0,2)).toEqual([1,1]);
});
test('merchant without membership cannot read coupon management',async()=>{
  const pending=call('get','/admin/coupons','merchant');query.mockImplementation(async sql=>sql.includes('shop_merchants')?[{id:1}]:sql.includes('SELECT status')?[{status:'active'}]:sql.includes('SELECT role')?[{role:'merchant',status:'active'}]:[]);
  expect((await pending).status).toBe(403);expect(coupons.list).not.toHaveBeenCalled();
});
test('coupon management requires login',async()=>{query.mockResolvedValue([{id:1}]);expect((await request(app).get('/api/shop/stores/demo/admin/coupons')).status).toBe(401);});
