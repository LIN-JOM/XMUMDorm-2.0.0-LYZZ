const fs=require('fs');
const os=require('os');
const path=require('path');
const sharp=require('sharp');
jest.mock('mysql2/promise',()=>({createConnection:jest.fn()}));
jest.mock('@aws-sdk/client-s3',()=>({S3Client:jest.fn(),PutObjectCommand:jest.fn(function(input){this.input=input;})}));
const mysql=require('mysql2/promise');
const {S3Client}=require('@aws-sdk/client-s3');
const {main}=require('../../scripts/migrate-shop-product-images');
let dir,conn,send,image,fetchSpy,log;
beforeEach(async()=>{
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'shop-migration-test-'));
  fs.writeFileSync(path.join(dir,'config'),'DB_HOST=localhost\nDB_NAME=test\nOBJECT_STORAGE_BUCKET=test\nPUBLIC_ASSET_BASE_URL=https://assets.example.com\n');
  image=await sharp({create:{width:2,height:2,channels:3,background:'#173874'}}).png().toBuffer();
  conn={query:jest.fn().mockResolvedValueOnce([[{name:'test'}]]).mockResolvedValueOnce([[{id:4,merchant_id:2,image_url:'/api/shop/assets/products/abc123.png'}]]),execute:jest.fn().mockResolvedValue([{affectedRows:1}]),beginTransaction:jest.fn(),commit:jest.fn(),rollback:jest.fn(),end:jest.fn()};
  mysql.createConnection.mockResolvedValue(conn);send=jest.fn().mockResolvedValue({});
  S3Client.mockImplementation(()=>({send,destroy:jest.fn()}));
  fetchSpy=jest.spyOn(global,'fetch').mockImplementation(async()=>new Response(image,{headers:{'content-type':'image/png'}}));
  log=jest.spyOn(console,'log').mockImplementation(()=>{});
});
afterEach(()=>{fetchSpy.mockRestore();log.mockRestore();fs.rmSync(dir,{recursive:true,force:true});jest.clearAllMocks();});
const args=()=>['--env',path.join(dir,'config'),'--api-origin','https://backend.example.com'];
const applyArgs=()=>[...args(),'--apply','--confirm-database','test','--backup-dir',dir];
test('dry run reads and verifies without writing',async()=>{await main(args());expect(send).not.toHaveBeenCalled();expect(conn.execute).not.toHaveBeenCalled();});
test('apply backs up and updates only unchanged source field after checksum',async()=>{
  await main(applyArgs());expect(send).toHaveBeenCalledTimes(1);expect(conn.commit).toHaveBeenCalledTimes(1);
  expect(conn.execute.mock.calls[0][0]).toContain('image_url=? AND deleted_at IS NULL');
  const backup=fs.readdirSync(dir).find(n=>n.endsWith('.json'));expect(JSON.parse(fs.readFileSync(path.join(dir,backup))).changes[0].image_url).toBe('/api/shop/assets/products/abc123.png');
});
test('already migrated HTTPS URL makes rerun a no-op',async()=>{
  conn.query.mockReset().mockResolvedValueOnce([[{name:'test'}]]).mockResolvedValueOnce([[{id:4,image_url:'https://assets.example.com/a.png'}]]);
  await main(applyArgs());expect(send).not.toHaveBeenCalled();expect(conn.execute).not.toHaveBeenCalled();
});
test('missing source is reported and prevents writes unless explicitly skipped',async()=>{
  fetchSpy.mockResolvedValue(new Response('',{status:404}));
  await expect(main(applyArgs())).rejects.toThrow('MISSING_IMAGES');expect(send).not.toHaveBeenCalled();expect(conn.execute).not.toHaveBeenCalled();
});
test('concurrent image edit rolls back the database transaction',async()=>{
  conn.execute.mockResolvedValue([{affectedRows:0}]);await expect(main(applyArgs())).rejects.toThrow('CONCURRENT_CHANGE');
  expect(conn.rollback).toHaveBeenCalledTimes(1);expect(conn.commit).not.toHaveBeenCalled();
});
test('checksum mismatch does not update any product',async()=>{
  fetchSpy.mockResolvedValueOnce(new Response(image,{headers:{'content-type':'image/png'}})).mockResolvedValueOnce(new Response('wrong'));
  await expect(main(applyArgs())).rejects.toThrow('CHECKSUM_MISMATCH');expect(conn.execute).not.toHaveBeenCalled();
});
