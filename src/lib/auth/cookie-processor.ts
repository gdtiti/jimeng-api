import { EnhancedCookieManager, EnhancedParsedCookieInfo } from "./enhanced-cookie-manager.ts";

/**
 * Cookie处理结果接口
 */
export interface CookieProcessResult {
  success: boolean;
  data?: EnhancedParsedCookieInfo;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Cookie字符串处理和验证工具类
 */
export class CookieProcessor {
  /**
   * 处理和验证cookie字符串
   * @param cookieString 原始cookie字符串
   * options 处理选项
   */
  static processCookie(
    cookieString: string,
    options: {
      format?: 'auto' | 'enhanced' | 'legacy' | 'standard';
      validateFields?: string[];
      cleanString?: boolean;
      strictMode?: boolean;
    } = {}
  ): CookieProcessResult {
    const {
      format = 'auto',
      validateFields = ['capcut_locale', 'sessionid'],
      cleanString = true,
      strictMode = false
    } = options;

    try {
      // 清理cookie字符串
      let processedCookie = cookieString;
      if (cleanString) {
        processedCookie = EnhancedCookieManager.cleanCookieString(cookieString);
        processedCookie = EnhancedCookieManager.formatCookieString(processedCookie);
      }

      // 解析cookie
      let parsedInfo: EnhancedParsedCookieInfo;

      switch (format) {
        case 'enhanced':
          parsedInfo = EnhancedCookieManager.parseCookie(processedCookie);
          break;
        case 'legacy':
          // 对于旧格式，尝试解析为标准格式
          if (processedCookie.includes("=") && !processedCookie.includes(".....")) {
            parsedInfo = EnhancedCookieManager.parseCookie(processedCookie);
          } else {
            parsedInfo = EnhancedCookieManager.parseCookie(processedCookie);
          }
          break;
        case 'standard':
          // 只处理标准key=value格式
          if (processedCookie.includes(".....")) {
            throw new Error("标准格式不支持'.....'分隔符");
          }
          parsedInfo = EnhancedCookieManager.parseCookie(processedCookie);
          break;
        default: // 'auto'
          parsedInfo = EnhancedCookieManager.parseCookie(processedCookie);
          break;
      }

      // 验证必要字段
      const validation = EnhancedCookieManager.validateRequiredFields(
        processedCookie,
        validateFields
      );

      const warnings = [...(validation.warnings || [])];

      // 添加额外的检查警告
      if (strictMode) {
        if (!parsedInfo.deviceInfo?.teaWebId) {
          warnings.push("缺少_tea_web_id字段");
        }
        if (!parsedInfo.sessionInfo?.sidGuard) {
          warnings.push("缺少_sid_guard字段");
        }
        if (!parsedInfo.localeInfo?.capcutLocale) {
          warnings.push("缺少_capcut_locale字段，可能影响地区判断");
        }
      }

      return {
        success: true,
        data: parsedInfo,
        warnings,
        suggestions: this.generateSuggestions(parsedInfo, validation.missingFields, warnings)
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestions: this.generateErrorSuggestions(error.message, cookieString)
      };
    }
  }

  /**
   * 生成建议信息
   */
  private static generateSuggestions(
    parsedInfo: EnhancedParsedCookieInfo,
    missingFields: string[],
    warnings: string[]
  ): string[] {
    const suggestions: string[] = [];

    // 基于缺失字段的建议
    if (missingFields.length > 0) {
      suggestions.push(`建议添加缺失字段: ${missingFields.join(', ')}`);
    }

    // 基于警告的建议
    if (warnings.length > 0) {
      suggestions.push(`建议完善以下字段: ${warnings.join(', ')}`);
    }

    // 基于地区信息的建议
    if (!parsedInfo.localeInfo?.capcutLocale) {
      suggestions.push("建议添加capcut_locale字段以确保正确的地区判断");
    }

    // 基于商业信息的建议
    if (!parsedInfo.commercialInfo) {
      suggestions.push("考虑添加商业相关字段以获得更好的功能支持");
    }

    return suggestions;
  }

