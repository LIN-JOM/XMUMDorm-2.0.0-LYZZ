#!/usr/bin/env node
// Data-only migration. Default is read-only; never loads the repository .env implicitly.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function legacyPath(value, apiOrigin) {
  const pattern = /^\/api\/shop\/assets\/products\/[a-f0-9]+\.(jpg|png|webp)$/;
  if (pattern.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.origin === apiOrigin && !url.search && !url.hash && pattern.test(url.pathname)) return url.pathname;
  } catch { /* External, static and empty image URLs are left unchanged. */ }
  return null;
}
function options(args) {
  const out = { apply: false };
  for (let i=0;i<args.length;i++) {
    const key=args[i];
    if(key==='--apply') out.apply=true;
    else if(key==='--skip-missing') out.skipMissing=true;
    else if(['--env','--api-origin','--confirm-database','--backup-dir'].includes(key)&&args[i+1]) out[key.slice(2)]=args[++i];
    else throw Error('INVALID_ARGUMENT');
  }
  if(!out.env||!out['api-origin']) throw Error('ENV_AND_API_ORIGIN_REQUIRED');
  const url=new URL(out['api-origin']);
  if(url.protocol!=='https:'||url.origin!==out['api-origin']) throw Error('HTTPS_ORIGIN_REQUIRED');
  if(out.apply&&(!out['confirm-database']||!out['backup-dir'])) throw Error('DATABASE_CONFIRMATION_AND_BACKUP_REQUIRED');
  return out;
}
async function main(args) {
  const opt=options(args),env=dotenv.parse(fs.readFileSync(path.resolve(opt.env)));
  const uri=env.DATABASE_URL||env.MYSQL_URL||env.RAILWAY_MYSQL_URL;
  const conn=await mysql.createConnection(uri?{uri,connectTimeout:10000,multipleStatements:false}:{
    host:env.DB_HOST,port:Number(env.DB_PORT||3306),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,connectTimeout:10000,multipleStatements:false,
  });
  let tx=false,client;
  try {
    const [[db]]=await conn.query('SELECT DATABASE() AS name');
    if(opt.apply&&db.name!==opt['confirm-database']) throw Error('DATABASE_MISMATCH');
    const [rows]=await conn.query('SELECT p.id,p.merchant_id,p.image_url FROM shop_products p JOIN shop_merchants m ON m.id=p.merchant_id WHERE p.deleted_at IS NULL AND m.deleted_at IS NULL');
    const changes=[],missing=[];
    for(const row of rows) {
      const sourcePath=legacyPath(row.image_url,opt['api-origin']);if(!sourcePath) continue;
      const r=await fetch(opt['api-origin']+sourcePath,{signal:AbortSignal.timeout(15000),redirect:'error'});
      if(r.status===404){missing.push(row.id);continue;}
      if(!r.ok||!r.headers.get('content-type')?.startsWith('image/')) throw Error('SOURCE_IMAGE_UNAVAILABLE');
      const bytes=Buffer.from(await r.arrayBuffer());
      if(bytes.length>5*1024*1024)throw Error('SOURCE_IMAGE_TOO_LARGE');
      const meta=await sharp(bytes,{limitInputPixels:16000000}).metadata();
      if(!['jpeg','png','webp'].includes(meta.format)) throw Error('INVALID_SOURCE_IMAGE');
      const hash=crypto.createHash('sha256').update(bytes).digest('hex');
      const key=`shop/products/${row.merchant_id}/${hash}${path.extname(sourcePath)}`;
      const base=env.PUBLIC_ASSET_BASE_URL?.replace(/\/+$/,'');
      if(!base||!base.startsWith('https://')||!env.OBJECT_STORAGE_BUCKET) throw Error('PUBLIC_STORAGE_REQUIRED');
      changes.push({...row,key,new_url:base+'/'+key,hash,bytes,contentType:r.headers.get('content-type')});
    }
    console.log(JSON.stringify({mode:opt.apply?'apply':'read-only',candidates:changes.length,missingProductIds:missing}));
    if(missing.length&&!opt.skipMissing)throw Error('MISSING_IMAGES_REUPLOAD_OR_EXPLICIT_SKIP_REQUIRED');
    if(!opt.apply||!changes.length)return;
    const dir=path.resolve(opt['backup-dir']);fs.mkdirSync(dir,{recursive:true});
    const backup=path.join(dir,'shop-product-images-'+Date.now()+'.json');
    fs.writeFileSync(backup,JSON.stringify({database:db.name,changes:changes.map(({bytes,contentType,...row})=>row)},null,2),{flag:'wx'});
    client=new S3Client({endpoint:env.OBJECT_STORAGE_ENDPOINT,region:env.OBJECT_STORAGE_REGION||'auto',forcePathStyle:env.OBJECT_STORAGE_FORCE_PATH_STYLE!=='false',credentials:{accessKeyId:env.OBJECT_STORAGE_ACCESS_KEY_ID,secretAccessKey:env.OBJECT_STORAGE_SECRET_ACCESS_KEY}});
    for(const row of changes){
      await client.send(new PutObjectCommand({Bucket:env.OBJECT_STORAGE_BUCKET,Key:row.key,Body:row.bytes,ContentType:row.contentType,CacheControl:'public, max-age=31536000, immutable'}));
      const r=await fetch(row.new_url,{signal:AbortSignal.timeout(15000),redirect:'error'});
      if(!r.ok||r.headers.get('cross-origin-resource-policy')==='same-origin')throw Error('DESTINATION_UNAVAILABLE');
      if(crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')!==row.hash)throw Error('CHECKSUM_MISMATCH');
    }
    await conn.beginTransaction();tx=true;
    for(const row of changes){
      const [r]=await conn.execute('UPDATE shop_products SET image_url=? WHERE id=? AND merchant_id=? AND image_url=? AND deleted_at IS NULL',[row.new_url,row.id,row.merchant_id,row.image_url]);
      if(r.affectedRows!==1)throw Error('CONCURRENT_CHANGE');
    }
    await conn.commit();tx=false;
    console.log(JSON.stringify({committed:true,updated:changes.length,backup,originalFilesPreserved:true}));
  } finally {
    if(tx)await conn.rollback();client?.destroy();await conn.end();
  }
}
module.exports={legacyPath,options,main};
if(require.main===module)main(process.argv.slice(2)).catch(e=>{
  console.error(/^[A-Z_]+$/.test(e.message)?e.message:'MIGRATION_FAILED_NO_CREDENTIALS_PRINTED');process.exitCode=1;
});
