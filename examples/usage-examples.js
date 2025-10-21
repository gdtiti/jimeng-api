/**
 * 即梦API新认证机制使用示例
 *
 * 本文件展示了如何使用新的认证系统和URL配置
 */

// 导入必要的模块
const { request } = require('../src/api/controllers/core-enhanced');
const { CookieManager } = require('../src/lib/auth/cookie-manager');
const { URLManager } = require('../src/lib/config/url-manager');

// ============================================================================
// 1. Cookie字符串生成和管理
// ============================================================================

/**
 * 生成标准cookie字符串
 * @param {string} token 用户token
 * @param {string} region 地区: 'cn' | 'us'
 * @returns {string} cookie字符串
 */
function generateCookieString(token, region = 'cn') {
  const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
  const USER_ID = require('crypto').randomUUID();
  const timestamp = Date.now();

  const cookieFields = {
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

  return Object.entries(cookieFields)
    .map(([key, value]) => `${key}=${value}`)
    .join('.....');
}

// 示例cookie字符串
const internationalCookie = generateCookieString('user-token-123', 'us');
const chinaCookie = generateCookieString('user-token-456', 'cn');

console.log('国际版Cookie示例:', internationalCookie);
console.log('中国版Cookie示例:', chinaCookie);

// ============================================================================
// 2. 基础API调用示例
// ============================================================================

/**
 * 生成图片的示例
 */
async function generateImageExample() {
  try {
    console.log('\n=== 图片生成示例 ===');

    const response = await request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      internationalCookie, // 使用国际版cookie
      {
        data: {
          extend: {
            root_model: "high_aes_general_v40",
            template_id: ""
          },
          submit_id: require('crypto').randomUUID(),
          metrics_extra: JSON.stringify({
            promptSource: "custom",
            generateCount: 1,
            enterFrom: "click",
            generateId: require('crypto').randomUUID(),
            isRegenerate: false
          }),
          draft_content: JSON.stringify({
            type: "draft",
            id: require('crypto').randomUUID(),
            min_version: "3.0.2",
            min_features: [],
            is_from_tsn: true,
            version: "3.3.2",
            main_component_id: require('crypto').randomUUID(),
            component_list: [{
              type: "image_base_component",
              id: require('crypto').randomUUID(),
              min_version: "3.0.2",
              aigc_mode: "workbench",
              metadata: {
                type: "",
                id: require('crypto').randomUUID(),
                created_platform: 3,
                created_platform_version: "",
                created_time_in_ms: Date.now().toString(),
                created_did: ""
              },
              generate_type: "generate",
              abilities: {
                type: "",
                id: require('crypto').randomUUID(),
                generate: {
                  type: "",
                  id: require('crypto').randomUUID(),
                  core_param: {
                    type: "",
                    id: require('crypto').randomUUID(),
                    model: "high_aes_general_v40",
                    prompt: "一只可爱的猫咪在花园里玩耍",
                    negative_prompt: "",
                    seed: Math.floor(Math.random() * 100000000) + 2500000000,
                    sample_strength: 0.5,
                    image_ratio: 1,
                    large_image_info: {
                      type: "",
                      id: require('crypto').randomUUID(),
                      height: 2048,
                      width: 2048,
                      resolution_type: "2k"
                    },
                    intelligent_ratio: false
                  }
                }
              }
            }]
          })
        },
        serviceType: 'jimeng' // 指定使用jimeng服务
      }
    );

    console.log('图片生成任务创建成功:', response.aigc_data.history_record_id);
    return response;

  } catch (error) {
    console.error('图片生成失败:', error.message);
    throw error;
  }
}

/**
 * 查询积分信息的示例
 */
async function getCreditInfoExample() {
  try {
    console.log('\n=== 积分查询示例 ===');

    const response = await request(
      'POST',
      '/commerce/v1/benefits/user_credit',
      chinaCookie, // 使用中国版cookie
      {
        data: {},
        headers: {
          Referer: "https://jimeng.jianying.com/ai-tool/image/generate",
        },
        noDefaultParams: true,
        serviceType: 'commerce' // 指定使用commerce服务
      }
    );

    const { credit } = response;
    console.log('积分信息:', {
      赠送积分: credit.gift_credit,
      购买积分: credit.purchase_credit,
      VIP积分: credit.vip_credit,
      总积分: credit.gift_credit + credit.purchase_credit + credit.vip_credit
    });

    return response;

  } catch (error) {
    console.error('积分查询失败:', error.message);
    throw error;
  }
}

/**
 * 接收每日积分的示例
 */
