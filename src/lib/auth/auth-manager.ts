import _ from "lodash";
import { CookieManager, ParsedCookieInfo } from "./cookie-manager.ts";
import { getJimengURL, getImageXURL, getCommerceURL } from "../config/url-manager.ts";
import { DEFAULT_ASSISTANT_ID_CN, DEFAULT_ASSISTANT_ID_US, PLATFORM_CODE, VERSION_CODE, REGION_CN, REGION_US, BASE_URL_CN, BASE_URL_DREAMINA_US, BASE_URL_IMAGEX_US, BASE_URL_US_COMMERCE } from "@/api/consts/common.ts";
import util from "../util.ts";
import logger from "../logger.ts";

/**
 * 认证信息接口
 */
export interface AuthInfo {
  /** 解析后的cookie信息 */
  cookieInfo: ParsedCookieInfo;
  /** 应用ID */
  aid: string;
  /** 地区代码 */
  region: string;
  /** 基础URL */
  baseUrl: string;
  /** ImageX URL */
  imagexUrl: string;
  /** 商业服务URL */
  commerceUrl: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** 签名信息 */
  signature: {
    sign: string;
    deviceTime: number;
  };
}

/**
 * 认证管理器 - 统一处理认证逻辑
 */
export class AuthManager {
  private static instance: AuthManager;
  private authCache: Map<string, AuthInfo> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * 获取认证信息（支持cookie字符串或refreshToken）
   * @param authString cookie字符串或refreshToken
   * @param customOptions 自定义选项
   */
  async getAuthInfo(
    authString: string,
    customOptions: {
      region?: "cn" | "us";
      baseUrl?: string;
      imagexUrl?: string;
      commerceUrl?: string;
    } = {}
  ): Promise<AuthInfo> {
    // 检查缓存
    const cacheKey = authString;
    const cached = this.authCache.get(cacheKey);
    if (cached && Date.now() - this.getCacheTimestamp(cacheKey) < this.CACHE_TTL) {
      return cached;
    }

    try {
      // 解析cookie信息
      let cookieInfo: ParsedCookieInfo;

      if (this.isCookieString(authString)) {
        // 新格式：cookie字符串
        cookieInfo = CookieManager.parseCookie(authString);
      } else {
        // 旧格式：refreshToken（保持向后兼容）
        cookieInfo = this.parseRefreshToken(authString);
      }

      // 构建认证信息
      const authInfo = await this.buildAuthInfo(cookieInfo, customOptions);

      // 缓存结果
      this.authCache.set(cacheKey, authInfo);
      this.setCacheTimestamp(cacheKey);

      logger.info(`认证信息构建完成: 地区=${authInfo.region}, AID=${authInfo.aid}`);

      return authInfo;
    } catch (error) {
      logger.error(`构建认证信息失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 判断是否为cookie字符串
   */
  private isCookieString(authString: string): boolean {
    return authString.includes("=") || authString.includes(".....");
  }

  /**
   * 解析refreshToken（旧格式兼容）
   */
  private parseRefreshToken(refreshToken: string): ParsedCookieInfo {
    return CookieManager.parseCookie(refreshToken);
  }

  /**
   * 构建认证信息
   */
  private async buildAuthInfo(
    cookieInfo: ParsedCookieInfo,
    customOptions: {
      region?: "cn" | "us";
      baseUrl?: string;
      imagexUrl?: string;
      commerceUrl?: string;
    }
  ): Promise<AuthInfo> {
    const region = customOptions.region || cookieInfo.region;

    // 获取基础URL
    const baseUrl = customOptions.baseUrl || this.getBaseUrl(region);
    const imagexUrl = customOptions.imagexUrl || this.getImageXUrl(region);
    const commerceUrl = customOptions.commerceUrl || this.getCommerceUrl(region);

    // 获取应用ID
    const aid = this.getAid(region);

    // 生成签名
    const signature = this.generateSignature();

    // 构建请求头
    const headers = this.buildHeaders(cookieInfo, aid, baseUrl, signature);

    return {
      cookieInfo,
      aid,
      region,
      baseUrl,
      imagexUrl,
      commerceUrl,
      headers,
      signature
    };
  }

  /**
   * 获取基础URL
   */
  private getBaseUrl(region: "cn" | "us"): string {
    try {
      return getJimengURL(region);
    } catch (error) {
      // 回退到硬编码的URL
      return region === "us" ? BASE_URL_DREAMINA_US : BASE_URL_CN;
    }
  }

  /**
   * 获取ImageX URL
   */
  private getImageXUrl(region: "cn" | "us"): string {
    try {
      return getImageXURL(region);
    } catch (error) {
      // 回退到硬编码的URL
      return region === "us" ? BASE_URL_IMAGEX_US : "https://imagex.bytedanceapi.com";
    }
  }

  /**
   * 获取商业服务URL
   */
  private getCommerceUrl(region: "cn" | "us"): string {
    try {
      return getCommerceURL(region);
    } catch (error) {
      // 回退到硬编码的URL
      return region === "us" ? BASE_URL_US_COMMERCE : BASE_URL_CN;
    }
  }

  /**
   * 获取应用ID
   */
  private getAid(region: "cn" | "us"): string {
    return region === "us" ? DEFAULT_ASSISTANT_ID_US : DEFAULT_ASSISTANT_ID_CN;
  }

  /**
   * 生成签名
   */
  private generateSignature() {
    const deviceTime = util.unixTimestamp();
    const sign = util.md5(
      `9e2c|${PLATFORM_CODE}|${VERSION_CODE}|${deviceTime}||11ac`
    );

    return {
      sign,
      deviceTime
    };
  }

  /**
   * 构建请求头
   */
  private buildHeaders(
    cookieInfo: ParsedCookieInfo,
    aid: string,
    baseUrl: string,
    signature: { sign: string; deviceTime: number }
  ): Record<string, string> {
    const origin = new URL(baseUrl).origin;

    return {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-language": cookieInfo.region === "us" ? "en-US,en;q=0.9" : "zh-CN,zh;q=0.9",
      "Cache-control": "no-cache",
      "Last-event-id": "undefined",
      Appvr: VERSION_CODE,
      Pragma: "no-cache",
      Priority: "u=1, i",
      Pf: PLATFORM_CODE,
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Origin: origin,
      Referer: origin,
      Appid: aid,
      Cookie: cookieInfo.cookieString,
      "Device-Time": signature.deviceTime.toString(),
      Sign: signature.sign,
      "Sign-Ver": "1"
    };
  }

  /**
   * 刷新认证信息（清除缓存）
   */
  refreshAuthInfo(authString: string): void {
    this.authCache.delete(authString);
    this.removeCacheTimestamp(authString);
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.authCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * 获取缓存时间戳
   */
  private cacheTimestamps: Map<string, number> = new Map();

  private getCacheTimestamp(key: string): number {
    return this.cacheTimestamps.get(key) || 0;
  }

  private setCacheTimestamp(key: string): void {
    this.cacheTimestamps.set(key, Date.now());
  }

  private removeCacheTimestamp(key: string): void {
    this.cacheTimestamps.delete(key);
  }

  /**
   * 获取认证信息统计
   */
  getAuthStats(): {
    cacheSize: number;
    cacheEntries: Array<{
      key: string;
      timestamp: number;
      age: number;
      region: string;
    }>;
  } {
    const entries = Array.from(this.authCache.entries()).map(([key, authInfo]) => ({
      key: key.substring(0, 10) + "...", // 只显示前10个字符
      timestamp: this.getCacheTimestamp(key),
      age: Date.now() - this.getCacheTimestamp(key),
      region: authInfo.region
    }));

    return {
      cacheSize: this.authCache.size,
      cacheEntries: entries
    };
  }

  /**
   * 验证认证信息是否有效
   */
  validateAuthInfo(authInfo: AuthInfo): boolean {
    return !!(authInfo.cookieInfo.token && authInfo.aid && authInfo.baseUrl);
  }

  /**
   * 更新认证信息中的URL（故障转移用）
   */
  updateAuthInfoURLs(
    authInfo: AuthInfo,
    updates: {
      baseUrl?: string;
      imagexUrl?: string;
      commerceUrl?: string;
    }
  ): AuthInfo {
    const updatedAuthInfo = { ...authInfo };

    if (updates.baseUrl) {
      updatedAuthInfo.baseUrl = updates.baseUrl;
      const origin = new URL(updates.baseUrl).origin;
      updatedAuthInfo.headers.Origin = origin;
      updatedAuthInfo.headers.Referer = origin;
    }

    if (updates.imagexUrl) {
      updatedAuthInfo.imagexUrl = updates.imagexUrl;
    }

    if (updates.commerceUrl) {
      updatedAuthInfo.commerceUrl = updates.commerceUrl;
    }

    return updatedAuthInfo;
  }
}

/**
 * 便捷函数：获取认证信息
 */
export async function getAuthInfo(authString: string, options?: {
  region?: "cn" | "us";
  baseUrl?: string;
  imagexUrl?: string;
  commerceUrl?: string;
}): Promise<AuthInfo> {
  return AuthManager.getInstance().getAuthInfo(authString, options);
}

/**
 * 便捷函数：判断是否为国际版
 */
export function isInternationalVersion(authString: string): boolean {
  try {
    return CookieManager.isInternationalVersion(authString);
  } catch (error) {
    return false;
  }
}

/**
 * 便捷函数：获取token
 */
export function getTokenFromAuth(authString: string): string {
  try {
    return CookieManager.getTokenFromCookie(authString);
  } catch (error) {
    return "";
  }
}

/**
 * 便捷函数：获取地区
 */
export function getRegionFromAuth(authString: string): "cn" | "us" {
  try {
    return CookieManager.getRegion(authString);
  } catch (error) {
    return "cn";
  }
}

export default AuthManager.getInstance();