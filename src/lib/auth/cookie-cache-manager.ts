import { EnhancedCookieManager, EnhancedParsedCookieInfo } from "./enhanced-cookie-manager.ts";
import { AuthInfo } from "./auth-manager.ts";
import logger from "../logger.ts";
import util from "../util.ts";

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  /** 缓存的数据 */
  data: T;
  /** 创建时间戳 */
  timestamp: number;
  /** 过期时间戳 */
  expireTime: number;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessTime: number;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  /** 缓存大小 */
  size: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 过期项数量 */
  expiredItems: number;
  /** 总访问次数 */
  totalAccess: number;
}

/**
 * Cookie缓存配置
 */
interface CacheConfig {
  /** 解析结果缓存TTL（毫秒），默认30分钟 */
  parseResultTTL: number;
  /** 认证信息缓存TTL（毫秒），默认5分钟 */
  authInfoTTL: number;
  /** Cookie字符串缓存TTL（毫秒），默认1小时 */
  cookieStringTTL: number;
  /** 最大缓存项数量 */
  maxCacheSize: number;
  /** 自动清理间隔（毫秒），默认10分钟 */
  cleanupInterval: number;
  /** 是否启用缓存统计 */
  enableStats: boolean;
}

/**
 * Cookie缓存管理器
 *
 * 提供智能的cookie和认证信息缓存机制，避免重复解析相同的sessionid/cookie
 */
export class CookieCacheManager {
  private static instance: CookieCacheManager;

  /** 解析结果缓存 */
  private parseCache: Map<string, CacheItem<EnhancedParsedCookieInfo>> = new Map();

  /** 认证信息缓存 */
  private authCache: Map<string, CacheItem<AuthInfo>> = new Map();

  /** Cookie字符串缓存 */
  private cookieStringCache: Map<string, CacheItem<string>> = new Map();

  /** 缓存统计 */
  private stats = {
    parseHits: 0,
    parseMisses: 0,
    authHits: 0,
    authMisses: 0,
    cookieStringHits: 0,
    cookieStringMisses: 0,
    totalParseAccess: 0,
    totalAuthAccess: 0,
    totalCookieStringAccess: 0
  };

  /** 清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** 配置 */
  private config: CacheConfig = {
    parseResultTTL: 30 * 60 * 1000, // 30分钟
    authInfoTTL: 5 * 60 * 1000,    // 5分钟
    cookieStringTTL: 60 * 60 * 1000, // 1小时
    maxCacheSize: 1000,             // 最大1000项
    cleanupInterval: 10 * 60 * 1000, // 10分钟清理一次
    enableStats: true
  };

  private constructor() {
    this.startCleanupTimer();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): CookieCacheManager {
    if (!CookieCacheManager.instance) {
      CookieCacheManager.instance = new CookieCacheManager();
    }
    return CookieCacheManager.instance;
  }

  /**
   * 配置缓存参数
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    // 重启清理定时器（如果间隔发生变化）
    if (config.cleanupInterval) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }

    logger.info(`Cookie缓存配置已更新: ${JSON.stringify(this.config)}`);
  }

  /**
   * 生成标准化的缓存键
   * 基于sessionid/token生成，确保相同的session生成相同的缓存键
   */
  private generateCacheKey(authString: string): string {
    try {
      // 尝试从authString中提取sessionid/token
      if (authString.includes("=") || authString.includes(".....")) {
        // 如果是cookie格式，尝试解析出sessionid
        const parsed = EnhancedCookieManager.parseCookie(authString);
        return `session_${parsed.token}_${parsed.region}`;
      } else {
        // 如果是简单token格式
        const isUS = authString.toLowerCase().startsWith('us-');
        const token = isUS ? authString.substring(3) : authString;
        const region = isUS ? 'us' : 'cn';
        return `token_${token}_${region}`;
      }
    } catch (error) {
      // 如果解析失败，使用MD5哈希作为键
      return `hash_${util.md5(authString)}`;
    }
  }

