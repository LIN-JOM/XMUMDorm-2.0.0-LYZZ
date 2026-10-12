const { pool } = require('../database');
const s = require('./shop');

// A merchant creating their own store never chooses an owner supplied by the client.
module.exports = async function createOwnStore(actorId, body) {
  const slug = s.text(body.slug, 60).toLowerCase();
  const nameZh = s.text(body.name_zh, 120);
  const nameEn = s.text(body.name_en, 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) s.fail('店铺网址名称仅支持英文、数字和短横线 / Invalid store URL name');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [actors] = await conn.execute('SELECT role,status FROM users WHERE id=? FOR UPDATE', [actorId]);
    if (actors[0]?.status !== 'active' || !['merchant', 'admin'].includes(actors[0]?.role)) {
      s.fail('请使用有效的商家账号登录 / Active merchant account required', 403);
    }
    const [stores] = await conn.execute('SELECT id FROM shop_merchants WHERE slug=?', [slug]);
    if (stores.length) s.fail('店铺网址名称已被使用，请更换 / Store URL name already taken', 409);
    const [store] = await conn.execute('INSERT INTO shop_merchants (slug,name_zh,name_en) VALUES (?,?,?)', [slug, nameZh, nameEn]);
    await conn.execute('INSERT INTO shop_merchant_members (merchant_id,user_id) VALUES (?,?)', [store.insertId, actorId]);
    await conn.execute('INSERT INTO shop_settings (id,delivery_notice_zh,delivery_notice_en,payment_zh,payment_en) VALUES (?,?,?,?,?)', [store.insertId, '', '', '', '']);
    await conn.commit();
    return { id: store.insertId, slug };
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') s.fail('店铺网址名称已被使用，请更换 / Store URL name already taken', 409);
    throw err;
  } finally {
    conn.release();
  }
};
