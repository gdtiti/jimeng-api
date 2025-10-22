import Router from 'koa-router';
import {
  createTask,
  getTasks,
  getTask,
  deleteTask,
  retryTask,
  getStats,
  getPollingStats,
  authenticateToken
} from '../controllers/tasks.ts';

const router = new Router({ prefix: '/tasks' });

// 所有路由都需要认证
router.use(authenticateToken);

// 获取系统统计
router.get('/stats', getStats);

// 获取轮询统计
router.get('/polling/stats', getPollingStats);

// 获取任务列表
router.get('/', getTasks);

// 创建新任务
router.post('/', createTask);

// 获取任务详情
router.get('/:id', getTask);

// 重试任务
router.post('/:id/retry', retryTask);

// 删除任务
router.delete('/:id', deleteTask);

export default router;