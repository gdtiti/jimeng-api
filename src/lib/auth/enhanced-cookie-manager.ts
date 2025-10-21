import _ from "lodash";
import util from "../util.ts";

/**
 * 增强的Cookie信息接口
 */
export interface EnhancedParsedCookieInfo {
  /** 用户token */
  token: string;
  /** 是否为国际版 */
  isUS: boolean;
  /** 地区信息 */
  region: "cn" | "us";
  /** 完整的cookie字符串 */
  cookieString: string;
  /** 从cookie中解析的所有信息 */
  additionalInfo: Record<string, string>;
  /** 商业信息 */
  commercialInfo?: {
    isCommercialFreemium: boolean;
    storeCountryCode: string;
    storeId: string;
    targetId: string;
    sign: string;
  };
  /** 用户设备信息 */
  deviceInfo?: {
    teaWebId: string;
    ttid: string;
    webId: string;
    fpk1: string;
  };
  /** 会话信息 */
  sessionInfo?: {
    sessionId: string;
    sidGuard: string;
    sidUcp: string;
    csrfToken: string;
  };
  /** 语言和地区信息 */
  localeInfo?: {
    capcutLocale: string;
    storeCountryCode: string;
    storeCountrySign?: string;
  };
  /** 认证信息 */
  authInfo?: {
    msToken?: string;
    passportCsrfToken?: string;
  };
}

/**
 * 增强的Cookie管理器 - 支持复杂的cookie结构
 */
export class EnhancedCookieManager {
  /**
   * 解析复杂cookie字符串
   * @param cookieString cookie字符串，支持多种格式
   * @returns 解析后的增强cookie信息
   */
  static parseCookie(cookieString: string): EnhancedParsedCookieInfo {
    if (!cookieString) {
      throw new Error("Cookie字符串不能为空");
    }

    // 检查是否为新格式（包含"....."分隔符）
    if (cookieString.includes(".....")) {
      return this.parseEnhancedCookieFormat(cookieString);
    } else if (cookieString.includes("=")) {
      return this.parseCookiePairFormat(cookieString);
    } else {
      return this.parseLegacyTokenFormat(cookieString);
    }
  }

  /**
   * 解析增强格式的cookie字符串（使用"....."分隔）
   */
  private static parseEnhancedCookieFormat(cookieString: string): EnhancedParsedCookieInfo {
    // 还原cookie字符串（将"....."替换回"; "）
    const actualCookieString = cookieString.replace(/\.\.\.\.\./g, "; ");

    // 解析cookie项
    const cookieItems = this.parseCookieItems(actualCookieString);

    // 检查capcut_locale来判断地区
    const capcutLocale = cookieItems.capcut_locale || cookieItems['capcut-locale'];
    const isUS = capcutLocale === "en" || capcutLocale === "en-US";
    const region = isUS ? "us" : "cn";

    // 尝试从多个可能的字段中获取token
    let token = "";
    const possibleTokenFields = [
      "sessionid",
      "sid_tt",
      "sessionid_ss",
      "sid_guard",  // 有时token在sid_guard中
      "msToken",     // 商业版token
      "passport_csrf_token" // CSRF token
    ];

    for (const field of possibleTokenFields) {
      if (cookieItems[field]) {
        const value = cookieItems[field];
        // 对于sid_guard，需要解析出实际的token
        if (field === "sid_guard") {
          const match = value.match(/^([^|]+)/);
          if (match) {
            token = match[1];
            break;
          }
        } else {
          token = value;
          break;
        }
      }
    }

    if (!token) {
      throw new Error("无法从cookie中找到有效的token");
    }

    // 提取商业信息
    const commercialInfo = this.extractCommercialInfo(cookieItems, region);

    // 提取设备信息
    const deviceInfo = this.extractDeviceInfo(cookieItems);

    // 提取会话信息
    const sessionInfo = this.extractSessionInfo(cookieItems);

    // 提取语言地区信息
    const localeInfo = this.extractLocaleInfo(cookieItems);

    // 提取认证信息
    const authInfo = this.extractAuthInfo(cookieItems);

    return {
      token,
      isUS,
      region,
      cookieString: actualCookieString,
      additionalInfo: cookieItems,
      commercialInfo,
      deviceInfo,
      sessionInfo,
      localeInfo,
      authInfo
    };
  }

