/**
 * Cookie处理实用工具函数
 *
 * 提供各种Cookie处理和操作的实用函数
 */

import { EnhancedCookieManager } from './enhanced-cookie-manager';
import { CookieProcessor } from './cookie-processor';

/**
 * Cookie工具类
 */
export class CookieUtils {
  /**
   * 快速验证Cookie字符串是否有效
   */
  static quickValidate(cookieString: string): {
    isValid: boolean;
    region?: 'cn' | 'us';
    hasToken: boolean;
    hasLocale: boolean;
    format: 'enhanced' | 'standard' | 'legacy' | 'unknown';
  } {
    try {
      if (!cookieString || cookieString.trim().length === 0) {
        return {
          isValid: false,
          hasToken: false,
          hasLocale: false,
          format: 'unknown'
        };
      }

      // 快速格式检测
      const format = CookieProcessor.detectCookieFormat(cookieString);

      // 检查是否包含token
      const hasToken = cookieString.includes('sessionid=') ||
                      cookieString.includes('sid_tt=') ||
                      cookieString.includes('token=');

      // 检查是否包含地区信息
      const hasLocale = cookieString.includes('capcut_locale=');

      // 解析获取地区
      let region: 'cn' | 'us' | undefined;
      if (hasLocale) {
        const localeMatch = cookieString.match(/capcut_locale=([^;.....]+)/);
        if (localeMatch) {
          region = localeMatch[1] === 'en' ? 'us' : 'cn';
        }
      } else if (cookieString.startsWith('us-')) {
        region = 'us';
      } else if (format === 'legacy') {
        region = 'cn';
      }

      return {
        isValid: hasToken && (hasLocale || region !== undefined),
        region,
        hasToken,
        hasLocale,
        format
      };

    } catch (error) {
      return {
        isValid: false,
        hasToken: false,
        hasLocale: false,
        format: 'unknown'
      };
    }
  }

  /**
   * 提取Cookie中的关键信息
   */
  static extractKeyInfo(cookieString: string): {
    token: string;
    region: 'cn' | 'us';
    userId?: string;
    webId?: string;
    sessionId?: string;
    isValid: boolean;
  } {
    try {
      const parsed = EnhancedCookieManager.parseCookie(cookieString);

      return {
        token: parsed.token,
        region: parsed.region,
        userId: parsed.additionalInfo.uid_tt,
        webId: parsed.additionalInfo._tea_web_id,
        sessionId: parsed.additionalInfo.sessionid,
        isValid: !!parsed.token && !!parsed.region
      };

    } catch (error) {
      // 降级处理
      const validation = this.quickValidate(cookieString);

      return {
        token: this.extractTokenFromRaw(cookieString),
        region: validation.region || 'cn',
        isValid: validation.isValid
      };
    }
  }

