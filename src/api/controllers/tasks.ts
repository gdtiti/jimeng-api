import { Context } from 'koa';
import { database } from '../../lib/database/database.ts';
import logger from '../../lib/logger.ts';
import { request } from '../controllers/core-enhanced.ts';
import { authenticateToken } from './auth.ts';
import { taskPoller } from '../../lib/task-poller.ts';

export interface Task {
  id: number;
  user_id: number;
  title: string;
  prompt: string;
  negative_prompt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  error_message?: string;
  cookie_string?: string;
  region: 'cn' | 'us';
  model_name: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateTaskData {
  title: string;
  prompt: string;
  negative_prompt?: string;
  cookie_string: string;
  region?: 'cn' | 'us';
  model_name?: string;
}

/**
 * 创建任务
 */
export const createTask = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    const taskData: CreateTaskData = ctx.request.body;

    // 验证必需字段
    if (!taskData.title || !taskData.prompt || !taskData.cookie_string) {
      ctx.status = 400;
      ctx.body = { message: '标题、提示词和Cookie不能为空' };
      return;
    }

    // 创建任务记录
    const result = await database.run(
      `INSERT INTO tasks (user_id, title, prompt, negative_prompt, cookie_string, region, model_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        taskData.title,
        taskData.prompt,
        taskData.negative_prompt || '',
        taskData.cookie_string,
        taskData.region || 'cn',
        taskData.model_name || 'jimeng',
        'pending'
      ]
    );

    const taskId = await database.getLastInsertID();

    // 获取创建的任务
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    logger.info(`任务创建成功: ${taskId} by user ${user.username}`);

    // 启动轮询系统监控任务
    taskPoller.startPolling(taskId).catch(error => {
      logger.error(`启动任务轮询失败: ${taskId}`, error);
    });

    ctx.body = {
      message: '任务创建成功',
      task
    };
  } catch (error) {
    logger.error('创建任务失败:', error);
    ctx.status = 500;
    ctx.body = { message: '创建任务失败' };
  }
};

/**
 * 获取任务列表
 */
export const getTasks = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    const {
      page = 1,
      pageSize = 20,
      search,
      status,
      startDate,
      endDate
    } = ctx.query as any;

    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE user_id = ?';
    let params: any[] = [user.id];

    // 搜索条件
    if (search) {
      whereClause += ' AND (title LIKE ? OR prompt LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 状态筛选
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 日期范围筛选
    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }

    // 查询任务列表
    const tasks = await database.all(
      `SELECT * FROM tasks ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // 查询总数
    const totalResult = await database.get(
      `SELECT COUNT(*) as total FROM tasks ${whereClause}`,
      params
    );

    ctx.body = {
      tasks,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / pageSize)
      }
    };
  } catch (error) {
    logger.error('获取任务列表失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取任务列表失败' };
  }
};

/**
 * 获取任务详情
 */
export const getTask = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    const taskId = ctx.params.id;

    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, user.id]
    );

    if (!task) {
      ctx.status = 404;
      ctx.body = { message: '任务不存在' };
      return;
    }

    // 获取任务进度记录
    const progress = await database.all(
      'SELECT * FROM task_progress WHERE task_id = ? ORDER BY created_at DESC',
      [taskId]
    );

    ctx.body = {
      task,
      progress
    };
  } catch (error) {
    logger.error('获取任务详情失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取任务详情失败' };
  }
};

/**
 * 删除任务
 */
export const deleteTask = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    const taskId = ctx.params.id;

    // 检查任务是否存在且属于当前用户
    const task = await database.get(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, user.id]
    );

    if (!task) {
      ctx.status = 404;
      ctx.body = { message: '任务不存在' };
      return;
    }

    // 删除任务（级联删除相关记录）
    await database.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    logger.info(`任务删除成功: ${taskId} by user ${user.username}`);

    ctx.body = { message: '任务删除成功' };
  } catch (error) {
    logger.error('删除任务失败:', error);
    ctx.status = 500;
    ctx.body = { message: '删除任务失败' };
  }
};

/**
 * 重新执行任务
 */
export const retryTask = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    const taskId = ctx.params.id;

    // 检查任务是否存在且属于当前用户
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, user.id]
    );

    if (!task) {
      ctx.status = 404;
      ctx.body = { message: '任务不存在' };
      return;
    }

    // 重置任务状态
    await database.run(
      `UPDATE tasks
       SET status = 'pending',
           error_message = NULL,
           image_url = NULL,
           completed_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [taskId]
    );

    logger.info(`任务重试: ${taskId} by user ${user.username}`);

    // 启动轮询系统监控任务
    taskPoller.startPolling(taskId).catch(error => {
      logger.error(`启动任务轮询失败: ${taskId}`, error);
    });

    ctx.body = { message: '任务重新开始' };
  } catch (error) {
    logger.error('重试任务失败:', error);
    ctx.status = 500;
    ctx.body = { message: '重试任务失败' };
  }
};


/**
 * 获取系统统计信息
 */
export const getStats = async (ctx: Context) => {
  try {
    const user = ctx.state.user;

    const stats = await database.get(
      `SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_tasks,
        COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as tasks_this_week,
        COUNT(CASE WHEN created_at >= date('now', '-1 day') THEN 1 END) as tasks_today
      FROM tasks
      WHERE user_id = ?`,
      [user.id]
    );

    // 获取最近7天的任务趋势
    const trend = await database.all(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM tasks
      WHERE user_id = ? AND created_at >= date('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      [user.id]
    );

    // 获取轮询系统统计信息
    const pollingStats = taskPoller.getPollingStats();

    ctx.body = {
      stats,
      trend: trend.reverse(), // 按时间正序排列
      polling: pollingStats
    };
  } catch (error) {
    logger.error('获取统计信息失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取统计信息失败' };
  }
};

/**
 * 获取轮询系统统计信息
 */
export const getPollingStats = async (ctx: Context) => {
  try {
    const user = ctx.state.user;

    // 检查用户权限（仅管理员可查看所有轮询统计）
    if (user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = { message: '权限不足' };
      return;
    }

    const pollingStats = taskPoller.getPollingStats();

    ctx.body = {
      polling: pollingStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('获取轮询统计失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取轮询统计失败' };
  }
};