import _ from "lodash";
import util from "../util.ts";

/**
 * Cookie解析和地区判断管理器
 */
export interface ParsedCookieInfo {
  /** 用户token */
  token: string;
  /** 是否为国际版 */
  isUS: boolean;
  /** 地区信息 */
  region: "cn" | "us";
  /** 完整的cookie字符串 */
  cookieString: string;
  /** 从cookie中解析的其他信息 */
  additionalInfo: Record<string, string>;
}

/**
 * Cookie管理器
 */
export class CookieManager {
  /**
   * 解析cookie字符串
   * @param cookieString cookie字符串，支持两种格式：
   * 1. 新格式：用"....."分隔的完整cookie字符���
   * 2. 旧格式：直接的refreshToken
   * @returns 解析后的cookie信息
   */
  static parseCookie(cookieString: string): ParsedCookieInfo {
    if (!cookieString) {
      throw new Error("Cookie字符串不能为空");
    }

    // 检查是否为新格式（包含"....."分隔符）
    if (cookieString.includes(".....")) {
      return this.parseNewCookieFormat(cookieString);
    } else {
      return this.parseOldCookieFormat(cookieString);
    }
  }

  /**
   * 解析新格式的cookie字符串
   * @param cookieString 用"....."分隔的cookie字符串
   */
  private static parseNewCookieFormat(cookieString: string): ParsedCookieInfo {
    // 还原cookie字符串（将"....."替换回"; "）
    const actualCookieString = cookieString.replace(/\.\.\.\.\./g, "; ");

    // 解析cookie项
    const cookieItems = this.parseCookieItems(actualCookieString);

    // 检查capcut_locale来判断地区
    const isUS = cookieItems.capcut_locale === "en";
    const region = isUS ? "us" : "cn";

    // 尝试从多个可能的字段中获取token
    let token = "";
    const possibleTokenFields = ["sessionid", "sid_tt", "sessionid_ss"];

    for (const field of possibleTokenFields) {
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
      cookieString: actualCookieString,
      additionalInfo: cookieItems
    };
  }

  /**
   * 解析旧格式的cookie（直接使用refreshToken）
   * @param refreshToken refreshToken字符串
   */
  private static parseOldCookieFormat(refreshToken: string): ParsedCookieInfo {
    const isUS = refreshToken.toLowerCase().startsWith('us-');
    const token = isUS ? refreshToken.substring(3) : refreshToken;
    const region = isUS ? "us" : "cn";

    // 生成标准的cookie字符串
    const generatedCookie = this.generateStandardCookie(token, region);

    return {
      token,
      isUS,
      region,
      cookieString: generatedCookie,
      additionalInfo: {
        sessionid: token,
        sid_tt: token
      }
    };
  }

  /**
   * 解析cookie项为键值对对象
   * @param cookieString cookie字符串
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
   * @param token token字符串
   * @param region 地区
   */
  private static generateStandardCookie(token: string, region: "cn" | "us"): string {
    const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
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
   * @param cookieString cookie字符串
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
   * @param cookieString cookie字符串
   */
  static getTokenFromCookie(cookieString: string): string {
    const parsed = this.parseCookie(cookieString);
    return parsed.token;
  }

  /**
   * 判断是否为国际版
   * @param cookieString cookie字符串
   */
  static isInternationalVersion(cookieString: string): boolean {
    const parsed = this.parseCookie(cookieString);
    return parsed.isUS;
  }

  /**
   * 获取地区信息
   * @param cookieString cookie字符串
   */
  static getRegion(cookieString: string): "cn" | "us" {
    const parsed = this.parseCookie(cookieString);
    return parsed.region;
  }
}