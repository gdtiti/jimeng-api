import { Context } from 'koa';
import { database } from '../../lib/database/database.ts';
import logger from '../../lib/logger.ts';
import { authenticateToken, requireRole } from './auth.ts';
import { taskPoller } from '../../lib/task-poller.ts';

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// 默认设置
const DEFAULT_SETTINGS = {
  'polling_interval': '3000',
  'max_wait_time': '400000',
  'max_file_size': '104857600',
  'upload_dir': './uploads',
  'default_model': 'jimeng',
  'default_region': 'cn',
  'task_timeout': '600000',
  'max_concurrent_tasks': '5'
};

/**
 * 获取所有设置
 */
export const getSettings = async (ctx: Context) => {
  try {
    const settings = await database.all('SELECT * FROM settings ORDER BY key');

    // 确保所有默认设置都存在
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      const exists = settings.find(s => s.key === key);
      if (!exists) {
        await database.run(
          'INSERT INTO settings (key, value, description) VALUES (?, ?, ?)',
          [key, defaultValue, `Default setting: ${key}`]
        );
      }
    }

    // 重新获取设置
    const allSettings = await database.all('SELECT * FROM settings ORDER BY key');

    ctx.body = {
      settings: allSettings.reduce((acc, setting) => {
        acc[setting.key] = {
          value: setting.value,
          description: setting.description,
          updated_at: setting.updated_at
        };
        return acc;
      }, {} as Record<string, any>)
    };
  } catch (error) {
    logger.error('获取设置失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取设置失败' };
  }
};

/**
 * 更新设置
 */