  /**
   * 解析标准的key=value格式cookie
   */
  private static parseCookiePairFormat(cookieString: string): EnhancedParsedCookieInfo {
    const cookieItems = this.parseCookieItems(cookieString);

    const capcutLocale = cookieItems.capcut_locale || cookieItems['capcut-locale'];
    const isUS = capcutLocale === "en" || capcutLocale === "en-US";
    const region = isUS ? "us" : "cn";

    // 寻找token
    let token = "";
    for (const field of ["sessionid", "sid_tt", "sessionid_ss"]) {
      if (cookieItems[field]) {
        token = cookieItems[field];
        break;
      }
    }

    if (!token) {
      throw new Error("无法从cookie中找到有效的token");
    }

    return {
      token,
      isUS,
      region,
      cookieString,
      additionalInfo: cookieItems,
      commercialInfo: this.extractCommercialInfo(cookieItems, region),
      deviceInfo: this.extractDeviceInfo(cookieItems),
      sessionInfo: this.extractSessionInfo(cookieItems),
      localeInfo: this.extractLocaleInfo(cookieItems),
      authInfo: this.extractAuthInfo(cookieItems)
    };
  }

  /**
   * 解析旧格式token（向后兼容）
   */
  private static parseLegacyTokenFormat(refreshToken: string): EnhancedParsedCookieInfo {
    const isUS = refreshToken.toLowerCase().startsWith('us-');
    const token = isUS ? refreshToken.substring(3) : refreshToken;
    const region = isUS ? "us" : "cn";

    // 生成标准的cookie字符串
    const generatedCookie = this.generateStandardCookie(token, region);

    const cookieItems = this.parseCookieItems(generatedCookie);

    return {
      token,
      isUS,
      region,
      cookieString: generatedCookie,
      additionalInfo: cookieItems,
      commercialInfo: {
        isCommercialFreemium: false,
        storeCountryCode: region === 'us' ? 'us' : 'cn-gd',
        storeId: region === 'us' ? 'useast5' : 'default',
        targetId: "",
        sign: ""
      },
      deviceInfo: {
        teaWebId: cookieItems._tea_web_id || "",
        ttid: cookieItems.uid_tt || "",
        webId: cookieItems.webId || "",
        fpk1: cookieItems.fpk1 || ""
      },
      sessionInfo: {
        sessionId: token,
        sidGuard: cookieItems.sid_guard || "",
        sidUcp: cookieItems.sid_ucp_v1 || "",
        csrfToken: cookieItems.passport_csrf_token || ""
      },
      localeInfo: {
        capcutLocale: region === 'us' ? 'en' : 'zh-CN',
        storeCountryCode: region === 'us' ? 'us' : 'cn-gd'
      }
    };
  }

  /**
   * 提取商业信息
   */
  private static extractCommercialInfo(cookieItems: any, region: string): any {
    return {
      isCommercialFreemium: cookieItems._isCommercialFreemiumStage === "0",
      storeCountryCode: cookieItems['store-country-code'] || cookieItems.store_country_code || (region === 'us' ? 'us' : 'cn-gd'),
      storeId: cookieItems.store_idc || cookieItems.store_id || (region === 'us' ? 'useast5' : 'default'),
      targetId: cookieItems['tt-target-idc'] || "",
      sign: cookieItems['store-country-sign'] || ""
    };
  }

  /**
   * 提取设备信息
   */
  private static extractDeviceInfo(cookieItems: any): any {
    return {
      teaWebId: cookieItems._tea_web_id || "",
      ttid: cookieItems.uid_tt || cookieItems.ttid || "",
      webId: cookieItems.webId || cookieItems.s_v_web_id || "",
      fpk1: cookieItems.fpk1 || ""
    };
  }

