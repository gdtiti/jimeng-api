import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../logger.ts';
import { database } from '../database/database.ts';

export interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  id: number;
  username: string;
  role: string;
}

/**
 * JWT认证管理器
 */
export class JWTAuth {
  private static instance: JWTAuth;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

    if (this.jwtSecret === 'default-secret-key') {
      logger.warn('使用默认JWT密钥，请在生产环境中设置JWT_SECRET环境变量');
    }
  }

  /**
   * 获取单例实例
   */
  static getInstance(): JWTAuth {
    if (!JWTAuth.instance) {
      JWTAuth.instance = new JWTAuth();
    }
    return JWTAuth.instance;
  }

  /**
   * 生成JWT Token
   */
  generateToken(user: User): string {
    const payload: AuthPayload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
  }

  /**
   * 验证JWT Token
   */
  verifyToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthPayload;
    } catch (error) {
      logger.error('JWT Token验证失败:', error);
      throw new Error('无效的Token');
    }
  }

  /**
   * 用户认证
   */
  async authenticate(username: string, password: string): Promise<User | null> {
    try {
      // 查询用户
      const user = await database.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        logger.warn(`用户不存在: ${username}`);
        return null;
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn(`用户密码错误: ${username}`);
        return null;
      }

      // 返回用户信息（不包含密码）
      const { password: _, ...userInfo } = user;
      return userInfo as User;
    } catch (error) {
      logger.error(`用户认证失败: ${username}`, error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户信息
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      const user = await database.get(
        'SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );

      return user as User || null;
    } catch (error) {
      logger.error(`获取用户信息失败: ${id}`, error);
      throw error;
    }
  }

  /**
   * 创建新用户
   */
  async createUser(username: string, password: string, role: string = 'user'): Promise<User> {
    try {
      // 检查用户名是否已存在
      const existingUser = await database.get(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户
      await database.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );

      const userId = await database.getLastInsertID();

      // 返回用户信息
      const newUser = await this.getUserById(userId);
      if (!newUser) {
        throw new Error('创建用户失败');
      }

      logger.info(`新用户创建成功: ${username}`);
      return newUser;
    } catch (error) {
      logger.error(`创建用户失败: ${username}`, error);
      throw error;
    }
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // 获取当前用户密码
      const user = await database.get(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        throw new Error('原密码错误');
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await database.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId]
      );

      logger.info(`用户密码更新成功: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`更新用户密码失败: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 检查用户权限
   */
  checkPermission(user: User, requiredRole: string): boolean {
    const roleHierarchy = {
      'admin': 3,
      'moderator': 2,
      'user': 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: number): Promise<any> {
    try {
      const stats = await database.get(
        `SELECT
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
          COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as tasks_this_week
        FROM tasks
        WHERE user_id = ?`,
        [userId]
      );

      return stats;
    } catch (error) {
      logger.error(`获取用户统计失败: ${userId}`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const jwtAuth = JWTAuth.getInstance();