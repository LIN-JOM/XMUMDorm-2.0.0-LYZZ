// Explicit target only; never loads the repository .env implicitly.
const fs=require('fs'),path=require('path'),mysql=require('mysql2/promise');
const {readEnvironment,schemaStatus}=require('./check-shop-coupon-release');
async function apply(conn) {
  const sql=fs.readFileSync(path.join(__dirname,'../migrations/077_shop_coupons.sql'),'utf8');
  await conn.query(sql);
  const [rows]=await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND COLUMN_NAME IN ('subtotal_cents','discount_cents','coupon_json')");
  if(rows.length!==3||!(await schemaStatus(conn)).ready)throw Error('MIGRATION_INCOMPLETE');
}
async function main(args) {
  const dbIndex=args.indexOf('--confirm-database');
  if(dbIndex<0||!args[dbIndex+1]||args[dbIndex+1].startsWith('--'))throw Error('DATABASE_CONFIRMATION_REQUIRED');
  const env=readEnvironment(args);
  const uri=env.DATABASE_URL||env.MYSQL_URL||env.RAILWAY_MYSQL_URL;
  const hostname=uri?new URL(uri).hostname:env.DB_HOST||'127.0.0.1';
  if(!['127.0.0.1','localhost','::1'].includes(hostname)&&!args.includes('--allow-remote'))throw Error('REMOTE_DATABASE_REQUIRES_EXPLICIT_ALLOW');
  const config=uri?{uri,multipleStatements:true}:{host:hostname,port:Number(env.DB_PORT||3306),user:env.DB_USER||'root',password:env.DB_PASSWORD||'',database:env.DB_NAME,multipleStatements:true};
  const conn=await mysql.createConnection({...config,connectTimeout:10000});
  try {
    const [[db]]=await conn.query('SELECT DATABASE() AS name');
    if(db.name!==args[dbIndex+1])throw Error('DATABASE_MISMATCH');
    await apply(conn);
    console.log('077_SHOP_COUPONS_READY (repeatable; existing data preserved)');
  } finally {await conn.end();}
}
module.exports={apply,main};
if(require.main===module)main(process.argv.slice(2)).catch(error=>{console.error(/^[A-Z_]+$/.test(error.message)?error.message:'MIGRATION_FAILED_NO_CREDENTIALS_PRINTED');process.exitCode=1;});
