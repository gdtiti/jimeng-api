import { Context } from 'koa';
import { jwtAuth, User } from '../../lib/auth/jwt-auth.ts';
import logger from '../../lib/logger.ts';

/**
 * 鉴权中间件
 */
export const authenticateToken = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const authHeader = ctx.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: '访问令牌缺失' };
      return;
    }

    const payload = jwtAuth.verifyToken(token);
    const user = await jwtAuth.getUserById(payload.id);

    if (!user) {
      ctx.status = 401;
      ctx.body = { message: '用户不存在' };
      return;
    }

    // 将用户信息附加到上下文
    ctx.state.user = user;
    await next();
  } catch (error) {
    logger.error('Token验证失败:', error);
    ctx.status = 403;
    ctx.body = { message: '无效的访问令牌' };
  }
};

/**
 * 权限检查中间件
 */
export const requireRole = (requiredRole: string) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const user: User = ctx.state.user;

    if (!user) {
      ctx.status = 401;
      ctx.body = { message: '未认证' };
      return;
    }

    if (!jwtAuth.checkPermission(user, requiredRole)) {
      ctx.status = 403;
      ctx.body = { message: '权限不足' };
      return;
    }

    await next();
  };
};

/**
 * 登录控制器
 */
export const login = async (ctx: Context) => {
  try {
    const { username, password } = ctx.request.body as any;

    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { message: '用户名和密码不能为空' };
      return;
    }

    // 用户认证
    const user = await jwtAuth.authenticate(username, password);

    if (!user) {
      ctx.status = 401;
      ctx.body = { message: '用户名或密码错误' };
      return;
    }

    // 生成JWT Token
    const token = jwtAuth.generateToken(user);

    // 获取用户统计信息
    const stats = await jwtAuth.getUserStats(user.id);

    logger.info(`用户登录成功: ${username}`);

    ctx.body = {
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        stats
      }
    };
  } catch (error) {
    logger.error('登录失败:', error);
    ctx.status = 500;
    ctx.body = { message: '登录失败' };
  }
};

/**
 * 获取当前用户信息
 */
export const getMe = async (ctx: Context) => {
  try {
    const user: User = ctx.state.user;
    const stats = await jwtAuth.getUserStats(user.id);

    ctx.body = {
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      stats
    };
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取用户信息失败' };
  }
};

/**
 * 更新密码
 */
export const updatePassword = async (ctx: Context) => {
  try {
    const user: User = ctx.state.user;
    const { oldPassword, newPassword } = ctx.request.body as any;

    if (!oldPassword || !newPassword) {
      ctx.status = 400;
      ctx.body = { message: '原密码和新密码不能为空' };
      return;
    }

    if (newPassword.length < 6) {
      ctx.status = 400;
      ctx.body = { message: '新密码长度至少6位' };
      return;
    }

    await jwtAuth.updatePassword(user.id, oldPassword, newPassword);

    logger.info(`用户密码更新成功: ${user.username}`);

    ctx.body = { message: '密码更新成功' };
  } catch (error) {
    logger.error('更新密码失败:', error);
    ctx.status = 400;
    ctx.body = { message: error.message || '更新密码失败' };
  }
};

/**
 * 创建用户（仅管理员）
 */
export const createUser = async (ctx: Context) => {
  try {
    const { username, password, role = 'user' } = ctx.request.body as any;

    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { message: '用户名和密码不能为空' };
      return;
    }

    if (password.length < 6) {
      ctx.status = 400;
      ctx.body = { message: '密码长度至少6位' };
      return;
    }

    if (!['admin', 'moderator', 'user'].includes(role)) {
      ctx.status = 400;
      ctx.body = { message: '无效的用户角色' };
      return;
    }

    const newUser = await jwtAuth.createUser(username, password, role);

    logger.info(`新用户创建成功: ${username} by ${ctx.state.user.username}`);

    ctx.body = {
      message: '用户创建成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        created_at: newUser.created_at
      }
    };
  } catch (error) {
    logger.error('创建用户失败:', error);
    ctx.status = 400;
    ctx.body = { message: error.message || '创建用户失败' };
  }
};

/**
 * 获取用户列表（仅管理员）
 */
export const getUsers = async (ctx: Context) => {
  try {
    const { page = 1, pageSize = 20, search } = ctx.query as any;
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    let params: any[] = [];

    if (search) {
      whereClause = 'WHERE username LIKE ?';
      params.push(`%${search}%`);
    }

    const users = await ctx.state.db.all(
      `SELECT id, username, role, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const totalResult = await ctx.state.db.get(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    ctx.body = {
      users,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / pageSize)
      }
    };
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取用户列表失败' };
  }
};