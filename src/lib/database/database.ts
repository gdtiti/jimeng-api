import Database from 'better-sqlite3'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import logger from '../logger.ts'

/**
 * SQLite数据库管理器 (使用better-sqlite3)
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * 初始化数据库连接
   */
  async initialize(dbPath: string): Promise<void> {
    try {
      // 确保数据目录存在
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 创建数据库连接
      this.db = new Database(dbPath);
      logger.info(`数据库连接成功: ${dbPath}`);

      // 启用外键约束
      this.db.exec('PRAGMA foreign_keys = ON');

      // 创建表结构
      this.createTables();

      // 创建默认管理员账户
      await this.createDefaultAdmin();

      logger.info('数据库初始化完成');
    } catch (error) {
      logger.error(`数据库初始化失败: ${error}`);
      throw error;
    }
  }

  /**
   * 创建表结构
   */
  private createTables(): void {
    const tables = [
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 任务表
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        negative_prompt TEXT,
        status TEXT DEFAULT 'pending',
        image_url TEXT,
        error_message TEXT,
        cookie_string TEXT,
        region TEXT DEFAULT 'cn',
        model_name TEXT DEFAULT 'jimeng',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // 配置表
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 任务进度表
      `CREATE TABLE IF NOT EXISTS task_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        status TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      )`
    ];

    for (const sql of tables) {
      this.db!.exec(sql);
    }

    logger.info('数据库表创建完成');
  }

  /**
   * 创建默认管理员账户
   */
  private async createDefaultAdmin(): Promise<void> {
    const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      logger.warn('未配置管理员账户，跳过默认管理员创建');
      return;
    }

    try {
      // 检查是否已存在管理员
      const existingAdmin = this.get(
        'SELECT id FROM users WHERE username = ?',
        [ADMIN_USERNAME]
      );

      if (existingAdmin) {
        logger.info('管理员账户已存在');
        return;
      }

      // 创建管理员账户
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      const stmt = this.db!.prepare(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
      );
      stmt.run([ADMIN_USERNAME, hashedPassword, 'admin']);

      logger.info(`默认管理员账户创建成功: ${ADMIN_USERNAME}`);
    } catch (error) {
      logger.error(`创建默认管理员失败: ${error}`);
    }
  }

  /**
   * 执行SQL查询
   */
  run(sql: string, params: any[] = []): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(sql);
      stmt.run(params);
    } catch (err) {
      logger.error(`SQL执行失败: ${sql}`, err);
      throw err;
    }
  }

  /**
   * 查询单条记录
   */
  get(sql: string, params: any[] = []): any {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (err) {
      logger.error(`SQL查询失败: ${sql}`, err);
      throw err;
    }
  }

  /**
   * 查询多条记录
   */
  all(sql: string, params: any[] = []): any[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (err) {
      logger.error(`SQL查询失败: ${sql}`, err);
      throw err;
    }
  }

  /**
   * 获取最后插入的ID
   */
  getLastInsertID(): number {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const result = this.db.prepare('SELECT last_insert_rowid() as id').get();
    return result.id;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('数据库连接已关闭');
    }
  }

  /**
   * 开始事务
   */
  beginTransaction(): void {
    this.run('BEGIN TRANSACTION');
  }

  /**
   * 提交事务
   */
  commit(): void {
    this.run('COMMIT');
  }

  /**
   * 回滚事务
   */
  rollback(): void {
    this.run('ROLLBACK');
  }
}

// 导出单例实例
export const database = DatabaseManager.getInstance();