  /**
   * 从原始Cookie字符串中提取token
   */
  static extractTokenFromRaw(cookieString: string): string {
    // 优先提取sessionid
    const sessionIdMatch = cookieString.match(/sessionid=([^;.....]+)/);
    if (sessionIdMatch) {
      return sessionIdMatch[1];
    }

    // 其次提取sid_tt
    const sidTtMatch = cookieString.match(/sid_tt=([^;.....]+)/);
    if (sidTtMatch) {
      return sidTtMatch[1];
    }

    // 最后提取token字段
    const tokenMatch = cookieString.match(/token=([^;.....]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }

    // 如果是旧格式，直接返回
    if (!cookieString.includes('=') && !cookieString.includes('.....')) {
      return cookieString.startsWith('us-') ? cookieString.substring(3) : cookieString;
    }

    return '';
  }

  /**
   * 标准化Cookie字符串
   */
  static normalizeCookie(cookieString: string, options: {
    targetFormat?: 'enhanced' | 'standard';
    sortFields?: boolean;
    validateAfterNormalize?: boolean;
  } = {}): string {
    const {
      targetFormat = 'enhanced',
      sortFields = true,
      validateAfterNormalize = false
    } = options;

    try {
      // 解析Cookie
      const parsed = EnhancedCookieManager.parseCookie(cookieString);

      // 构建标准字段集合
      const standardFields = {
        // 核心认证字段
        'sessionid': parsed.token,
        'sid_tt': parsed.token,
        'sessionid_ss': parsed.token,

        // 设备信息
        '_tea_web_id': parsed.deviceInfo._tea_web_id || this.generateWebId(),
        'is_staff_user': 'false',

        // 地区信息
        'store-region': parsed.region === 'us' ? 'us' : 'cn-gd',
        'store-region-src': 'uid',
        'capcut_locale': parsed.localeInfo.capcut_locale || (parsed.region === 'us' ? 'en' : 'zh-CN'),

        // 用户信息
        'uid_tt': parsed.additionalInfo.uid_tt || this.generateUserId(),
        'uid_tt_ss': parsed.additionalInfo.uid_tt || this.generateUserId(),

        // 商业信息（如果存在）
        ...(parsed.commercialInfo && Object.keys(parsed.commercialInfo).length > 0 ? {
          'store_country_code': parsed.commercialInfo.store_country_code,
          'store_id': parsed.commercialInfo.store_id,
          'store-country-sign': parsed.commercialInfo['store-country-sign']
        } : {})
      };

      // 按字段重要性排序
      const fieldOrder = [
        '_tea_web_id', 'is_staff_user', 'store-region', 'store-region-src',
        'sid_guard', 'uid_tt', 'uid_tt_ss', 'sid_tt', 'sessionid', 'sessionid_ss',
        'capcut_locale', 'store_country_code', 'store_id', 'store-country-sign'
      ];

      const sortedFields = sortFields ?
        Object.entries(standardFields)
          .sort(([a], [b]) => {
            const indexA = fieldOrder.indexOf(a);
            const indexB = fieldOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            return indexA === -1 ? 1 : -1;
          }) :
        Object.entries(standardFields);

      // 构建标准化字符串
      const separator = targetFormat === 'enhanced' ? '.....' : '; ';
      const normalizedCookie = sortedFields
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${value}`)
        .join(separator);

      // 验证结果
      if (validateAfterNormalize) {
        const validation = CookieProcessor.processCookie(normalizedCookie, {
          format: targetFormat,
          validateFields: ['capcut_locale', 'sessionid', 'sid_tt']
        });

        if (!validation.success) {
          console.warn('Cookie标准化后验证失败:', validation.error);
        }
      }

      return normalizedCookie;

    } catch (error) {
      console.warn('Cookie标准化失败，返回原始字符串:', error.message);
      return cookieString;
    }
  }

  /**
   * 检测Cookie字符串类型
   */
  static detectCookieType(cookieString: string): {
    type: 'simple-token' | 'standard-cookie' | 'enhanced-cookie' | 'complex-cookie';
    complexity: 'low' | 'medium' | 'high';
    estimatedFields: number;
    features: string[];
  } {
    if (!cookieString || cookieString.trim().length === 0) {
      return {
        type: 'simple-token',
        complexity: 'low',
        estimatedFields: 0,
        features: []
      };
    }

    const features: string[] = [];
    let fieldCount = 0;
    let type: 'simple-token' | 'standard-cookie' | 'enhanced-cookie' | 'complex-cookie';

    // 检测特征
    if (cookieString.includes('.....')) {
      features.push('enhanced-separator');
      fieldCount = cookieString.split('.....').length;
    } else if (cookieString.includes(';')) {
      features.push('standard-separator');
      fieldCount = cookieString.split(';').length;
    } else {
      features.push('token-format');
      fieldCount = 1;
    }

    // 检测关键字段
    const keyFields = [
      'sessionid', 'sid_tt', 'uid_tt', '_tea_web_id', 'capcut_locale',
      'store-region', 'sid_guard', 'csrf_token', 'passport_csrf_token'
    ];

    keyFields.forEach(field => {
      if (cookieString.includes(field)) {
        features.push(field);
      }
    });

    // 检测商业字段
    const commercialFields = ['store_country_code', 'store_id', '_isCommercialFreemiumStage'];
    const hasCommercial = commercialFields.some(field => cookieString.includes(field));
    if (hasCommercial) {
      features.push('commercial-fields');
    }

    // 检测设备字段
    const deviceFields = ['browser_', 'os_', 'device_', 'platform'];
    const hasDeviceInfo = deviceFields.some(field =>
      cookieString.includes(field) || cookieString.toLowerCase().includes(field)
    );
    if (hasDeviceInfo) {
      features.push('device-info');
    }

    // 确定类型
    if (fieldCount === 1 && !cookieString.includes('=')) {
      type = 'simple-token';
    } else if (fieldCount <= 5) {
      type = cookieString.includes('.....') ? 'enhanced-cookie' : 'standard-cookie';
    } else {
      type = 'complex-cookie';
    }

    // 确定复杂度
    let complexity: 'low' | 'medium' | 'high';
    if (fieldCount <= 5) {
      complexity = 'low';
    } else if (fieldCount <= 20) {
      complexity = 'medium';
    } else {
      complexity = 'high';
    }

    return {
      type,
      complexity,
      estimatedFields: fieldCount,
      features
    };
  }

  /**
   * 生成Cookie诊断报告
   */
  static generateDiagnosticReport(cookieString: string): {
    summary: {
      isValid: boolean;
      type: string;
      complexity: string;
      fieldCount: number;
      region?: string;
      hasToken: boolean;
    };
    details: {
      format: string;
      features: string[];
      missingFields: string[];
      warnings: string[];
      suggestions: string[];
    };
    analysis: {
      fieldTypeDistribution: Record<string, number>;
      securityScore: number;
      completenessScore: number;
    };
  } {
    // 基础信息
    const quickValidation = this.quickValidate(cookieString);
    const cookieType = this.detectCookieType(cookieString);
    const keyInfo = this.extractKeyInfo(cookieString);

    // 详细处理
    const processResult = CookieProcessor.processCookie(cookieString, {
      format: 'auto',
      validateFields: ['capcut_locale', 'sessionid', 'sid_tt', 'uid_tt', '_tea_web_id'],
      strictMode: true
    });

    // 字段分布分析
    let fieldTypeDistribution: Record<string, number> = {};
    if (processResult.success && processResult.data) {
      const data = processResult.data;
      fieldTypeDistribution = {
        '设备信息': Object.keys(data.deviceInfo || {}).length,
        '会话信息': Object.keys(data.sessionInfo || {}).length,
        '商业信息': Object.keys(data.commercialInfo || {}).length,
        '地区信息': Object.keys(data.localeInfo || {}).length,
        '其他字段': Object.keys(data.additionalInfo || {}).length -
                    Object.keys(data.deviceInfo || {}).length -
                    Object.keys(data.sessionInfo || {}).length -
                    Object.keys(data.commercialInfo || {}).length -
                    Object.keys(data.localeInfo || {}).length
      };
    }

    // 计算评分
    const securityScore = this.calculateSecurityScore(cookieString);
    const completenessScore = this.calculateCompletenessScore(cookieString);

    return {
      summary: {
        isValid: quickValidation.isValid,
        type: cookieType.type,
        complexity: cookieType.complexity,
        fieldCount: cookieType.estimatedFields,
        region: keyInfo.region,
        hasToken: quickValidation.hasToken
      },
      details: {
        format: quickValidation.format,
        features: cookieType.features,
        missingFields: processResult.success ? [] : ['解析失败'],
        warnings: processResult.warnings || [],
        suggestions: processResult.suggestions || []
      },
      analysis: {
        fieldTypeDistribution,
        securityScore,
        completenessScore
      }
    };
  }

  /**
   * 计算Cookie安全性评分
   */
  private static calculateSecurityScore(cookieString: string): number {
    let score = 100;
    const maxDeduction = 60;

    // 检查敏感字段
    const sensitiveFields = ['password', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (cookieString.toLowerCase().includes(field)) {
        score -= 20;
      }
    });

    // 检查加密标识
    if (!cookieString.includes('csrf') && !cookieString.includes('guard')) {
      score -= 10;
    }

    // 检查过长的字段值（可能是明文）
    const longValues = cookieString.split(/[;.....]/).filter(item => {
      const parts = item.split('=');
      return parts.length === 2 && parts[1].length > 100;
    });

    if (longValues.length > 3) {
      score -= 15;
    }

    return Math.max(score, maxDeduction);
  }

  /**
   * 计算Cookie完整性评分
   */
  private static calculateCompletenessScore(cookieString: string): number {
    let score = 0;
    const maxScore = 100;

    // 必要字段检查
    const requiredFields = [
      'sessionid', 'sid_tt', 'uid_tt', '_tea_web_id', 'capcut_locale'
    ];

    requiredFields.forEach(field => {
      if (cookieString.includes(field)) {
        score += 20;
      }
    });

    // 推荐字段检查
    const recommendedFields = [
      'sid_guard', 'store-region', 'csrf_session_id', 'passport_csrf_token'
    ];

    recommendedFields.forEach(field => {
      if (cookieString.includes(field)) {
        score += 5;
      }
    });

    return Math.min(score, maxScore);
  }

  /**
   * 生成随机Web ID
   */
  private static generateWebId(): string {
    return Math.floor(Math.random() * 9999999999999999999 + 1000000000000000000).toString();
  }

  /**
   * 生成随机用户ID
   */
  private static generateUserId(): string {
    return Math.floor(Math.random() * 9000000000000000000 + 1000000000000000000).toString();
  }

  /**
   * 批量处理Cookie字符串
   */
  static batchProcess(
    cookies: string[],
    options: {
      format?: 'enhanced' | 'standard' | 'legacy';
      validateFields?: string[];
      parallel?: boolean;
    } = {}
  ): Array<{
    cookie: string;
    success: boolean;
    data?: any;
    error?: string;
    index: number;
  }> {
    const { parallel = false } = options;

    if (parallel) {
      // 并行处理（未来实现）
      return cookies.map((cookie, index) => {
        try {
          const result = CookieProcessor.processCookie(cookie, options);
          return {
            cookie,
            success: result.success,
            data: result.data,
            error: result.error,
            index
          };
        } catch (error) {
          return {
            cookie,
            success: false,
            error: error.message,
            index
          };
        }
      });
    } else {
      // 串行处理
      return cookies.map((cookie, index) => {
        try {
          const result = CookieProcessor.processCookie(cookie, options);
          return {
            cookie,
            success: result.success,
            data: result.data,
            error: result.error,
            index
          };
        } catch (error) {
          return {
            cookie,
            success: false,
            error: error.message,
            index
          };
        }
      });
    }
  }

  /**
   * 创建Cookie摘要字符串
   */
  static createCookieSummary(cookieString: string): string {
    const keyInfo = this.extractKeyInfo(cookieString);
    const type = this.detectCookieType(cookieString);

    return [
      `类型: ${type.type}`,
      `复杂度: ${type.complexity}`,
      `字段数: ${type.estimatedFields}`,
      `地区: ${keyInfo.region}`,
      `Token: ${keyInfo.token.substring(0, 10)}...`,
      `有效: ${keyInfo.isValid ? '✅' : '❌'}`
    ].join(' | ');
  }
}

// 导出常用函数的便捷版本
export const quickValidate = CookieUtils.quickValidate.bind(CookieUtils);
export const extractKeyInfo = CookieUtils.extractKeyInfo.bind(CookieUtils);
export const normalizeCookie = CookieUtils.normalizeCookie.bind(CookieUtils);
export const detectCookieType = CookieUtils.detectCookieType.bind(CookieUtils);
export const generateDiagnosticReport = CookieUtils.generateDiagnosticReport.bind(CookieUtils);
export const createCookieSummary = CookieUtils.createCookieSummary.bind(CookieUtils);

export default CookieUtils;