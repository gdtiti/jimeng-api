import Router from 'koa-router';
import {
  getSettings,
  updateSettings,
  getSetting,
  resetSettings,
  exportSettings,
  importSettings,
  authenticateToken,
  requireRole
} from '../controllers/settings.ts';

const router = new Router({ prefix: '/settings' });

// 所有路由都需要认证
router.use(authenticateToken);

// 获取所有设置
router.get('/', getSettings);

// 更新设置（需要认证）
router.put('/', authenticateToken, updateSettings);

// 获取单个设置
router.get('/:key', getSetting);

// 重置设置（仅管理员）
router.post('/reset', requireRole('admin'), resetSettings);

// 导出设置（仅管理员）
router.get('/export', requireRole('admin'), exportSettings);

// 导入设置（仅管理员）
router.post('/import', requireRole('admin'), importSettings);

export default router;