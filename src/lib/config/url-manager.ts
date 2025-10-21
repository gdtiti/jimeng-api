import _ from "lodash";
import environment from "../environment.ts";

/**
 * URL配置接口
 */
export interface URLConfig {
  /** 服务名称 */
  name: string;
  /** URL列表，支持多个地址用分号分隔 */
  urls: string;
  /** 负载均衡策略 */
  strategy: "random" | "round-robin" | "failover";
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * URL管理器 - 支持多地址轮询和负载均衡
 */
export class URLManager {
  private static instance: URLManager;
  private urlConfigs: Map<string, URLConfig> = new Map();
  private currentIndexes: Map<string, number> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
    this.loadEnvironmentConfigs();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): URLManager {
    if (!URLManager.instance) {
      URLManager.instance = new URLManager();
    }
    return URLManager.instance;
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigs(): void {
    // 即梦中国配置
    this.urlConfigs.set("jimeng-cn", {
      name: "即梦中国",
      urls: "https://jimeng.jianying.com",
      strategy: "random"
    });

    // 即梦国际配置（支持多个镜像地址）
    this.urlConfigs.set("jimeng-us", {
      name: "即梦国际",
      urls: "https://api-proxy-1.deno.dev/dreamina/us;https://dreamina-api.us.capcut.com;https://api.dreamina.ai/us",
      strategy: "round-robin"
    });

    // ImageX中国配置
    this.urlConfigs.set("imagex-cn", {
      name: "ImageX中国",
      urls: "https://imagex.bytedanceapi.com",
      strategy: "failover"
    });

    // ImageX国际配置
    this.urlConfigs.set("imagex-us", {
      name: "ImageX国际",
      urls: "https://imagex16-normal-us-ttp.capcutapi.us",
      strategy: "failover"
    });

    // 商业服务配置
    this.urlConfigs.set("commerce-us", {
      name: "商业服务国际",
      urls: "https://commerce.us.capcut.com",
      strategy: "failover"
    });
  }

  /**
   * 从环境变量加载配置
   */
  private loadEnvironmentConfigs(): void {
    // 支持通过环境变量覆盖配置
    const envConfigs = [
      { key: "JIMENG_CN_URLS", name: "jimeng-cn" },
      { key: "JIMENG_US_URLS", name: "jimeng-us" },
      { key: "IMAGEX_CN_URLS", name: "imagex-cn" },
      { key: "IMAGEX_US_URLS", name: "imagex-us" },
      { key: "COMMERCE_US_URLS", name: "commerce-us" }
    ];

    envConfigs.forEach(({ key, name }) => {
      const urls = process.env[key];
      if (urls) {
        const config = this.urlConfigs.get(name);
        if (config) {
          config.urls = urls;
          this.urlConfigs.set(name, config);
        }
      }
    });
  }

  /**
   * 注册URL配置
   */
  registerConfig(name: string, config: URLConfig): void {
    this.urlConfigs.set(name, config);
    this.currentIndexes.set(name, 0);
  }

  /**
   * 获取URL配置
   */
  getConfig(name: string): URLConfig | undefined {
    return this.urlConfigs.get(name);
  }

  /**
   * 获取可用的URL
   * @param name 配置名称
   * @returns 可用的URL
   */
  getAvailableURL(name: string): string {
    const config = this.urlConfigs.get(name);
    if (!config) {
      throw new Error(`URL配置不存在: ${name}`);
    }

    const urls = config.urls.split(";").map(url => url.trim()).filter(url => url);
    if (urls.length === 0) {
      throw new Error(`配置 ${name} 中没有可用的URL`);
    }

    let url: string;

    switch (config.strategy) {
      case "random":
        url = urls[Math.floor(Math.random() * urls.length)];
        break;

      case "round-robin":
        const currentIndex = this.currentIndexes.get(name) || 0;
        url = urls[currentIndex % urls.length];
        this.currentIndexes.set(name, currentIndex + 1);
        break;

      case "failover":
        // 故障转移：优先使用第一个可用的URL
        url = urls[0];
        break;

      default:
        url = urls[0];
    }

    return url;
  }

  /**
   * 获取所有URL列表
   */
  getAllURLs(name: string): string[] {
    const config = this.urlConfigs.get(name);
    if (!config) {
      return [];
    }

    return config.urls.split(";").map(url => url.trim()).filter(url => url);
  }

  /**
   * 测试URL可用性
   */
  async testURLAvailability(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url + "/ping", {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (URL-Manager-Health-Check)"
        }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取最快的可用URL
   */
  async getFastestURL(name: string): Promise<string> {
    const urls = this.getAllURLs(name);
    if (urls.length === 0) {
      throw new Error(`配置 ${name} 中没有可用的URL`);
    }

    if (urls.length === 1) {
      return urls[0];
    }

    // 并发测试所有URL的响应时间
    const urlTests = await Promise.allSettled(
      urls.map(async (url) => {
        const startTime = Date.now();
        const isAvailable = await this.testURLAvailability(url, 3000);
        const responseTime = Date.now() - startTime;
        return { url, isAvailable, responseTime };
      })
    );

    // 过滤可用的URL并按响应时间排序
    const availableURLs = urlTests
      .filter((result): result is PromiseFulfilledResult<{url: string, isAvailable: boolean, responseTime: number}> =>
        result.status === "fulfilled" && result.value.isAvailable
      )
      .map(result => result.value)
      .sort((a, b) => a.responseTime - b.responseTime);

    if (availableURLs.length === 0) {
      // 如果没有可用的URL，返回第一个（让请求自己去发现错误）
      return urls[0];
    }

    return availableURLs[0].url;
  }

  /**
   * 更新配置（故障转移用）
   */
  updateConfig(name: string, updates: Partial<URLConfig>): void {
    const config = this.urlConfigs.get(name);
    if (config) {
      const updatedConfig = { ...config, ...updates };
      this.urlConfigs.set(name, updatedConfig);
    }
  }

  /**
   * 标记URL为不可用（故障转移）
   */
  markURLUnavailable(name: string, unavailableURL: string): void {
    const config = this.urlConfigs.get(name);
    if (config && config.strategy === "failover") {
      const urls = this.getAllURLs(name);
      const updatedURLs = urls.filter(url => url !== unavailableURL);

      if (updatedURLs.length > 0) {
        config.urls = updatedURLs.join(";");
        this.urlConfigs.set(name, config);
      }
    }
  }

  /**
   * 重置索引（轮询用）
   */
  resetIndex(name: string): void {
    this.currentIndexes.set(name, 0);
  }

  /**
   * 获取所有配置名称
   */
  getConfigNames(): string[] {
    return Array.from(this.urlConfigs.keys());
  }

  /**
   * 获取配置统计信息
   */
  getConfigStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.urlConfigs.forEach((config, name) => {
      stats[name] = {
        name: config.name,
        strategy: config.strategy,
        urlCount: this.getAllURLs(name).length,
        urls: this.getAllURLs(name),
        currentIndex: this.currentIndexes.get(name) || 0,
        timeout: config.timeout || 5000,
        retryCount: config.retryCount || 3
      };
    });

    return stats;
  }
}

/**
 * 便捷函数：获取指定服务的URL
 */
export function getServiceURL(serviceName: string, region: "cn" | "us"): string {
  const urlManager = URLManager.getInstance();
  const configName = `${serviceName}-${region}`;
  return urlManager.getAvailableURL(configName);
}

/**
 * 便捷函数：获取即梦服务的URL
 */
export function getJimengURL(region: "cn" | "us"): string {
  return getServiceURL("jimeng", region);
}

/**
 * 便捷函数：获取ImageX服务的URL
 */
export function getImageXURL(region: "cn" | "us"): string {
  return getServiceURL("imagex", region);
}

/**
 * 便捷函数：获取商业服务的URL
 */
export function getCommerceURL(region: "cn" | "us"): string {
  if (region === "cn") {
    return getJimengURL(region); // 中国版商业服务使用主域名
  }
  return getServiceURL("commerce", region);
}

export default URLManager.getInstance();