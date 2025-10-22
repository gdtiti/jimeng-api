import { authenticateToken } from '../controllers/auth.ts';
import { database } from '../../lib/database/database.ts';
import logger from '../../lib/logger.ts';
import Request from '@/lib/request/Request.ts';

export default {
  prefix: '/events',

  get: {
    '/task-updates': async (request: Request) => {
      // 验证用户身份
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new Error('需要认证令牌');
      }

      // 这里需要手动验证token并获取用户信息
      // 由于SSE需要特殊处理，我们返回一个特殊的响应
      const user = await verifyTokenAndGetUser(token);
      if (!user) {
        throw new Error('无效的认证令牌');
      }

      // 由于这个项目的路由系统不支持SSE，
      // 我们返回一个包含连接信息的JSON响应
      // UI端可以使用这个信息建立WebSocket连接或轮询

      return {
        type: 'sse_info',
        message: '此端点需要SSE支持，请使用轮询方式获取任务更新',
        pollingUrl: '/tasks',
        recommendedPollingInterval: 5000,
        userId: user.id,
        timestamp: new Date().toISOString()
      };
    },

    '/system-updates': async (request: Request) => {
      // 验证管理员身份
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new Error('需要认证令牌');
      }

      const user = await verifyTokenAndGetUser(token);
      if (!user || user.role !== 'admin') {
        throw new Error('权限不足');
      }

      return {
        type: 'sse_info',
        message: '此端点需要SSE支持，请使用轮询方式获取系统更新',
        pollingUrl: '/tasks/stats',
        recommendedPollingInterval: 10000,
        userId: user.id,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * 验证token并获取用户信息
 */
async function verifyTokenAndGetUser(token: string) {
  try {
    const { jwt } = await import('../../lib/auth/jwt-auth.ts');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;

    // 从数据库获取用户信息
    const user = await database.get(
      'SELECT id, username, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    return user;
  } catch (error) {
    logger.error('Token验证失败:', error);
    return null;
  }
}