export const updateSettings = async (ctx: Context) => {
  try {
    const updates = ctx.request.body as any;

    if (!updates || typeof updates !== 'object') {
      ctx.status = 400;
      ctx.body = { message: '无效的设置数据' };
      return;
    }

    const updatedSettings: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      // 验证设置值
      if (!validateSettingValue(key, value as string)) {
        ctx.status = 400;
        ctx.body = { message: `设置 ${key} 的值无效` };
        return;
      }

      // 更新或插入设置
      await database.run(
        `INSERT INTO settings (key, value, description, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
        [key, value as string, `Setting: ${key}`]
      );

      updatedSettings.push(key);
    }

    logger.info(`设置更新成功: ${updatedSettings.join(', ')} by ${ctx.state.user.username}`);

    // 检查是否有轮询相关的设置更新，并更新轮询器配置
    const pollingConfigUpdates: any = {};
    for (const key of updatedSettings) {
      if (['polling_interval', 'max_wait_time', 'task_timeout', 'max_concurrent_tasks'].includes(key)) {
        const configKey = key.replace('polling_interval', 'interval')
                              .replace('max_wait_time', 'maxWaitTime')
                              .replace('task_timeout', 'taskTimeout')
                              .replace('max_concurrent_tasks', 'maxConcurrentTasks');
        pollingConfigUpdates[configKey] = parseInt(updates[key]);
      }
    }

    // 如果有轮询配置更新，更新轮询器
    if (Object.keys(pollingConfigUpdates).length > 0) {
      taskPoller.updateConfig(pollingConfigUpdates);
      logger.info(`用户 ${ctx.state.user.username} 更新了轮询配置:`, pollingConfigUpdates);
    }

    ctx.body = {
      message: '设置更新成功',
      updated_settings: updatedSettings
    };
  } catch (error) {
    logger.error('更新设置失败:', error);
    ctx.status = 500;
    ctx.body = { message: '更新设置失败' };
  }
};

/**
 * 获取单个设置
 */
export const getSetting = async (ctx: Context) => {
  try {
    const { key } = ctx.params;

    let setting = await database.get(
      'SELECT * FROM settings WHERE key = ?',
      [key]
    );

    // 如果设置不存在，返回默认值
    if (!setting && DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]) {
      setting = {
        key,
        value: DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS],
        description: `Default setting: ${key}`
      };
    }

    if (!setting) {
      ctx.status = 404;
      ctx.body = { message: '设置不存在' };
      return;
    }

    ctx.body = { setting };
  } catch (error) {
    logger.error('获取设置失败:', error);
    ctx.status = 500;
    ctx.body = { message: '获取设置失败' };
  }
};

/**
 * 验证设置值
 */
function validateSettingValue(key: string, value: string): boolean {
  const validations: Record<string, (value: string) => boolean> = {
    'polling_interval': (v) => !isNaN(parseInt(v)) && parseInt(v) >= 1000 && parseInt(v) <= 60000,
    'max_wait_time': (v) => !isNaN(parseInt(v)) && parseInt(v) >= 60000 && parseInt(v) <= 3600000,
    'max_file_size': (v) => !isNaN(parseInt(v)) && parseInt(v) > 0,
    'max_concurrent_tasks': (v) => !isNaN(parseInt(v)) && parseInt(v) >= 1 && parseInt(v) <= 20,
    'task_timeout': (v) => !isNaN(parseInt(v)) && parseInt(v) >= 60000 && parseInt(v) <= 3600000,
    'default_model': (v) => ['jimeng', 'stable-diffusion', 'midjourney'].includes(v),
    'default_region': (v) => ['cn', 'us'].includes(v),
    'upload_dir': (v) => v.length > 0
  };

  const validator = validations[key];
  if (validator) {
    return validator(value);
  }

  // 对于未知设置，只进行基本验证
  return typeof value === 'string' && value.length > 0;
}

/**
 * 重置设置为默认值
 */
export const resetSettings = async (ctx: Context) => {
  try {
    const { keys } = ctx.request.body as any;

    if (!Array.isArray(keys)) {
      ctx.status = 400;
      ctx.body = { message: 'keys 必须是数组' };
      return;
    }

    const resetKeys: string[] = [];

    for (const key of keys) {
      if (DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]) {
        await database.run(
          `INSERT INTO settings (key, value, description, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = CURRENT_TIMESTAMP`,
          [key, DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS], `Default setting: ${key}`]
        );
        resetKeys.push(key);
      }
    }

    logger.info(`设置重置成功: ${resetKeys.join(', ')} by ${ctx.state.user.username}`);

    ctx.body = {
      message: '设置重置成功',
      reset_keys: resetKeys
    };
  } catch (error) {
    logger.error('重置设置失败:', error);
    ctx.status = 500;
    ctx.body = { message: '重置设置失败' };
  }
};

/**
 * 导出设置
 */
export const exportSettings = async (ctx: Context) => {
  try {
    const settings = await database.all('SELECT key, value FROM settings ORDER BY key');

    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: ctx.state.user.username,
      settings: settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>)
    };

    ctx.set('Content-Type', 'application/json');
    ctx.set('Content-Disposition', 'attachment; filename="settings.json"');
    ctx.body = exportData;
  } catch (error) {
    logger.error('导出设置失败:', error);
    ctx.status = 500;
    ctx.body = { message: '导出设置失败' };
  }
};

/**
 * 导入设置
 */
export const importSettings = async (ctx: Context) => {
  try {
    const { settings } = ctx.request.body as any;

    if (!settings || typeof settings !== 'object') {
      ctx.status = 400;
      ctx.body = { message: '无效的设置数据' };
      return;
    }

    const importedKeys: string[] = [];
    const skippedKeys: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      // 验证设置值
      if (!validateSettingValue(key, value as string)) {
        skippedKeys.push(key);
        continue;
      }

      // 更新设置
      await database.run(
        `INSERT INTO settings (key, value, description, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
        [key, value as string, `Imported setting: ${key}`]
      );

      importedKeys.push(key);
    }

    logger.info(`设置导入成功: ${importedKeys.join(', ')} by ${ctx.state.user.username}`);

    ctx.body = {
      message: '设置导入完成',
      imported_keys: importedKeys,
      skipped_keys
    };
  } catch (error) {
    logger.error('导入设置失败:', error);
    ctx.status = 500;
    ctx.body = { message: '导入设置失败' };
  }
};