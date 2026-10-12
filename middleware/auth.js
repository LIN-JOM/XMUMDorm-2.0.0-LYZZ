/**
 * ============================================
 * JWT 身份验证中间件
 * ============================================
 * 创建时间: 2025-01-26
 * 功能: 验证请求中的 JWT 令牌，保护需要登录才能访问的路由
 */

// 引入 JWT 库
const jwt = require('jsonwebtoken');
const { query } = require('../database');

// 从环境变量获取 JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * JWT 验证中间件
 */
function authenticateToken(req, res, next) {
  // 1. 从请求头中获取令牌
  const authHeader = req.headers['authorization'];
  
  // 2. 提取令牌
  const token = authHeader && authHeader.split(' ')[1];

  // 3. 如果没有令牌，返回 401 未授权错误
  if (!token) {
    return res.status(401).json({
      status: -1,
      message: '未提供身份验证令牌，请先登录'
    });
  }

  // 4. 验证令牌
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        status: -1,
        message: '身份验证令牌无效或已过期，请重新登录'
      });
    }

    const userId = Number(decoded?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(403).json({
        status: -1,
        message: '身份验证令牌无效或已过期，请重新登录'
      });
    }

    try {
      // Token 签发后账号也可能被停用；每个受保护入口都必须复查数据库事实。
      const rows = await query('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
      if (!rows || rows.length !== 1 || rows[0].status === 'deactivated') {
        return res.status(403).json({
          status: -1,
          message: '该账号已注销，请重新登录',
          accountDeactivated: true
        });
      }
    } catch (_error) {
      return res.status(503).json({
        status: -1,
        message: '身份状态暂时无法验证，请稍后重试'
      });
    }

    // 验签和账号状态都通过后，才把解码后的用户交给受保护路由。
    req.user = decoded;
    next();
  });
}

// 导出中间件函数
module.exports = authenticateToken;

