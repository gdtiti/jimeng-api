/**
 * 环境变量加载器
 * 负责加载、验证和显示环境变量状态
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from './logger';

interface EnvConfig {
  name: string;
  value: string | undefined;
  required: boolean;
  description: string;
  defaultValue?: string;
  masked?: boolean; // 是否需要隐藏敏感信息
}

class EnvLoader {
  private loadedVars: Map<string, string> = new Map();
  private envFile: string | null = null;
  private configVars: EnvConfig[] = [];

  constructor() {
    this.defineConfigVars();
    this.loadEnvironment();
  }

  /**
   * 定义需要监控的环境变量配置
   */
  private defineConfigVars() {
    this.configVars = [
      // 基础服务配置
      {
        name: 'NODE_ENV',
        value: process.env.NODE_ENV,
        required: false,
        description: 'Node.js 运行环境',
        defaultValue: 'development'
      },
      {
        name: 'SERVER_HOST',
        value: process.env.SERVER_HOST,
        required: false,
        description: '服务器主机地址',
        defaultValue: '0.0.0.0'
      },
      {
        name: 'SERVER_PORT',
        value: process.env.SERVER_PORT,
        required: false,
        description: '服务器端口',
        defaultValue: '3000'
      },

      // URL配置
      {
        name: 'JIMENG_CN_URLS',
        value: process.env.JIMENG_CN_URLS,
        required: false,
        description: '即梦中国API地址（多个地址用分号分隔）',
        defaultValue: 'https://jimeng.jianying.com'
      },
      {
        name: 'JIMENG_US_URLS',
        value: process.env.JIMENG_US_URLS,
        required: false,
        description: '即梦国际API地址（多个地址用分号分隔）',
        defaultValue: 'https://commerce.us.capcut.com'
      },

      // 代理配置
      {
        name: 'DREAMINA_CN_PROXY',
        value: process.env.DREAMINA_CN_PROXY,
        required: false,
        description: '即梦中国代理地址',
        defaultValue: 'https://jimeng.jianying.com/tech'
      },
      {
        name: 'DREAMINA_US_PROXY',
        value: process.env.DREAMINA_US_PROXY,
        required: false,
        description: '即梦国际代理地址',
        defaultValue: 'https://api-proxy-1.deno.dev/dreamina/us'
      },

      // 认证相关
      {
        name: 'DEFAULT_TOKEN_CN',
        value: process.env.DEFAULT_TOKEN_CN,
        required: false,
        description: '默认中国版Token',
        masked: true
      },
      {
        name: 'DEFAULT_TOKEN_US',
        value: process.env.DEFAULT_TOKEN_US,
        required: false,
        description: '默认国际版Token',
        masked: true
      },

      // AWS配置
      {
        name: 'AWS_ACCESS_KEY_ID',
        value: process.env.AWS_ACCESS_KEY_ID,
        required: false,
        description: 'AWS访问密钥ID',
        masked: true
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        value: process.env.AWS_SECRET_ACCESS_KEY,
        required: false,
        description: 'AWS秘密访问密钥',
        masked: true
      },
      {
        name: 'AWS_REGION',
        value: process.env.AWS_REGION,
        required: false,
        description: 'AWS区域',
        defaultValue: 'us-east-1'
      },
      {
        name: 'AWS_S3_BUCKET',
        value: process.env.AWS_S3_BUCKET,
        required: false,
        description: 'AWS S3存储桶名称'
      },

      // 安全配置
      {
        name: 'CORS_ORIGINS',
        value: process.env.CORS_ORIGINS,
        required: false,
        description: 'CORS允许的源地址',
        defaultValue: '*'
      },
      {
        name: 'RATE_LIMIT_ENABLED',
        value: process.env.RATE_LIMIT_ENABLED,
        required: false,
        description: '是否启用速率限制',
        defaultValue: 'false'
      },
      {
        name: 'RATE_LIMIT_MAX',
        value: process.env.RATE_LIMIT_MAX,
        required: false,
        description: '速率限制最大请求数',
        defaultValue: '100'
      },

      // 日志配置
      {
        name: 'LOG_LEVEL',
        value: process.env.LOG_LEVEL,
        required: false,
        description: '日志级别',
        defaultValue: 'info'
      },
      {
        name: 'LOG_FILE_ENABLED',
        value: process.env.LOG_FILE_ENABLED,
        required: false,
        description: '是否启用文件日志',
        defaultValue: 'false'
      },

      // 性能配置
      {
        name: 'CACHE_ENABLED',
        value: process.env.CACHE_ENABLED,
        required: false,
        description: '是否启用缓存',
        defaultValue: 'true'
      },
      {
        name: 'CACHE_TTL',
        value: process.env.CACHE_TTL,
        required: false,
        description: '缓存过期时间（秒）',
        defaultValue: '300'
      },

      // 数据库配置（如果使用）
      {
        name: 'DATABASE_URL',
        value: process.env.DATABASE_URL,
        required: false,
        description: '数据库连接URL',
        masked: true
      },

      // 其他配置
      {
        name: 'API_KEY',
        value: process.env.API_KEY,
        required: false,
        description: 'API密钥（如果需要）',
        masked: true
      }
    ];
  }

  /**
   * 加载环境变量
   */
  private loadEnvironment() {
    // 尝试加载.env文件
    const envFiles = [
      '.env.local',
      '.env.development',
      '.env',
      '.env.example'
    ];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const result = dotenv.config({ path: envFile });
        if (result.error) {
          logger.warn(`加载 ${envFile} 失败:`, result.error.message);
        } else {
          this.envFile = envFile;
          logger.info(`成功加载环境变量文件: ${envFile}`);
          break;
        }
      }
    }

    if (!this.envFile) {
      logger.warn('未找到环境变量文件，使用系统环境变量');
    }

    // 更新配置变量的值
    this.configVars.forEach(configVar => {
      configVar.value = process.env[configVar.name];
      if (configVar.value) {
        this.loadedVars.set(configVar.name, configVar.value);
      }
    });
  }

  /**
   * 打印环境变量加载状态
   */
  public printEnvironmentStatus() {
    logger.header();
    logger.info('📦 环境变量加载状态');
    logger.info('=' .repeat(50));

    // 基础信息
    logger.info(`📄 环境文件: ${this.envFile || '未找到'}`);
    logger.info(`📊 已加载变量数: ${this.loadedVars.size}/${this.configVars.length}`);
    logger.info('');

    // 分类显示配置
    this.printConfigCategory('🖥️  基础服务配置', [
      'NODE_ENV', 'SERVER_HOST', 'SERVER_PORT'
    ]);

    this.printConfigCategory('🌐 URL配置', [
      'JIMENG_CN_URLS', 'JIMENG_US_URLS', 'DREAMINA_CN_PROXY', 'DREAMINA_US_PROXY'
    ]);

    this.printConfigCategory('🔐 认证配置', [
      'DEFAULT_TOKEN_CN', 'DEFAULT_TOKEN_US'
    ]);

    this.printConfigCategory('☁️  AWS配置', [
      'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'
    ]);

    this.printConfigCategory('🛡️  安全配置', [
      'CORS_ORIGINS', 'RATE_LIMIT_ENABLED', 'RATE_LIMIT_MAX'
    ]);

    this.printConfigCategory('📝 日志配置', [
      'LOG_LEVEL', 'LOG_FILE_ENABLED'
    ]);

    this.printConfigCategory('⚡ 性能配置', [
      'CACHE_ENABLED', 'CACHE_TTL'
    ]);

    this.printConfigCategory('🔧 其他配置', [
      'DATABASE_URL', 'API_KEY'
    ]);

    // 检查必需变量
    this.checkRequiredVariables();

    // 打印URL汇总
    this.printURLSummary();

    logger.info('=' .repeat(50));
  }

  /**
   * 打印配置分类
   */
  private printConfigCategory(title: string, varNames: string[]) {
    logger.info(title);

    const categoryVars = this.configVars.filter(config =>
      varNames.includes(config.name)
    );

    categoryVars.forEach(config => {
      const status = this.getVariableStatus(config);
      const value = this.formatVariableValue(config);
      const description = config.description ? ` (${config.description})` : '';

      logger.info(`  ${status} ${config.name}: ${value}${description}`);
    });

    logger.info('');
  }

  /**
   * 获取变量状态图标
   */
  private getVariableStatus(config: EnvConfig): string {
    if (config.value) {
      return '✅';
    } else if (config.required) {
      return '❌';
    } else if (config.defaultValue) {
      return '⚡';
    } else {
      return '⚪';
    }
  }

  /**
   * 格式化变量值显示
   */
  private formatVariableValue(config: EnvConfig): string {
    if (config.value) {
      if (config.masked) {
        return this.maskSensitiveValue(config.value);
      }
      return config.value;
    } else if (config.defaultValue) {
      return `[默认: ${config.defaultValue}]`;
    } else {
      return '[未设置]';
    }
  }

  /**
   * 掩码敏感信息
   */
  private maskSensitiveValue(value: string): string {
    if (!value || value.length <= 6) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
  }

  /**
   * 检查必需变量
   */
  private checkRequiredVariables() {
    logger.info('🔍 必需变量检查:');

    const requiredVars = this.configVars.filter(config => config.required);
    const missingRequired = requiredVars.filter(config => !config.value);

    if (missingRequired.length === 0) {
      logger.success('  ✅ 所有必需变量都已设置');
    } else {
      logger.warn('  ⚠️  缺少必需变量:');
      missingRequired.forEach(config => {
        logger.warn(`    ❌ ${config.name}: ${config.description}`);
      });
    }
    logger.info('');
  }

  /**
   * 打印URL汇总
   */
  private printURLSummary() {
    logger.info('🌐 API地址汇总:');

    const cnUrls = process.env.JIMENG_CN_URLS || 'https://jimeng.jianying.com';
    const usUrls = process.env.JIMENG_US_URLS || 'https://commerce.us.capcut.com';
    const cnProxy = process.env.DREAMINA_CN_PROXY || 'https://jimeng.jianying.com/tech';
    const usProxy = process.env.DREAMINA_US_PROXY || 'https://api-proxy-1.deno.dev/dreamina/us';

    logger.info(`  🇨🇳 中国版API: ${cnUrls}`);
    logger.info(`  🇨🇳 中国版代理: ${cnProxy}`);
    logger.info(`  🌍 国际版API: ${usUrls}`);
    logger.info(`  🌍 国际版代理: ${usProxy}`);

    // 显示URL数量
    const cnUrlCount = cnUrls.split(';').filter(url => url.trim()).length;
    const usUrlCount = usUrls.split(';').filter(url => url.trim()).length;

    if (cnUrlCount > 1 || usUrlCount > 1) {
      logger.info(`  📊 负载均衡: 中国版${cnUrlCount}个地址, 国际版${usUrlCount}个地址`);
    }

    logger.info('');
  }

  /**
   * 获取所有加载的环境变量
   */
  public getLoadedVars(): Map<string, string> {
    return new Map(this.loadedVars);
  }

  /**
   * 获取特定的环境变量
   */
  public getVar(name: string): string | undefined {
    return this.loadedVars.get(name);
  }

  /**
   * 检查变量是否存在
   */
  public hasVar(name: string): boolean {
    return this.loadedVars.has(name);
  }

  /**
   * 验证环境配置
   */
  public validateConfiguration(): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查必需变量
    const requiredVars = this.configVars.filter(config => config.required);
    requiredVars.forEach(config => {
      if (!config.value) {
        errors.push(`缺少必需的环境变量: ${config.name}`);
      }
    });

    // 检查URL格式
    ['JIMENG_CN_URLS', 'JIMENG_US_URLS', 'DREAMINA_CN_PROXY', 'DREAMINA_US_PROXY'].forEach(varName => {
      const value = process.env[varName];
      if (value && !this.isValidUrl(value)) {
        warnings.push(`环境变量 ${varName} 的URL格式可能不正确: ${value}`);
      }
    });

    // 检查端口号
    const port = process.env.SERVER_PORT;
    if (port && isNaN(Number(port))) {
      errors.push(`SERVER_PORT 必须是有效的数字: ${port}`);
    }

    // 检查日志级别
    const logLevel = process.env.LOG_LEVEL;
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (logLevel && !validLogLevels.includes(logLevel.toLowerCase())) {
      warnings.push(`LOG_LEVEL 值无效: ${logLevel}，有效值: ${validLogLevels.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * 简单的URL格式验证
   */
  private isValidUrl(url: string): boolean {
    try {
      // 支持多个URL用分号分隔
      const urls = url.split(';');
      for (const u of urls) {
        const trimmed = u.trim();
        if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}

// 创建全局实例
const envLoader = new EnvLoader();

export default envLoader;

// 导出一些便捷函数
export const printEnvironmentStatus = () => envLoader.printEnvironmentStatus();
export const getLoadedVars = () => envLoader.getLoadedVars();
export const getVar = (name: string) => envLoader.getVar(name);
export const hasVar = (name: string) => envLoader.hasVar(name);
export const validateConfiguration = () => envLoader.validateConfiguration();