  /**
   * 生成错误处理建议
   */
  private static generateErrorSuggestions(errorMessage: string, cookieString: string): string[] {
    const suggestions: string[] = [];

    // 基于错误信息的建议
    if (errorMessage.includes("token")) {
      suggestions.push("检查cookie中是否包含有效的sessionid或sid_tt字段");
      suggestions.push("确认token格式是否正确");
    }

    if (errorMessage.includes("格式") || errorMessage.includes("parse")) {
      suggestions.push("检查cookie字符串格式是否正确");
      suggestions.push("确保使用'; '或'.....'作为分隔符");
    }

    if (errorMessage.includes("空")) {
      suggestions.push("cookie字符串不能为空");
    }

    // 基于cookie字符串内容的建议
    if (cookieString.includes(".....")) {
      suggestions.push("确认'.....'分隔符的使用是否正确");
      suggestions.push("检查每个字段是否正确编码");
    } else if (cookieString.includes("=")) {
      suggestions.push("这是标准cookie格式，可以正常使用");
    } else {
      suggestions.push("这可能是一个token，尝试使用旧格式解析");
      suggestions.push("考虑添加完整的cookie字段以获得更好功能");
    }

    return suggestions;
  }

  /**
   * 验证cookie字符串的完整性
   */
  static validateCookieIntegrity(cookieString: string): {
    isValid: boolean;
    issues: string[];
    fixes: string[];
  } {
    const issues: string[] = [];
    const fixes: string[] = [];

    // 检查基本格式
    if (!cookieString || cookieString.trim().length === 0) {
      issues.push("Cookie字符串为空");
      fixes.push("提供有效的cookie字符串");
      return { isValid: false, issues, fixes };
    }

    // 检查分隔符一致性
    const hasSemicolon = cookieString.includes(";");
    const hasDots = cookieString.includes(".....");

    if (hasSemicolon && hasDots) {
      issues.push("混合使用分号和点分隔符");
      fixes.push("统一使用一种分隔符（推荐使用'.....'）");
    }

    // 检查格式
    if (!cookieString.includes("=") && !cookieString.includes(".....")) {
      issues.push("cookie格式不正确，既没有等号也没有点分隔符");
      fixes.push("使用正确的cookie格式: key=value 或 key1=val1.....key2=val2");
    }

    // 检查编码问题
    if (cookieString.includes("%7C") && !cookieString.includes("%7D")) {
      issues.push("检测到URL编码但可能不完整");
      fixes.push("检查cookie字段的URL编码是否正确");
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixes
    };
  }

  /**
   * 格式化cookie字符串为推荐格式
   */
  static formatCookieString(
    cookieString: string,
    options: {
      separator?: 'semicolon' | 'dots';
      sortFields?: boolean;
      validateFields?: boolean;
    } = {}
  ): string {
    const {
      separator = 'dots',
      sortFields = true,
      validateFields = false
    } = options;

    try {
      let processedCookie = cookieString;

      // 根据需要转换分隔符
      if (separator === 'dots' && processedCookie.includes(";")) {
        processedCookie = processedCookie.replace(/;\s*/g, ".....");
      } else if (separator === 'semicolon' && processedCookie.includes(".....")) {
        processedCookie = processedCookie.replace(/\.\.\.\.\./g, "; ");
      }

      // 解析和重新构建
      const parsed = EnhancedCookieManager.parseCookie(processedCookie);
      const items = parsed.additionalInfo;

      // 排序字段
      if (sortFields) {
        const sortedEntries = Object.entries(items).sort(([keyA], [keyB]) => {
          const priorityOrder = [
            '_tea_web_id',
            'sessionid',
            'sid_tt',
            'sessionid_ss',
            'capcut_locale',
            'store-region',
            'uid_tt'
          ];

          const indexA = priorityOrder.indexOf(keyA);
          const indexB = priorityOrder.indexOf(keyB);

          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }

          if (indexA === -1 && indexB === -1) {
            return keyA.localeCompare(keyB);
          }

          return indexA === -1 ? 1 : (indexB === -1 ? -1 : 0);
        });

        processedCookie = sortedEntries
          .map(([key, value]) => `${key}=${value}`)
          .join(separator === 'dots' ? "....." : "; ");
      }

      // 验证结果
      if (validateFields) {
        const validation = EnhancedCookieManager.validateRequiredFields(processedCookie);
        if (!validation.valid) {
          throw new Error(`格式化后的cookie缺少必要字段: ${validation.missingFields.join(', ')}`);
        }
      }

      return processedCookie;

    } catch (error) {
      // 如果格式化失败，返回原始字符串
      console.warn("Cookie格式化失败，返回原始字符串:", error.message);
      return cookieString;
    }
  }

