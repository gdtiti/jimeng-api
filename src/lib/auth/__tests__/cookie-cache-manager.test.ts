import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { assertEquals, assertExists, assertTrue } from "@std/assert";
import { CookieCacheManager } from "../cookie-cache-manager.ts";
import { EnhancedCookieManager } from "../enhanced-cookie-manager.ts";
import { AuthManager, AuthInfo } from "../auth-manager.ts";

describe("CookieCacheManager", () => {
  let cacheManager: CookieCacheManager;
  let authManager: AuthManager;

  beforeEach(() => {
    cacheManager = CookieCacheManager.getInstance();
    authManager = AuthManager.getInstance();
    cacheManager.clearAllCache();
  });

  afterEach(() => {
    cacheManager.clearAllCache();
  });

  describe("Cookie解析缓存", () => {
    it("应该缓存相同的sessionid解析结果", () => {
      // 模拟相同的cookie字符串
      const cookieString1 = "sessionid=abc123.....capcut_locale=zh-CN.....sid_tt=abc123";
      const cookieString2 = "sessionid=abc123.....capcut_locale=zh-CN.....sid_tt=abc123";

      // 第一次解析
      const result1 = cacheManager.getParsedCookie(cookieString1);
      const stats1 = cacheManager.getStats();

      assertEquals(stats1.parse.size, 1);
      assertEquals(stats1.parse.hits, 0);
      assertEquals(stats1.parse.misses, 1);

      // 第二次解析相同的内容（应该命中缓存）
      const result2 = cacheManager.getParsedCookie(cookieString2);
      const stats2 = cacheManager.getStats();

      assertEquals(stats2.parse.size, 1);
      assertEquals(stats2.parse.hits, 1);
      assertEquals(stats2.parse.misses, 1);
      assertEquals(result1.token, result2.token);
      assertEquals(result1.region, result2.region);
    });

    it("应该为不同的sessionid创建不同的缓存项", () => {
      const cookieString1 = "sessionid=abc123.....capcut_locale=zh-CN";
      const cookieString2 = "sessionid=def456.....capcut_locale=zh-CN";

      const result1 = cacheManager.getParsedCookie(cookieString1);
      const result2 = cacheManager.getParsedCookie(cookieString2);

      const stats = cacheManager.getStats();

      assertEquals(stats.parse.size, 2);
      assertEquals(result1.token, "abc123");
      assertEquals(result2.token, "def456");
      assertNotEquals(result1.token, result2.token);
    });

    it("应该正确处理过期缓存", async () => {
      // 配置短TTL用于测试
      cacheManager.configure({ parseResultTTL: 100 }); // 100ms

      const cookieString = "sessionid=abc123.....capcut_locale=zh-CN";

      // 第一次解析
      const result1 = cacheManager.getParsedCookie(cookieString);
      const stats1 = cacheManager.getStats();

      assertEquals(stats1.parse.size, 1);
      assertEquals(stats1.parse.hits, 0);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 再次解析（缓存已过期）
      const result2 = cacheManager.getParsedCookie(cookieString);
      const stats2 = cacheManager.getStats();

      assertEquals(stats2.parse.size, 1); // 重新缓存
      assertEquals(stats2.parse.hits, 0); // 没有命中
      assertEquals(stats2.parse.misses, 2); // 两次未命中
    });
  });

  describe("认证信息缓存", () => {
    it("应该缓存认证信息创建结果", async () => {
      const cookieString = "sessionid=abc123.....capcut_locale=zh-CN";
      let callCount = 0;

      const authFactory = async (): Promise<AuthInfo> => {
        callCount++;
        // 模拟创建认证信息的过程
        return {
          cookieInfo: EnhancedCookieManager.parseCookie(cookieString),
          aid: "test_aid",
          region: "cn",
          baseUrl: "https://test.com",
          imagexUrl: "https://imagex.test.com",
          commerceUrl: "https://commerce.test.com",
          headers: {},
          signature: { sign: "test_sign", deviceTime: Date.now() }
        };
      };

      // 第一次获取
      const auth1 = await cacheManager.getAuthInfo(cookieString, authFactory);
      const stats1 = cacheManager.getStats();

      assertEquals(callCount, 1);
      assertEquals(stats1.auth.size, 1);
      assertEquals(stats1.auth.hits, 0);
      assertEquals(stats1.auth.misses, 1);

      // 第二次获取（应该命中缓存）
      const auth2 = await cacheManager.getAuthInfo(cookieString, authFactory);
      const stats2 = cacheManager.getStats();

      assertEquals(callCount, 1); // 没有再次调用
      assertEquals(stats2.auth.size, 1);
      assertEquals(stats2.auth.hits, 1);
      assertEquals(stats2.auth.misses, 1);
      assertEquals(auth1.aid, auth2.aid);
    });
  });

  describe("缓存管理", () => {
    it("应该能够清除特定缓存项", () => {
      const cookieString = "sessionid=abc123.....capcut_locale=zh-CN";

      // 创建缓存
      cacheManager.getParsedCookie(cookieString);
      assertEquals(cacheManager.getStats().parse.size, 1);

      // 清除缓存
      cacheManager.invalidateCache(cookieString);
      assertEquals(cacheManager.getStats().parse.size, 0);
    });

    it("应该能够清除所有缓存", () => {
      const cookieString1 = "sessionid=abc123.....capcut_locale=zh-CN";
      const cookieString2 = "sessionid=def456.....capcut_locale=zh-CN";

      // 创建缓存
      cacheManager.getParsedCookie(cookieString1);
      cacheManager.getParsedCookie(cookieString2);

      assertEquals(cacheManager.getStats().parse.size, 2);

      // 清除所有缓存
      cacheManager.clearAllCache();
      assertEquals(cacheManager.getStats().parse.size, 0);
    });

    it("应该提供准确的缓存统计", () => {
      const cookieString = "sessionid=abc123.....capcut_locale=zh-CN";

      // 初始状态
      let stats = cacheManager.getStats();
      assertEquals(stats.parse.size, 0);
      assertEquals(stats.parse.hits, 0);
      assertEquals(stats.parse.misses, 0);

      // 第一次访问
      cacheManager.getParsedCookie(cookieString);
      stats = cacheManager.getStats();
      assertEquals(stats.parse.hits, 0);
      assertEquals(stats.parse.misses, 1);

      // 第二次访问
      cacheManager.getParsedCookie(cookieString);
      stats = cacheManager.getStats();
      assertEquals(stats.parse.hits, 1);
      assertEquals(stats.parse.misses, 1);
      assertEquals(stats.parse.hitRate, 50);
    });
  });

  describe("集成测试", () => {
    it("应该与AuthManager正常协作", async () => {
      const cookieString = "sessionid=abc123.....capcut_locale=zh-CN";

      // 配置短TTL以便测试
      cacheManager.configure({ authInfoTTL: 1000 });

      // 第一次获取认证信息
      const auth1 = await authManager.getAuthInfo(cookieString);
      assertExists(auth1);
      assertEquals(auth1.region, "cn");

      const stats1 = authManager.getAuthStats();
      assertTrue(stats1.summary.includes("解析缓存: 1 项"));
      assertTrue(stats1.summary.includes("认证缓存: 1 项"));

      // 第二次获取（应该命中缓存）
      const auth2 = await authManager.getAuthInfo(cookieString);
      assertEquals(auth1.aid, auth2.aid);
      assertEquals(auth1.region, auth2.region);

      // 刷新缓存
      authManager.refreshAuthInfo(cookieString);

      // 再次获取（缓存已刷新）
      const auth3 = await authManager.getAuthInfo(cookieString);
      assertEquals(auth3.region, "cn");
    });
  });

  describe("缓存键生成", () => {
    it("应该为相同sessionid生成相同缓存键", () => {
      const cookieString1 = "sessionid=abc123.....capcut_locale=zh-CN";
      const cookieString2 = "sessionid=abc123.....capcut_locale=zh-CN.....extra_field=value";

      const status1 = cacheManager.hasCache(cookieString1);
      assertEquals(status1.parseCache, false);
      assertEquals(status1.authCache, false);

      cacheManager.getParsedCookie(cookieString1);
      const status2 = cacheManager.hasCache(cookieString1);
      assertEquals(status2.parseCache, true);

      // 相同sessionid的第二个字符串应该命中相同的缓存
      const status3 = cacheManager.hasCache(cookieString2);
      assertEquals(status3.parseCache, true);
    });

    it("应该为不同sessionid生成不同缓存键", () => {
      const cookieString1 = "sessionid=abc123.....capcut_locale=zh-CN";
      const cookieString2 = "sessionid=def456.....capcut_locale=zh-CN";

      cacheManager.getParsedCookie(cookieString1);
      cacheManager.getParsedCookie(cookieString2);

      const status1 = cacheManager.hasCache(cookieString1);
      const status2 = cacheManager.hasCache(cookieString2);

      assertEquals(status1.parseCache, true);
      assertEquals(status2.parseCache, true);
      assertNotEquals(status1.cacheKey, status2.cacheKey);
    });
  });

  describe("预热功能", () => {
    it("应该能够预热缓存", async () => {
      const authStrings = [
        "sessionid=abc123.....capcut_locale=zh-CN",
        "sessionid=def456.....capcut_locale=en",
        "us-sessionid_ghi789.....capcut_locale=en"
      ];

      await cacheManager.warmupCache(authStrings);

      const stats = cacheManager.getStats();
      assertEquals(stats.parse.size, 3);

      // 验证所有项都已缓存
      for (const authString of authStrings) {
        const status = cacheManager.hasCache(authString);
        assertEquals(status.parseCache, true);
      }
    });
  });
});

// 辅助函数：断言不相等
function assertNotEquals<T>(actual: T, expected: T) {
  if (actual === expected) {
    throw new Error(`Expected ${actual} to not equal ${expected}`);
  }
}