  /**
   * 提取会话信息
   */
  private static extractSessionInfo(cookieItems: any): any {
    return {
      sessionId: cookieItems.sessionid || cookieItems.sid_tt || "",
      sidGuard: cookieItems.sid_guard || "",
      sidUcp: cookieItems.sid_ucp_v1 || "",
      csrfToken: cookieItems.passport_csrf_token || cookieItems.passport_csrf_token_default || ""
    };
  }

  /**
   * 提取语言地区信息
   */
  private static extractLocaleInfo(cookieItems: any): any {
    return {
      capcutLocale: cookieItems.capcut_locale || cookieItems['capcut-locale'] || "",
      storeCountryCode: cookieItems['store-country-code'] || cookieItems.store_country_code || "",
      storeCountrySign: cookieItems['store-country-sign'] || ""
    };
  }

  /**
   * 提取认证信息
   */
  private static extractAuthInfo(cookieItems: any): any {
    const authInfo: any = {};

    if (cookieItems.mstoken) {
      authInfo.msToken = cookieItems.mstoken;
    }

    if (cookieItems.passport_csrf_token || cookieItems.passport_csrf_token_default) {
      authInfo.passportCsrfToken = cookieItems.passport_csrf_token || cookieItems.passport_csrf_token_default;
    }

    return authInfo;
  }

