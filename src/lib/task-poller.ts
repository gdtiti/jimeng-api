import logger from './logger.ts';
import { database } from './database/database.ts';
import { getAuthInfo } from './auth/auth-manager.ts';
import { request } from '../api/controllers/core-enhanced.ts';

export interface TaskProgress {
  id: number;
  task_id: number;
  progress: number;
  status: string;
  message: string;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  prompt: string;
  negative_prompt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  error_message?: string;
  cookie_string: string;
  region: 'cn' | 'us';
  model_name: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface PollingConfig {
  interval: number;
  maxWaitTime: number;
  taskTimeout: number;
  maxConcurrentTasks: number;
}

/**
 * 任务轮询管理器
 * 负责处理图片生成的状态轮询和超时管理
 */
export class TaskPoller {
  private static instance: TaskPoller;
  private config: PollingConfig;
  private activePolls: Map<number, NodeJS.Timeout> = new Map();
  private concurrentTasks: Set<number> = new Set();
  private taskStartTime: Map<number, number> = new Map();

  private constructor() {
    this.config = {
      interval: 3000,        // 默认3秒轮询
      maxWaitTime: 400000,   // 默认400秒最大等待
      taskTimeout: 600000,   // 默认10分钟任务超时
      maxConcurrentTasks: 5   // 默认最多5个并发任务
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TaskPoller {
    if (!TaskPoller.instance) {
      TaskPoller.instance = new TaskPoller();
    }
    return TaskPoller.instance;
  }

  /**
   * 更新轮询配置
   */
  updateConfig(newConfig: Partial<PollingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info(`轮询配置已更新: interval=${this.config.interval}ms, maxWaitTime=${this.config.maxWaitTime}ms`);
  }

  /**
   * 获取当前配置
   */
  getConfig(): PollingConfig {
    return { ...this.config };
  }

  /**
   * 开始轮询任务状态
   */
  async startPolling(taskId: number): Promise<void> {
    // 检查是否已在轮询
    if (this.activePolls.has(taskId)) {
      logger.warn(`任务 ${taskId} 已在轮询中`);
      return;
    }

    // 检查并发任务数限制
    if (this.concurrentTasks.size >= this.config.maxConcurrentTasks) {
      logger.warn(`并发任务数已达上限 (${this.config.maxConcurrentTasks})，任务 ${taskId} 将等待`);
      return;
    }

    try {
      // 获取任务信息
      const task = await database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 检查任务状态
      if (['completed', 'failed'].includes(task.status)) {
        logger.info(`任务 ${taskId} 已完成，无需轮询`);
        return;
      }

      // 开始轮询
      await this.updateTaskStatus(taskId, 'processing', '开始轮询任务状态');

      // 记录任务开始时间
      this.taskStartTime.set(taskId, Date.now());

      // 添加到并发任务集合
      this.concurrentTasks.add(taskId);

      // 设置任务超时
      const taskTimeoutId = setTimeout(() => {
        this.handleTaskTimeout(taskId);
      }, this.config.taskTimeout);

      // 开始轮询
      this.startPollingLoop(taskId, taskTimeoutId);

      logger.info(`开始轮询任务: ${taskId}`);
    } catch (error) {
      logger.error(`开始轮询任务失败: ${taskId}`, error);
      this.concurrentTasks.delete(taskId);
      this.taskStartTime.delete(taskId);
    }
  }

  /**
   * 轮询循环
   */
  private async startPollingLoop(taskId: number, taskTimeoutId: NodeJS.Timeout): Promise<void> {
    try {
      // 检查是否已超时
      const startTime = this.taskStartTime.get(taskId);
      if (!startTime) {
        throw new Error('任务开始时间未记录');
      }

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= this.config.maxWaitTime) {
        this.handleTaskTimeout(taskId);
        return;
      }

      // 查询任务状态
      const updatedTask = await this.queryTaskStatus(taskId);

      // 检查任务状态
      if (['completed', 'failed'].includes(updatedTask.status)) {
        await this.handleTaskComplete(taskId, updatedTask);
        return;
      }

      // 计算进度
      const progress = this.calculateProgress(updatedTask, elapsedTime);

      // 更新任务状态
      if (progress > 0) {
        await this.updateTaskProgress(taskId, progress, updatedTask.status);
      }

      // 继续轮询
      const pollId = setTimeout(() => {
        this.startPollingLoop(taskId, taskTimeoutId);
      }, this.config.interval);

      this.activePolls.set(taskId, pollId);

    } catch (error) {
      logger.error(`轮询任务失败: ${taskId}`, error);
      await this.handleTaskError(taskId, error);
    }
  }

  /**
   * 查询任务状态
   */
  private async queryTaskStatus(taskId: number): Promise<Task> {
    try {
      // 从数据库获取任务信息
      const task = await database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 如果任务有图片URL，标记为完成
      if (task.image_url && task.image_url.trim()) {
        await this.updateTaskStatus(taskId, 'completed', '图片生成完成');
        return { ...task, status: 'completed' };
      }

      // 如果没有Cookie，标记为失败
      if (!task.cookie_string || !task.cookie_string.trim()) {
        await this.updateTaskStatus(taskId, 'failed', '缺少Cookie信息');
        return { ...task, status: 'failed' };
      }

      // 检查API状态
      const apiStatus = await this.checkApiStatus(task);
      if (apiStatus.completed) {
        // API已生成图片，更新任务
        await this.updateTaskStatus(taskId, 'completed', '图片生成成功', apiStatus.imageUrl);
        return { ...task, status: 'completed', image_url: apiStatus.imageUrl };
      } else if (apiStatus.failed) {
        // API生成失败
        await this.updateTaskStatus(taskId, 'failed', apiStatus.errorMessage || '图片生成失败');
        return { ...task, status: 'failed' };
      }

      return task;
    } catch (error) {
      logger.error(`查询任务状态失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 检查API状态
   */
  private async checkApiStatus(task: Task): Promise<{ completed: boolean; imageUrl?: string; errorMessage?: string }> {
    try {
      // 使用Cookie获取认证信息
      const authInfo = await getAuthInfo(task.cookie_string, {
        region: task.region
      });

      // 构造请求参数
      const params = {
        task_id: task.id,
        model: task.model_name || 'jimeng'
      };

      // 调用API查询任务状态
      const response = await request(
        'POST',
        '/v1/tasks/status',
        task.cookie_string,
        {
          data: params,
          serviceType: 'jimeng',
          region: task.region
        }
      );

      if (response && response.data) {
        const result = response.data;

        // 检查API响应
        if (result.status === 'completed' && result.image_url) {
          return {
            completed: true,
            imageUrl: result.image_url
          };
        } else if (result.status === 'failed') {
          return {
            completed: true,
            errorMessage: result.error_message || '任务执行失败'
          };
        }
      }

      return { completed: false };
    } catch (error) {
      logger.error(`检查API状态失败: ${task.id}`, error);

      // 如果是网络错误或超时，可能是正常情况
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return { completed: false };
      }

      return {
        completed: true,
        errorMessage: error.message || 'API调用失败'
      };
    }
  }

  /**
   * 计算任务进度
   */
  private calculateProgress(task: Task, elapsedTime: number): number {
    // 基于时间的简单进度计算
    const totalEstimatedTime = 60000; // 预估60秒完成
    const progress = Math.min(Math.floor((elapsedTime / totalEstimatedTime) * 100), 95);

    return progress;
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(taskId: number, status: string, message?: string, imageUrl?: string): Promise<void> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      if (message) {
        updates.error_message = status === 'failed' ? message : null;
      }

      if (imageUrl) {
        updates.image_url = imageUrl;
      }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

      await database.run(
        `UPDATE tasks SET ${Object.keys(updates).map(key => `${key} = ?`).join(', ')} WHERE id = ?`,
        [...Object.values(updates), taskId]
      );

      // 添加进度记录
      const elapsedTime = Date.now() - (this.taskStartTime.get(taskId) || 0);
      await this.addProgressRecord(taskId, this.calculateProgress({ status } as Task, elapsedTime), status, message);

    } catch (error) {
      logger.error(`更新任务状态失败: ${taskId}`, error);
    }
  }

  /**
   * 更新任务进度
   */
  private async updateTaskProgress(taskId: number, progress: number, status: string): Promise<void> {
    try {
      await this.addProgressRecord(taskId, progress, status, `进度: ${progress}%`);
    } catch (error) {
      logger.error(`更新任务进度失败: ${taskId}`, error);
    }
  }

  /**
   * 添加进度记录
   */
  private async addProgressRecord(taskId: number, progress: number, status: string, message: string): Promise<void> {
    try {
      await database.run(
        'INSERT INTO task_progress (task_id, progress, status, message) VALUES (?, ?, ?, ?)',
        [taskId, progress, status, message]
      );
    } catch (error) {
      logger.error(`添加进度记录失败: ${taskId}`, error);
    }
  }

  /**
   * 处理任务完成
   */
  private async handleTaskComplete(taskId: number, task: Task): Promise<void> {
    try {
      // 清理轮询资源
      this.cleanupPolling(taskId);

      // 记录完成时间
      const totalTime = Date.now() - (this.taskStartTime.get(taskId) || 0);
      logger.info(`任务完成: ${taskId} (${task.status})，耗时: ${totalTime}ms`);

      // 如果是失败任务，记录错误信息
      if (task.status === 'failed' && task.error_message) {
        logger.error(`任务失败: ${taskId}, 错误: ${task.error_message}`);
      }

    } catch (error) {
      logger.error(`处理任务完成失败: ${taskId}`, error);
    }
  }

  /**
   * 处理任务超时
   */
  private async handleTaskTimeout(taskId: number): Promise<void> {
    try {
      await this.updateTaskStatus(
        taskId,
        'failed',
        `任务超时：超过最大等待时间 ${this.config.maxWaitTime}ms`
      );

      this.cleanupPolling(taskId);
      logger.warn(`任务超时: ${taskId}`);
    } catch (error) {
      logger.error(`处理任务超时失败: ${taskId}`, error);
    }
  }

  /**
   * 处理任务错误
   */
  private async handleTaskError(taskId: number, error: any): Promise<void> {
    try {
      await this.updateTaskStatus(
        taskId,
        'failed',
        `轮询错误: ${error.message || '未知错误'}`
      );

      this.cleanupPolling(taskId);
      logger.error(`任务错误: ${taskId}`, error);
    } catch (err) {
      logger.error(`处理任务错误失败: ${taskId}`, err);
    }
  }

  /**
   * 清理轮询资源
   */
  private cleanupPolling(taskId: number): void {
    // 清除轮询定时器
    const pollId = this.activePolls.get(taskId);
    if (pollId) {
      clearTimeout(pollId);
      this.activePolls.delete(taskId);
    }

    // 从并发任务集合中移除
    this.concurrentTasks.delete(taskId);

    // 清除任务开始时间
    this.taskStartTime.delete(taskId);
  }

  /**
   * 停止轮询任务
   */
  stopPolling(taskId: number): void {
    this.cleanupPolling(taskId);
    logger.info(`停止轮询任务: ${taskId}`);
  }

  /**
   * 停止所有轮询
   */
  stopAllPolling(): void {
    const pollIds = Array.from(this.activePolls.keys());

    pollIds.forEach(taskId => {
      this.stopPolling(taskId);
    });

    logger.info(`停止所有轮询，共停止 ${pollIds.length} 个任务`);
  }

  /**
   * 获取轮询统计
   */
  getPollingStats(): {
    active: number;
    concurrent: number;
    queue: number;
    config: PollingConfig;
  } {
    return {
      active: this.activePolls.size,
      concurrent: this.concurrentTasks.size,
      queue: Math.max(0, this.config.maxConcurrentTasks - this.concurrentTasks.size),
      config: this.getConfig()
    };
  }

  /**
   * 获取任务详细状态
   */
  async getTaskStatus(taskId: number): Promise<{
    task: Task;
    progress: TaskProgress[];
    stats: {
      elapsedTime: number;
      progress: number;
      isTimeout: boolean;
      polling: boolean;
    };
  }> {
    try {
      const task = await database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      const progress = await database.all(
        'SELECT * FROM task_progress WHERE task_id = ? ORDER BY created_at DESC',
        [taskId]
      );

      const startTime = this.taskStartTime.get(taskId) || 0;
      const elapsedTime = Date.now() - startTime;
      const isTimeout = elapsedTime >= this.config.maxWaitTime;
      const pollingProgress = this.calculateProgress(task, elapsedTime);

      return {
        task,
        progress,
        stats: {
          elapsedTime,
          progress: pollingProgress,
          isTimeout,
          polling: this.activePolls.has(taskId)
        }
      };
    } catch (error) {
      logger.error(`获取任务状态失败: ${taskId}`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const taskPoller = TaskPoller.getInstance();