  /**
   * 合并两个cookie字符串
   */
  static mergeCookies(cookie1: string, cookie2: string): string {
    try {
      const parsed1 = EnhancedCookieManager.parseCookie(cookie1);
      const parsed2 = EnhancedCookieManager.parseCookie(cookie2);

      // 合并字段，第二个cookie的值优先
      const mergedItems = { ...parsed1.additionalInfo, ...parsed2.additionalInfo };

      // 重建cookie字符串
      return Object.entries(mergedItems)
        .map(([key, value]) => `${key}=${value}`)
        .join(".....");
    } catch (error) {
      console.error("Cookie合并失败:", error.message);
      return cookie1; // 返回第一个cookie
    }
  }

  /**
   * 从cookie字符串中提取特定字段
   */
  static extractFields(cookieString: string, fields: string[]): Record<string, string> {
    try {
      const parsed = EnhancedCookieManager.parseCookie(cookieString);
      const result: Record<string, string> = {};

      for (const field of fields) {
        const value = parsed.additionalInfo[field];
        if (value !== undefined) {
          result[field] = value;
        }
      }

      return result;
    } catch (error) {
      console.error("字段提取失败:", error.message);
      return {};
    }
  }

  /**
   * 更新cookie字符串中的特定字段
   */
  static updateFields(
    cookieString: string,
    updates: Record<string, string>
  ): string {
    try {
      const parsed = EnhancedCookieManager.parseCookie(cookieString);

      // 更新字段
      const updatedItems = { ...parsed.additionalInfo, ...updates };

      // 重建cookie字符串
      return Object.entries(updatedItems)
        .map(([key, value]) => `${key}=${value}`)
        .join(".....");
    } catch (error) {
      console.error("字段更新失败:", error.message);
      return cookieString;
    }
  }

  /**
   * 移除cookie字符串中的特定字段
   */
  static removeFields(cookieString: string, fieldsToRemove: string[]): string {
    try {
      const parsed = EnhancedCookieManager.parseCookie(cookieString);

      // 移除指定字段
      const filteredItems = { ...parsed.additionalInfo };
      for (const field of fieldsToRemove) {
        delete filteredItems[field];
      }

      // 重建cookie字符串
      return Object.entries(filteredItems)
        .map(([key, value]) => `${key}=${value}`)
        .join(".....");
    } catch (error) {
      console.error("字段移除失败:", error.message);
      return cookieString;
    }
  }