  /**
   * 解析cookie项为键值对对象
   */
  private static parseCookieItems(cookieString: string): Record<string, string> {
    const items: Record<string, string> = {};

    cookieString.split(';').forEach(item => {
      const trimmedItem = item.trim();
      if (trimmedItem) {
        const [key, ...valueParts] = trimmedItem.split('=');
        if (key && valueParts.length > 0) {
          items[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return items;
  }

  /**
   * 生成标准的cookie字符串
   */
  private static generateStandardCookie(token: string, region: "cn" | "us"): string {
    const WEB_ID = Math.random() * 999999999999999999999 + 7000000000000000000;
    const USER_ID = util.uuid(false);
    const timestamp = util.unixTimestamp();

    return [
      `_tea_web_id=${WEB_ID}`,
      `is_staff_user=false`,
      `store-region=${region === 'us' ? 'us' : 'cn-gd'}`,
      `store-region-src=uid`,
      `sid_guard=${token}%7C${timestamp}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
      `uid_tt=${USER_ID}`,
      `uid_tt_ss=${USER_ID}`,
      `sid_tt=${token}`,
      `sessionid=${token}`,
      `sessionid_ss=${token}`,
      `capcut_locale=${region === 'us' ? 'en' : 'zh-CN'}`
    ].join("; ");
  }

  /**
   * 验证cookie格式是否有效
   */
  static validateCookieFormat(cookieString: string): boolean {
    if (!cookieString || typeof cookieString !== "string") {
      return false;
    }

    try {
      const parsed = this.parseCookie(cookieString);
      return !!(parsed.token && parsed.region);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取cookie中的token信息
   */
  static getTokenFromCookie(cookieString: string): string {
    const parsed = this.parseCookie(cookieString);
    return parsed.token;
  }

  /**
   * 判断是否为国际版
   */
  static isInternationalVersion(cookieString: string): boolean {
    const parsed = this.parseCookie(cookieString);
    return parsed.isUS;
  }

  /**
   * 获取地区信息
   */
  static getRegion(cookieString: string): "cn" | "us" {
    const parsed = this.parseCookie(cookieString);
    return parsed.region;
  }

  /**
   * 获取商业信息
   */
  static getCommercialInfo(cookieString: string): any | null {
    try {
      const parsed = this.parseCookie(cookieString);
      return parsed.commercialInfo || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取设备信息
   */
  static getDeviceInfo(cookieString: string): any | null {
    try {
      const parsed = this.parseCookie(cookieString);
      return parsed.deviceInfo || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查是否为商业版用户
   */
  static isCommercialUser(cookieString: string): boolean {
    try {
      const parsed = this.parseCookie(cookieString);
      return !!(parsed.commercialInfo?.isCommercialFreemium === false);
    } catch (error) {
      return false;
    }
  }

  /**
   * 格式化cookie字符串（处理特殊字符）
   */
  static formatCookieString(cookieString: string): string {
    // 移除多余的空格和特殊字符
    return cookieString
      .replace(/\s*;\s*/g, ";")
      .replace(/;\s*$/g, "")
      .replace(/^\s*;/g, "")
      .trim();
  }

  /**
   * 清理cookie字符串（移除空值项）
   */
  static cleanCookieString(cookieString: string): string {
    const items = cookieString.split(';').filter(item => item.trim());
    return items.join('; ');
  }

  /**
   * 比较两个cookie字符串是否等效
   */
  static areCookiesEquivalent(cookie1: string, cookie2: string): boolean {
    try {
      const parsed1 = this.parseCookie(cookie1);
      const parsed2 = this.parseCookie(cookie2);

      return parsed1.token === parsed2.token &&
             parsed1.region === parsed2.region &&
             parsed1.isUS === parsed2.isUS;
    } catch (error) {
      return false;
    }
  }

  /**
   * 从cookie字符串中提取特定字段
   */
  static extractField(cookieString: string, fieldName: string): string | null {
    try {
      const parsed = this.parseCookie(cookieString);
      return parsed.additionalInfo[fieldName] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 验证cookie是否包含必要的字段
   */
  static validateRequiredFields(cookieString: string, requiredFields: string[]): {
    valid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    try {
      const parsed = this.parseCookie(cookieString);
      const missingFields: string[] = [];
      const warnings: string[] = [];

      for (const field of requiredFields) {
        if (!parsed.additionalInfo[field]) {
          missingFields.push(field);
        }
      }

      // 检查推荐的字段
      const recommendedFields = ['capcut_locale', 'sessionid', 'sid_tt'];
      for (const field of recommendedFields) {
        if (!parsed.additionalInfo[field]) {
          warnings.push(field);
        }
      }

      return {
        valid: missingFields.length === 0,
        missingFields,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        missingFields: requiredFields,
        warnings: []
      };
    }
  }

  /**
   * 从cookie字符串生成摘要信息
   */
  static getCookieSummary(cookieString: string): {
    region: string;
    tokenLength: number;
    hasCommercialInfo: boolean;
    hasDeviceInfo: boolean;
    hasAuthInfo: boolean;
    fieldCount: number;
    isValid: boolean;
  } {
      try {
        const parsed = this.parseCookie(cookieString);

        return {
          region: parsed.region,
          tokenLength: parsed.token.length,
          hasCommercialInfo: !!parsed.commercialInfo,
          hasDeviceInfo: !!parsed.deviceInfo,
          hasAuthInfo: !!parsed.authInfo,
          fieldCount: Object.keys(parsed.additionalInfo).length,
          isValid: true
        };
      } catch (error) {
        return {
          region: 'unknown',
          tokenLength: 0,
          hasCommercialInfo: false,
          hasDeviceInfo: false,
          hasAuthInfo: false,
          fieldCount: 0,
          isValid: false
        };
      }
    }
  }
}

/**
 * 便捷函数：解析增强的cookie
 */
export function parseEnhancedCookie(cookieString: string): EnhancedParsedCookieInfo {
  return EnhancedCookieManager.parseCookie(cookieString);
}

/**
 * 便捷函数：获取商业信息
 */
export function getCommercialInfo(cookieString: string): any {
  return EnhancedCookieManager.getCommercialInfo(cookieString);
}

/**
 * 便捷函数：检查是否为商业用户
 */
export function isCommercialUser(cookieString: string): boolean {
  return EnhancedCookieManager.isCommercialUser(cookieString);
}

/**
 * 便捷函数：验证cookie格式
 */
export function validateCookie(cookieString: string): boolean {
  return EnhancedCookieManager.validateCookieFormat(cookieString);
}

/**
 * 便捷函数：清理cookie字符串
 */
export function cleanCookie(cookieString: string): string {
  return EnhancedCookieManager.cleanCookieString(cookieString);
}

export default EnhancedCookieManager;