  /**
   * 获取或解析Cookie信息
   */
  getParsedCookie(authString: string): EnhancedParsedCookieInfo {
    this.stats.totalParseAccess++;

    const cacheKey = this.generateCacheKey(authString);

    // 检查缓存
    const cached = this.parseCache.get(cacheKey);
    if (cached && Date.now() < cached.expireTime) {
      // 更新访问统计
      cached.accessCount++;
      cached.lastAccessTime = Date.now();
      this.stats.parseHits++;

      logger.debug(`Cookie解析缓存命中: ${cacheKey}`);
      return cached.data;
    }

    // 缓存未命中，解析cookie
    this.stats.parseMisses++;
    logger.debug(`Cookie解析缓存未命中，开始解析: ${cacheKey}`);

    const parsedCookie = EnhancedCookieManager.parseCookie(authString);

    // 缓存解析结果
    this.cacheParsedCookie(cacheKey, parsedCookie);

    return parsedCookie;
  }

  /**
   * 缓存解析后的Cookie信息
   */
  private cacheParsedCookie(cacheKey: string, parsedCookie: EnhancedParsedCookieInfo): void {
    // 检查缓存大小限制
    if (this.parseCache.size >= this.config.maxCacheSize) {
      this.evictOldestItems('parse');
    }

    const now = Date.now();
    const cacheItem: CacheItem<EnhancedParsedCookieInfo> = {
      data: parsedCookie,
      timestamp: now,
      expireTime: now + this.config.parseResultTTL,
      accessCount: 1,
      lastAccessTime: now
    };

    this.parseCache.set(cacheKey, cacheItem);
    logger.debug(`Cookie解析结果已缓存: ${cacheKey}, TTL: ${this.config.parseResultTTL}ms`);
  }

  /**
   * 获取或创建认证信息
   */
  async getAuthInfo(
    authString: string,
    authFactory: () => Promise<AuthInfo>
  ): Promise<AuthInfo> {
    this.stats.totalAuthAccess++;

    const cacheKey = this.generateCacheKey(authString);

    // 检查缓存
    const cached = this.authCache.get(cacheKey);
    if (cached && Date.now() < cached.expireTime) {
      // 更新访问统计
      cached.accessCount++;
      cached.lastAccessTime = Date.now();
      this.stats.authHits++;

      logger.debug(`认证信息缓存命中: ${cacheKey}`);
      return cached.data;
    }

    // 缓存未命中，创建认证信息
    this.stats.authMisses++;
    logger.debug(`认证信息缓存未命中，开始创建: ${cacheKey}`);

    const authInfo = await authFactory();

    // 缓存认证信息
    this.cacheAuthInfo(cacheKey, authInfo);

    return authInfo;
  }

  /**
   * 缓存认证信息
   */
  private cacheAuthInfo(cacheKey: string, authInfo: AuthInfo): void {
    // 检查缓存大小限制
    if (this.authCache.size >= this.config.maxCacheSize) {
      this.evictOldestItems('auth');
    }

    const now = Date.now();
    const cacheItem: CacheItem<AuthInfo> = {
      data: authInfo,
      timestamp: now,
      expireTime: now + this.config.authInfoTTL,
      accessCount: 1,
      lastAccessTime: now
    };

    this.authCache.set(cacheKey, cacheItem);
    logger.debug(`认证信息已缓存: ${cacheKey}, TTL: ${this.config.authInfoTTL}ms`);
  }