async function receiveCreditExample() {
  try {
    console.log('\n=== 接收积分示例 ===');

    const response = await request(
      'POST',
      '/commerce/v1/benefits/credit_receive',
      chinaCookie,
      {
        data: {
          time_zone: "Asia/Shanghai"
        },
        headers: {
          Referer: "https://jimeng.jianying.com/ai-tool/image/generate"
        },
        serviceType: 'commerce'
      }
    );

    console.log('积分接收成功:', {
      接收数量: response.receive_quota,
      当前总额: response.cur_total_credits
    });

    return response;

  } catch (error) {
    console.error('积分接收失败:', error.message);
    throw error;
  }
}

// ============================================================================
// 3. 高级功能示例
// ============================================================================

/**
 * 自定义URL配置示例
 */
async function customURLExample() {
  try {
    console.log('\n=== 自定义URL示例 ===');

    const response = await request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      internationalCookie,
      {
        data: { /* 请求数据 */ },
        serviceType: 'jimeng',
        customUrls: {
          baseUrl: 'https://custom-api.example.com' // 使用自定义URL
        }
      }
    );

    console.log('使用自定义URL请求成功');
    return response;

  } catch (error) {
    console.error('自定义URL请求失败:', error.message);
    throw error;
  }
}

/**
 * 强制指定地区示例
 */
async function forceRegionExample() {
  try {
    console.log('\n=== 强制地区示例 ===');

    // 即使cookie是中国格式，也强制使用国际版API
    const response = await request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      chinaCookie,
      {
        data: { /* 请求数据 */ },
        region: 'us', // 强制使用国际版
        serviceType: 'jimeng'
      }
    );

    console.log('强制使用国际版API请求成功');
    return response;

  } catch (error) {
    console.error('强制地区请求失败:', error.message);
    throw error;
  }
}

// ============================================================================
// 4. Cookie管理示例
// ============================================================================

/**
 * Cookie解析和验证示例
 */
function cookieManagementExample() {
  console.log('\n=== Cookie管理示例 ===');

  const testCookies = [
    // 新格式 - 国际版
    internationalCookie,
    // 新格式 - 中国版
    chinaCookie,
    // 旧格式 - 国际版
    'us-old-format-token-123',
    // 旧格式 - 中国版
    'old-format-token-456'
  ];

  testCookies.forEach((cookie, index) => {
    try {
      const parsed = CookieManager.parseCookie(cookie);
      console.log(`Cookie ${index + 1} 解析成功:`, {
        token: parsed.token.substring(0, 10) + '...',
        isUS: parsed.isUS,
        region: parsed.region,
        cookieString: parsed.cookieString.substring(0, 50) + '...'
      });
    } catch (error) {
      console.log(`Cookie ${index + 1} 解析失败:`, error.message);
    }
  });
}

/**
 * 地区判断示例
 */
function regionDetectionExample() {
  console.log('\n=== ���区检测示例 ===');

  const examples = [
    { cookie: internationalCookie, description: '国际版cookie' },
    { cookie: chinaCookie, description: '中国版cookie' },
    { cookie: 'us-token-123', description: '旧格式国际版token' },
    { cookie: 'token-456', description: '旧格式中国版token' }
  ];

  examples.forEach(({ cookie, description }) => {
    const isUS = CookieManager.isInternationalVersion(cookie);
    const region = CookieManager.getRegion(cookie);
    const token = CookieManager.getTokenFromCookie(cookie);

    console.log(`${description}:`, {
      是国际版: isUS,
      地区: region,
      Token: token.substring(0, 10) + '...'
    });
  });
}

// ============================================================================
// 5. URL管理示例
// ============================================================================

/**
 * URL配置管理示例
 */
function urlManagementExample() {
  console.log('\n=== URL管理示例 ===');

  const urlManager = URLManager.getInstance();

  // 获取配置统计
  const stats = urlManager.getConfigStats();
  console.log('URL配置统计:');
  Object.entries(stats).forEach(([name, config]) => {
    console.log(`\n${config.name} (${name}):`);
    console.log(`  策略: ${config.strategy}`);
    console.log(`  URL数量: ${config.urlCount}`);
    console.log(`  超时: ${config.timeout}ms`);
    console.log(`  重试次数: ${config.retryCount}`);
    console.log(`  URLs:`);
    config.urls.forEach((url, index) => {
      console.log(`    ${index + 1}. ${url}`);
    });
  });

  // 获取可用URL
  console.log('\n获取可用URL示例:');
  const jimengUSURL = urlManager.getAvailableURL('jimeng-us');
  const imagexCNURL = urlManager.getAvailableURL('imagex-cn');

  console.log(`即梦国际URL: ${jimengUSURL}`);
  console.log(`ImageX中国URL: ${imagexCNURL}`);
}

/**
 * URL可用性测试示例
 */
