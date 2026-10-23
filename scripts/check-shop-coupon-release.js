// Read-only release checks. Explicit configuration only; never loads root .env.
const fs = require('fs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const REQUIRED = {
  shop_orders: ['subtotal_cents','discount_cents','coupon_json'],
  shop_coupons: ['id','merchant_id','code','name_zh','name_en','discount_cents','min_subtotal_cents','starts_at','ends_at','total_limit','per_user_limit','reserved_count','redeemed_count','status','created_by','create_key','create_hash','created_at','updated_at'],
  shop_coupon_redemptions: ['id','coupon_id','order_id','user_id','discount_cents','status','redeemed_at','released_at','created_at','updated_at'],
};
function readEnvironment(args) {
  const i = args.indexOf('--env');
  if (args.includes('--process-env') === (i >= 0)) throw Error('CHOOSE_ENV_FILE_OR_PROCESS_ENV');
  if (i >= 0 && (!args[i+1] || args[i+1].startsWith('--'))) throw Error('ENV_FILE_REQUIRED');
  return i >= 0 ? dotenv.parse(fs.readFileSync(args[i+1])) : {...process.env};
}
function databaseTarget(env) {
  const uri = env.DATABASE_URL || env.MYSQL_URL || env.RAILWAY_MYSQL_URL;
  if (uri) {
    const url = new URL(uri);
    if (!['mysql:','mysql2:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw Error('DATABASE_URL_INVALID');
    return {host:url.hostname, config:{uri,connectTimeout:10000}};
  }
  if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER) throw Error('DATABASE_CONFIGURATION_REQUIRED');
  return {host:env.DB_HOST,config:{host:env.DB_HOST,port:Number(env.DB_PORT||3306),user:env.DB_USER,password:env.DB_PASSWORD||'',database:env.DB_NAME,connectTimeout:10000}};
}
function configurationIssues(env,args) {
  const errors=[],warnings=[];
  if (args.includes('--require-enabled') && env.SHOP_COUPONS_ENABLED !== '1') errors.push('SHOP_COUPONS_NOT_ENABLED');
  if (args.includes('--production')) {
    if (env.NODE_ENV !== 'production') errors.push('NODE_ENV_NOT_PRODUCTION');
    if (!env.JWT_SECRET || env.JWT_SECRET === 'your-secret-key-change-in-production') errors.push('JWT_SECRET_REQUIRED');
    if (env.OBJECT_STORAGE_BUCKET) {
      try {if(new URL(env.PUBLIC_ASSET_BASE_URL).protocol !== 'https:') throw Error();} catch {errors.push('PUBLIC_HTTPS_ASSET_URL_REQUIRED');}
      warnings.push('OBJECT_STORAGE_ACCESS_AND_PUBLIC_IMAGES_MUST_BE_SMOKE_TESTED');
    } else {
      if (!env.SHOP_ASSET_DIR || !env.SHOP_ASSET_DIR.startsWith('/')) errors.push('PRODUCTION_ABSOLUTE_ASSET_DIR_REQUIRED');
      warnings.push('PERSISTENT_VOLUME_MOUNT_AND_BACKUP_MUST_BE_VERIFIED');
    }
  }
  return {errors,warnings};
}
async function schemaStatus(conn) {
  const [rows]=await conn.execute("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('shop_orders','shop_coupons','shop_coupon_redemptions')");
  const found=new Set(rows.map(r=>r.TABLE_NAME+'.'+r.COLUMN_NAME));
  const missing=Object.entries(REQUIRED).flatMap(([table,columns])=>columns.filter(col=>!found.has(table+'.'+col)).map(col=>table+'.'+col));
  const [indexes]=await conn.execute("SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND NON_UNIQUE=0 AND TABLE_NAME IN ('shop_coupons','shop_coupon_redemptions') ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX");
  const groups=new Map();for(const r of indexes){const k=r.TABLE_NAME+'.'+r.INDEX_NAME;groups.set(k,[...(groups.get(k)||[]),r.COLUMN_NAME]);}
  for(const [table,columns] of [['shop_coupons',['code']],['shop_coupons',['created_by','create_key']],['shop_coupon_redemptions',['order_id']]]) {
    if(![...groups].some(([key,cols])=>key.startsWith(table+'.')&&JSON.stringify(cols)===JSON.stringify(columns)))missing.push(table+'.unique('+columns.join(',')+')');
  }
  return {ready:missing.length===0,missing};
}
async function main(args) {
  const env=readEnvironment(args),target=databaseTarget(env),checks=configurationIssues(env,args);
  const result={source:args.includes('--process-env')?'server-process-environment':'explicit-env-file',...checks,databaseChecked:false};
  if(!args.includes('--no-database')) {
    if(!['localhost','127.0.0.1','::1','[::1]'].includes(target.host)&&!args.includes('--allow-remote'))throw Error('REMOTE_CHECK_REQUIRES_ALLOW_REMOTE');
    const conn=await mysql.createConnection({...target.config,multipleStatements:false});
    try {result.schema=await schemaStatus(conn);result.databaseChecked=true;} finally {await conn.end();}
  }
  result.ready=result.errors.length===0&&result.databaseChecked&&result.schema?.ready===true;
  console.log(JSON.stringify(result,null,2));
  return result.errors.length || (result.databaseChecked&&!result.schema.ready) ? 1 : 0;
}
module.exports={REQUIRED,readEnvironment,databaseTarget,configurationIssues,schemaStatus,main};
if(require.main===module)main(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(error=>{console.error(/^[A-Z_]+$/.test(error.message)?error.message:'RELEASE_CHECK_FAILED_NO_CREDENTIALS_PRINTED');process.exitCode=1;});