  /**
   * 清除特定authString的缓存
   */
  invalidateCache(authString: string): void {
    const cacheKey = this.generateCacheKey(authString);

    const parseRemoved = this.parseCache.delete(cacheKey);
    const authRemoved = this.authCache.delete(cacheKey);

    if (parseRemoved || authRemoved) {
      logger.info(`缓存已清除: ${cacheKey}`);
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    const parseCount = this.parseCache.size;
    const authCount = this.authCache.size;
    const cookieStringCount = this.cookieStringCache.size;

    this.parseCache.clear();
    this.authCache.clear();
    this.cookieStringCache.clear();

    // 重置统计
    this.stats = {
      parseHits: 0,
      parseMisses: 0,
      authHits: 0,
      authMisses: 0,
      cookieStringHits: 0,
      cookieStringMisses: 0,
      totalParseAccess: 0,
      totalAuthAccess: 0,
      totalCookieStringAccess: 0
    };

    logger.info(`所有缓存已清除: 解析缓存 ${parseCount} 项, 认证缓存 ${authCount} 项, Cookie字符串缓存 ${cookieStringCount} 项`);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    parse: CacheStats;
    auth: CacheStats;
    cookieString: CacheStats;
    memoryUsage: {
      parseCacheSize: number;
      authCacheSize: number;
      cookieStringCacheSize: number;
    };
  } {
    const now = Date.now();

    // 计算解析缓存统计
    const parseExpiredItems = Array.from(this.parseCache.values())
      .filter(item => now >= item.expireTime).length;

    const parseStats: CacheStats = {
      size: this.parseCache.size,
      hits: this.stats.parseHits,
      misses: this.stats.parseMisses,
      hitRate: this.stats.totalParseAccess > 0 ?
        (this.stats.parseHits / this.stats.totalParseAccess) * 100 : 0,
      expiredItems: parseExpiredItems,
      totalAccess: this.stats.totalParseAccess
    };

    // 计算认证缓存统计
    const authExpiredItems = Array.from(this.authCache.values())
      .filter(item => now >= item.expireTime).length;

    const authStats: CacheStats = {
      size: this.authCache.size,
      hits: this.stats.authHits,
      misses: this.stats.authMisses,
      hitRate: this.stats.totalAuthAccess > 0 ?
        (this.stats.authHits / this.stats.totalAuthAccess) * 100 : 0,
      expiredItems: authExpiredItems,
      totalAccess: this.stats.totalAuthAccess
    };

    // 计算Cookie字符串缓存统计
    const cookieStringExpiredItems = Array.from(this.cookieStringCache.values())
      .filter(item => now >= item.expireTime).length;

    const cookieStringStats: CacheStats = {
      size: this.cookieStringCache.size,
      hits: this.stats.cookieStringHits,
      misses: this.stats.cookieStringMisses,
      hitRate: this.stats.totalCookieStringAccess > 0 ?
        (this.stats.cookieStringHits / this.stats.totalCookieStringAccess) * 100 : 0,
      expiredItems: cookieStringExpiredItems,
      totalAccess: this.stats.totalCookieStringAccess
    };

    return {
      parse: parseStats,
      auth: authStats,
      cookieString: cookieStringStats,
      memoryUsage: {
        parseCacheSize: this.parseCache.size,
        authCacheSize: this.authCache.size,
        cookieStringCacheSize: this.cookieStringCache.size
      }
    };
  }

  /**
   * 获取缓存详细信息
   */
  getCacheDetails(): {
    parseCache: Array<{
      key: string;
      timestamp: number;
      expireTime: number;
      accessCount: number;
      lastAccessTime: number;
      age: number;
      ttl: number;
      region: string;
    }>;
    authCache: Array<{
      key: string;
      timestamp: number;
      expireTime: number;
      accessCount: number;
      lastAccessTime: number;
      age: number;
      ttl: number;
      region: string;
    }>;
  } {
    const now = Date.now();

    const parseCacheDetails = Array.from(this.parseCache.entries()).map(([key, item]) => ({
      key: key.substring(0, 50) + (key.length > 50 ? "..." : ""),
      timestamp: item.timestamp,
      expireTime: item.expireTime,
      accessCount: item.accessCount,
      lastAccessTime: item.lastAccessTime,
      age: now - item.timestamp,
      ttl: Math.max(0, item.expireTime - now),
      region: this.extractRegionFromKey(key)
    }));

    const authCacheDetails = Array.from(this.authCache.entries()).map(([key, item]) => ({
      key: key.substring(0, 50) + (key.length > 50 ? "..." : ""),
      timestamp: item.timestamp,
      expireTime: item.expireTime,
      accessCount: item.accessCount,
      lastAccessTime: item.lastAccessTime,
      age: now - item.timestamp,
      ttl: Math.max(0, item.expireTime - now),
      region: this.extractRegionFromKey(key)
    }));

    return {
      parseCache: parseCacheDetails.sort((a, b) => b.lastAccessTime - a.lastAccessTime),
      authCache: authCacheDetails.sort((a, b) => b.lastAccessTime - a.lastAccessTime)
    };
  }

  /**
   * 从缓存键中提取地区信息
   */
  private extractRegionFromKey(key: string): string {
    if (key.includes('_us_')) return 'us';
    if (key.includes('_cn_')) return 'cn';
    return 'unknown';
  }

  /**
   * 清理过期缓存项
   */
  cleanupExpiredItems(): void {
    const now = Date.now();
    let parseRemoved = 0;
    let authRemoved = 0;
    let cookieStringRemoved = 0;

    // 清理解析缓存
    for (const [key, item] of this.parseCache.entries()) {
      if (now >= item.expireTime) {
        this.parseCache.delete(key);
        parseRemoved++;
      }
    }

    // 清理认证缓存
    for (const [key, item] of this.authCache.entries()) {
      if (now >= item.expireTime) {
        this.authCache.delete(key);
        authRemoved++;
      }
    }

    // 清理Cookie字符串缓存
    for (const [key, item] of this.cookieStringCache.entries()) {
      if (now >= item.expireTime) {
        this.cookieStringCache.delete(key);
        cookieStringRemoved++;
      }
    }

    if (parseRemoved > 0 || authRemoved > 0 || cookieStringRemoved > 0) {
      logger.info(`清理过期缓存项: 解析缓存 ${parseRemoved} 项, 认证缓存 ${authRemoved} 项, Cookie字符串缓存 ${cookieStringRemoved} 项`);
    }
  }

  /**
   * 淘汰最旧的缓存项
   */
  private evictOldestItems(cacheType: 'parse' | 'auth'): void {
    const cache = cacheType === 'parse' ? this.parseCache : this.authCache;

    if (cache.size === 0) return;

    // 找到最久未访问的项
    let oldestKey = '';
    let oldestAccessTime = Date.now();

    for (const [key, item] of cache.entries()) {
      if (item.lastAccessTime < oldestAccessTime) {
        oldestAccessTime = item.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      logger.debug(`淘汰最旧的缓存项: ${cacheType} - ${oldestKey}`);
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clearAllCache();
    logger.info("Cookie缓存管理器已销毁");
  }

  /**
   * 预热缓存 - 批量解析和缓存cookie
   */
  async warmupCache(authStrings: string[]): Promise<void> {
    logger.info(`开始预热缓存，共 ${authStrings.length} 项`);

    for (const authString of authStrings) {
      try {
        // 预解析cookie
        this.getParsedCookie(authString);
        logger.debug(`缓存预热完成: ${this.generateCacheKey(authString)}`);
      } catch (error) {
        logger.warn(`缓存预热失败: ${error.message}`);
      }
    }

    logger.info(`缓存预热完成`);
  }

  /**
   * 获取或生成稳定的Cookie字符串
   * 确保相同的token总是生成相同的cookie字符串，避免轮询时重复生成
   */
  getStableCookie(authString: string): string {
    this.stats.totalCookieStringAccess++;

    const cacheKey = this.generateCacheKey(authString);

    // 检查cookie字符串缓存
    const cached = this.cookieStringCache.get(cacheKey);
    if (cached && Date.now() < cached.expireTime) {
      cached.accessCount++;
      cached.lastAccessTime = Date.now();
      this.stats.cookieStringHits++;
      logger.debug(`Cookie字符串缓存命中: ${cacheKey}`);
      return cached.data;
    }

    // 缓存未命中，生成新的cookie字符串
    this.stats.cookieStringMisses++;
    logger.debug(`Cookie字符串缓存未命中，开始生成: ${cacheKey}`);

    const parsedCookie = this.getParsedCookie(authString);

    // 如果解析后的cookie字符串不完整，补充缺失的字段
    let completeCookie = parsedCookie.cookieString;
    if (!this.isCookieComplete(completeCookie)) {
      completeCookie = this.completeCookieString(parsedCookie);
    }

    // 缓存完整的cookie字符串
    this.cacheCookieString(cacheKey, completeCookie);

    return completeCookie;
  }

  /**
   * 检查cookie字符串是否完整
   */
  private isCookieComplete(cookieString: string): boolean {
    const requiredFields = [
      '_tea_web_id',
      'uid_tt',
      'sid_tt',
      'sessionid',
      'capcut_locale'
    ];

    const cookieItems = this.parseCookieItems(cookieString);
    return requiredFields.every(field => cookieItems[field]);
  }

  /**
   * 补充cookie字符串的缺失字段
   */
  private completeCookieString(parsedCookie: EnhancedParsedCookieInfo): string {
    const existingItems = this.parseCookieItems(parsedCookie.cookieString);
    const token = parsedCookie.token;
    const region = parsedCookie.region;

    // 基于token生成稳定的补充字段
    const tokenHash = util.md5(token);
    const seed = parseInt(tokenHash.substring(0, 8), 16);

    const WEB_ID = existingItems._tea_web_id || ((seed % 9000000000000000000) + 1000000000000000000);
    const USER_ID = existingItems.uid_tt || this.generateStableUUID(tokenHash);
    const baseTimestamp = 1700000000;
    const timestamp = baseTimestamp + (seed % 86400 * 30);

    const补充字段 = {
      '_tea_web_id': WEB_ID,
      'is_staff_user': 'false',
      'store-region': region === 'us' ? 'us' : 'cn-gd',
      'store-region-src': 'uid',
      'sid_guard': `${token}%7C${timestamp}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
      'uid_tt': USER_ID,
      'uid_tt_ss': USER_ID,
      'sid_tt': token,
      'sessionid': token,
      'sessionid_ss': token,
      'capcut_locale': region === 'us' ? 'en' : 'zh-CN'
    };

    // 合并现有字段和补充字段
    const completeItems = { ...补充字段, ...existingItems };

    // 生成完整的cookie字符串
    return Object.entries(completeItems)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  /**
   * 基于token生成稳定的UUID
   */
  private generateStableUUID(tokenHash: string): string {
    const hex = tokenHash.substring(0, 32);
    const uuid = [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');
    return uuid;
  }

  /**
   * 简单的cookie项解析
   */
  private parseCookieItems(cookieString: string): Record<string, string> {
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
   * 缓存cookie字符串
   */
  private cacheCookieString(cacheKey: string, cookieString: string): void {
    if (this.cookieStringCache.size >= this.config.maxCacheSize) {
      this.evictOldestCookieString();
    }

    const now = Date.now();
    const cacheItem: CacheItem<string> = {
      data: cookieString,
      timestamp: now,
      expireTime: now + this.config.cookieStringTTL,
      accessCount: 1,
      lastAccessTime: now
    };

    this.cookieStringCache.set(cacheKey, cacheItem);
    logger.debug(`Cookie字符串已缓存: ${cacheKey}, TTL: ${this.config.cookieStringTTL}ms`);
  }

  /**
   * 淘汰最旧的cookie字符串缓存项
   */
  private evictOldestCookieString(): void {
    if (this.cookieStringCache.size === 0) return;

    let oldestKey = '';
    let oldestAccessTime = Date.now();

    for (const [key, item] of this.cookieStringCache.entries()) {
      if (item.lastAccessTime < oldestAccessTime) {
        oldestAccessTime = item.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cookieStringCache.delete(oldestKey);
      logger.debug(`淘汰最旧的cookie字符串缓存项: ${oldestKey}`);
    }
  }

  /**
   * 检查缓存中是否存在特定authString的缓存
   */
  hasCache(authString: string): {
    parseCache: boolean;
    authCache: boolean;
    cookieStringCache: boolean;
    cacheKey: string;
  } {
    const cacheKey = this.generateCacheKey(authString);
    const now = Date.now();

    const parseCached = this.parseCache.has(cacheKey) &&
      this.parseCache.get(cacheKey)!.expireTime > now;

    const authCached = this.authCache.has(cacheKey) &&
      this.authCache.get(cacheKey)!.expireTime > now;

    const cookieStringCached = this.cookieStringCache.has(cacheKey) &&
      this.cookieStringCache.get(cacheKey)!.expireTime > now;

    return {
      parseCache: parseCached,
      authCache: authCached,
      cookieStringCache: cookieStringCached,
      cacheKey
    };
  }
}

/**
 * 便捷函数：获取Cookie缓存管理器实例
 */
export function getCookieCacheManager(): CookieCacheManager {
  return CookieCacheManager.getInstance();
}

/**
 * 便捷函数：获取或解析Cookie
 */
export function getCachedParsedCookie(authString: string): EnhancedParsedCookieInfo {
  return getCookieCacheManager().getParsedCookie(authString);
}

/**
 * 便捷函数：获取或创建认证信息
 */
export async function getCachedAuthInfo(
  authString: string,
  authFactory: () => Promise<AuthInfo>
): Promise<AuthInfo> {
  return getCookieCacheManager().getAuthInfo(authString, authFactory);
}

/**
 * 便捷函数：清除缓存
 */
export function invalidateCookieCache(authString: string): void {
  getCookieCacheManager().invalidateCache(authString);
}

/**
 * 便捷函数：获取缓存统计
 */
export function getCookieCacheStats() {
  return getCookieCacheManager().getStats();
}

/**
 * 便捷函数：获取稳定的Cookie字符串
 */
export function getStableCookie(authString: string): string {
  return getCookieCacheManager().getStableCookie(authString);
}

export default CookieCacheManager.getInstance();