async function urlAvailabilityTest() {
  console.log('\n=== URL可用性测试 ===');

  const urlManager = URLManager.getInstance();
  const testURLs = [
    'https://jimeng.jianying.com',
    'https://imagex.bytedanceapi.com',
    'https://commerce.us.capcut.com'
  ];

  for (const url of testURLs) {
    try {
      console.log(`测试 ${url}...`);
      const isAvailable = await urlManager.testURLAvailability(url, 5000);
      console.log(`  ${isAvailable ? '✅ 可用' : '❌ 不可用'}`);
    } catch (error) {
      console.log(`  ❌ 测试失败: ${error.message}`);
    }
  }
}

// ============================================================================
// 6. 错误处理和重试示例
// ============================================================================

/**
 * 带重试机制的请求示例
 */
async function requestWithRetryExample() {
  console.log('\n=== 重试机制示例 ===');

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`第 ${attempt} 次尝试...`);

      const response = await request(
        'POST',
        '/mweb/v1/aigc_draft/generate',
        internationalCookie,
        {
          data: { /* 请求数据 */ },
          serviceType: 'jimeng'
        }
      );

      console.log('✅ 请求成功!');
      return response;

    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`❌ 请求失败，${delay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log('❌ 重试次数已用尽');
        break;
      }
    }
  }

  console.error('所有重试都失败了:', lastError.message);
  throw lastError;
}

function isRetryableError(error) {
  const retryableMessages = ['timeout', 'network', 'connection', 'rate limit', 'ECONNREFUSED'];
  return retryableMessages.some(msg =>
    error.message.toLowerCase().includes(msg) ||
    error.code === 'ECONNREFUSED'
  );
}

// ============================================================================
// 7. 性能监控示例
// ============================================================================

/**
 * 性能监控示例
 */
function performanceMonitoringExample() {
  console.log('\n=== 性能监控示例 ===');

  const startTime = Date.now();
  let requestCount = 0;
  let successCount = 0;
  let errorCount = 0;

  // 模拟请求监控
  const monitorRequest = async (requestFunction, description) => {
    const requestStart = Date.now();
    requestCount++;

    try {
      await requestFunction();
      const requestTime = Date.now() - requestStart;
      successCount++;

      console.log(`✅ ${description} - 成功 (${requestTime}ms)`);
    } catch (error) {
      const requestTime = Date.now() - requestStart;
      errorCount++;

      console.log(`❌ ${description} - 失败 (${requestTime}ms): ${error.message}`);
    }
  };

  // 运行一些示例请求
  const runExamples = async () => {
    await monitorRequest(() => cookieManagementExample(), 'Cookie管理');
    await monitorRequest(() => urlManagementExample(), 'URL管理');
    await monitorRequest(() => regionDetectionExample(), '地区检测');
  };

  return runExamples().then(() => {
    const totalTime = Date.now() - startTime;

    console.log('\n=== 性能统计 ===');
    console.log(`总耗时: ${totalTime}ms`);
    console.log(`请求数量: ${requestCount}`);
    console.log(`成功数量: ${successCount}`);
    console.log(`失败数量: ${errorCount}`);
    console.log(`成功率: ${((successCount / requestCount) * 100).toFixed(2)}%`);
    console.log(`平均耗时: ${(totalTime / requestCount).toFixed(2)}ms`);
  });
}

// ============================================================================
// 8. 主函数 - 运行所有示例
// ============================================================================

/**
 * 主函数 - 运行所有示例
 */
async function runAllExamples() {
  console.log('🚀 即梦API新认证机制示例开始运行...\n');

  try {
    // 1. Cookie管理示例
    cookieManagementExample();

    // 2. 地区检测示例
    regionDetectionExample();

    // 3. URL管理示例
    urlManagementExample();

    // 4. URL可用性测试
    await urlAvailabilityTest();

    // 5. 实际API调用示例
    // await generateImageExample(); // 取消注释以运行实际API调用
    // await getCreditInfoExample(); // 取消注释以运行实际API调用
    // await receiveCreditExample(); // 取消注释以运行实际API调用

    // 6. 高级功能示例
    // await customURLExample(); // 取消注释以运行自定义URL示例
    // await forceRegionExample(); // 取消注释以运行强制地区示例

    // 7. 错误处理示例
    // await requestWithRetryExample(); // 取消注释以运行重试示例

    // 8. 性能监控
    await performanceMonitoringExample();

    console.log('\n✅ 所有示例运行完成!');

  } catch (error) {
    console.error('\n❌ 示例运行过程中出现错误:', error.message);
  }
}

// 如果直接运行此文件，则执行所有示例
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供其他文件使用
module.exports = {
  generateCookieString,
  generateImageExample,
  getCreditInfoExample,
  receiveCreditExample,
  customURLExample,
  forceRegionExample,
  cookieManagementExample,
  regionDetectionExample,
  urlManagementExample,
  urlAvailabilityTest,
  requestWithRetryExample,
  performanceMonitoringExample,
  runAllExamples
};