  /**
   * 检查cookie字符串是否包含特定字段
   */
  static hasFields(cookieString: string, fields: string[]): boolean {
    try {
      const result = this.extractFields(cookieString, fields);
      return fields.every(field => result[field] !== undefined);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取cookie字符串的摘要信息
   */
  static getCookieSummary(cookieString: string) {
    const summary = EnhancedCookieManager.getCookieSummary(cookieString);

    return {
      ...summary,
      originalLength: cookieString.length,
      processedLength: summary.isValid ? cookieString.length : 0,
      format: this.detectCookieFormat(cookieString),
      region: summary.region,
      isValid: summary.isValid
    };
  }

  /**
   * 检测cookie字符串格式
   */
  static detectCookieFormat(cookieString: string): 'enhanced' | 'legacy' | 'standard' | 'unknown' {
    if (cookieString.includes(".....")) {
      return 'enhanced';
    } else if (cookieString.includes("=")) {
      return 'standard';
    } else if (cookieString.length > 0 && !cookieString.includes("=")) {
      return 'legacy';
    } else {
      return 'unknown';
    }
  }

  /**
   * 转换cookie格式
   */
  static convertFormat(
    cookieString: string,
    targetFormat: 'enhanced' | 'standard' | 'legacy'
  ): string {
    const currentFormat = this.detectCookieFormat(cookieString);

    if (currentFormat === targetFormat) {
      return cookieString;
    }

    try {
      const parsed = EnhancedCookieManager.parseCookie(cookieString);

      // 重建为指定格式
      switch (targetFormat) {
        case 'enhanced':
          return Object.entries(parsed.additionalInfo)
            .map(([key, value]) => `${key}=${value}`)
            .join(".....");

        case 'standard':
          return Object.entries(parsed.additionalInfo)
            .map(([key, value]) => `${key}=${value}`)
            .join("; ");

        case 'legacy':
          // 简化为token格式
          return parsed.isUS ? `us-${parsed.token}` : parsed.token;

        default:
          return cookieString;
      }
    } catch (error) {
      console.error("格式转换失败:", error.message);
      return cookieString;
    }
  }

  /**
   * 批量处理cookie字符串
   */
  static processCookies(
    cookieStrings: string[],
    options: {
      format?: 'auto' | 'enhanced' | 'legacy' | 'standard';
      validateFields?: string[];
      cleanString?: boolean;
      strictMode?: boolean;
    } = {}
  ): CookieProcessResult[] {
    return cookieStrings.map(cookieString =>
      this.processCookie(cookieString, options)
    );
  }

  /**
   * 比较两个cookie字符串的差异
   */
  static compareCookies(
    cookie1: string,
    cookie2: string
  ): {
    areEquivalent: boolean;
    differences: string[];
    similarities: string[];
    summary: {
      cookie1: any;
      cookie2: any;
    };
  } {
    try {
      const parsed1 = EnhancedCookieManager.getCookieSummary(cookie1);
      const parsed2 = EnhancedCookieSummary.getCookieSummary(cookie2);

      const areEquivalent = EnhancedCookieManager.areCookiesEquivalent(cookie1, cookie2);

      const differences: string[] = [];
      const similarities: string[] = [];

      // 比较基本属性
      if (parsed1.region !== parsed2.region) {
        differences.push(`地区: ${parsed1.region} vs ${parsed2.region}`);
      } else {
        similarities.push(`地区: ${parsed1.region}`);
      }

      if (parsed1.isValid !== parsed2.isValid) {
        differences.push(`有效性: ${parsed1.isValid} vs ${parsed2.isValid}`);
      } else {
        similarities.push(`有效性: ${parsed1.isValid}`);
      }

      // 比较字段数量
      if (parsed1.fieldCount !== parsed2.fieldCount) {
        differences.push(`字段数量: ${parsed1.fieldCount} vs ${parsed2.fieldCount}`);
      } else {
        similarities.push(`字段数量: ${parsed1.fieldCount}`);
      }

      return {
        areEquivalent,
        differences,
        similarities,
        summary: {
          cookie1: parsed1,
          cookie2: parsed2
        }
      };
    } catch (error) {
      return {
        areEquivalent: false,
        differences: [`解析失败: ${error.message}`],
        similarities: [],
        summary: {
          cookie1: null,
          cookie2: null
        }
      };
    }
  }

  /**
   * 创建标准cookie模板
   */
  static createCookieTemplate(
    token: string,
    region: "cn" | "us",
    options: {
      includeDeviceInfo?: boolean;
      includeSessionInfo?: boolean;
      includeAuthInfo?: boolean;
      includeCommercialInfo?: boolean;
    } = {}
  ): string {
    const {
      includeDeviceInfo = true,
      includeSessionInfo = true,
      includeAuthInfo = false,
      includeCommercialInfo = false
    } = options;

    const WEB_ID = Math.random() * 999999999999999999999 + 7000000000000000000;
    const USER_ID = util.uuid(false);
    const timestamp = util.unixTimestamp();

    const cookieFields: Record<string, string> = {
      '_tea_web_id': WEB_ID.toString(),
      'is_staff_user': 'false',
      'store-region': region === 'us' ? 'us' : 'cn-gd',
      'store-region-src': 'uid',
      'uid_tt': USER_ID,
      'uid_tt_ss': USER_ID,
      'sid_tt': token,
      'sessionid': token,
      'sessionid_ss': token,
      'capcut_locale': region === 'us' ? 'en' : 'zh-CN'
    };

    // 添加会话信息
    if (includeSessionInfo) {
      cookieFields['sid_guard'] = `${token}%7C${timestamp}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`;
    }

    // 添加设备信息
    if (includeDeviceInfo) {
      cookieFields['webId'] = Math.random().toString(36).substring(2, 12);
    }

    // 添加认证信息
    if (includeAuthInfo) {
      cookieFields['passport_csrf_token'] = util.uuid();
    }

    // 添加商业信息
    if (includeCommercialInfo) {
      cookieFields['_isCommercialFreemiumStage'] = "0";
      cookieFields['store_country_code'] = region === 'us' ? 'us' : 'cn-gd';
      cookieFields['store_id'] = region === 'us' ? 'useast5' : 'default';
      cookieFields['tt-target-idc'] = util.uuid();
      cookieFields['store-country-sign'] = region === 'us' ? 'US' : 'CN';
    }

    return Object.entries(cookieFields)
      .map(([key, value]) => `${key}=${value}`)
      .join(".....");
  }
}

/**
 * 便捷函数：处理cookie
 */
export function processCookie(
  cookieString: string,
  options?: {
    format?: 'auto' | 'enhanced' | 'legacy' | 'standard';
    validateFields?: string[];
    cleanString?: boolean;
    strictMode?: boolean;
  }
): CookieProcessResult {
  return CookieProcessor.processCookie(cookieString, options);
}

/**
 * 便捷函数：验证cookie
 */
export function validateCookie(cookieString: string): boolean {
  return CookieProcessor.validateCookieFormat(cookieString);
}

/**
 * 便捷函数：格式化cookie
 */
export function formatCookie(
  cookieString: string,
  options?: {
    separator?: 'semicolon' | 'dots';
    sortFields?: boolean;
    validateFields?: boolean;
  }
): string {
  return CookieProcessor.formatCookieString(cookieString, options);
}

/**
 * 便捷函数：获取cookie摘要
 */
export function getCookieSummary(cookieString: string) {
  return CookieProcessor.getCookieSummary(cookieString);
}

/**
 * 便捷函数：比较cookie
 */
export function compareCookies(cookie1: string, cookie2: string) {
  return CookieProcessor.compareCookies(cookie1, cookie2);
}

/**
 * 便捷函数：创建cookie模板
 */
export function createCookieTemplate(
  token: string,
  region: "cn" | "us",
  options?: {
    includeDeviceInfo?: boolean;
    includeSessionInfo?: boolean;
    includeAuthInfo?: boolean;
    includeCommercialInfo?: boolean;
  }
): string {
  return CookieProcessor.createCookieTemplate(token, region, options);
}

export default CookieProcessor;