import Router from 'koa-router';
import {
  login,
  getMe,
  updatePassword,
  createUser,
  getUsers,
  authenticateToken,
  requireRole
} from '../controllers/auth.ts';

const router = new Router({ prefix: '/auth' });

// 登录路由（无需认证）
router.post('/login', login);

// 获取当前用户信息
router.get('/me', authenticateToken, getMe);

// 更新密码
router.put('/password', authenticateToken, updatePassword);

// 创建用户（仅管理员）
router.post('/users', authenticateToken, requireRole('admin'), createUser);

// 获取用户列表（仅管理员）
router.get('/users', authenticateToken, requireRole('admin'), getUsers);

export default router;