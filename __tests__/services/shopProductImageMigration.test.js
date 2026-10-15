const {legacyPath,options}=require('../../scripts/migrate-shop-product-images');
const origin='https://backend.example.com';
test('migration accepts only known relative or same-backend legacy product files',()=>{
  const p='/api/shop/assets/products/abc123.jpg';
  expect(legacyPath(p,origin)).toBe(p);expect(legacyPath(origin+p,origin)).toBe(p);
  for(const value of ['https://assets.example.com/x.jpg',origin+p+'?x=1','/api/shop/assets/products/../x.jpg','/api/shop/assets/payment/a.png',null,''])expect(legacyPath(value,origin)).toBeNull();
});
test('migration defaults to read-only',()=>expect(options(['--env','private.env','--api-origin',origin]).apply).toBe(false));
test('apply requires explicit database and backup directory',()=>{
  expect(()=>options(['--env','private.env','--api-origin',origin,'--apply'])).toThrow();
  expect(options(['--env','private.env','--api-origin',origin,'--apply','--confirm-database','db','--backup-dir','backup']).apply).toBe(true);
});
test.each(['http://backend.example.com',origin+'/path'])('rejects unsafe source origin %s',url=>expect(()=>options(['--env','x','--api-origin',url])).toThrow());
