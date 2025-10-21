/**
 * Cookie工具函数使用示例
 *
 * 展示如何使用CookieUtils类提供的各种实用函数
 */

const fs = require('fs');
const path = require('path');

// 模拟CookieUtils类（简化版本，用于演示）
class CookieUtils {
  static quickValidate(cookieString) {
    try {
      if (!cookieString || cookieString.trim().length === 0) {
        return { isValid: false, hasToken: false, hasLocale: false, format: 'unknown' };
      }

      const format = cookieString.includes('.....') ? 'enhanced' :
                    cookieString.includes(';') ? 'standard' : 'legacy';

      const hasToken = cookieString.includes('sessionid=') ||
                      cookieString.includes('sid_tt=') ||
                      cookieString.includes('token=');

      const hasLocale = cookieString.includes('capcut_locale=');

      let region;
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
      return { isValid: false, hasToken: false, hasLocale: false, format: 'unknown' };
    }
  }

  static extractKeyInfo(cookieString) {
    const validation = this.quickValidate(cookieString);
    const token = this.extractTokenFromRaw(cookieString);

    const userIdMatch = cookieString.match(/uid_tt=([^;.....]+)/);
    const webIdMatch = cookieString.match(/_tea_web_id=([^;.....]+)/);
    const sessionIdMatch = cookieString.match(/sessionid=([^;.....]+)/);

    return {
      token,
      region: validation.region || 'cn',
      userId: userIdMatch ? userIdMatch[1] : undefined,
      webId: webIdMatch ? webIdMatch[1] : undefined,
      sessionId: sessionIdMatch ? sessionIdMatch[1] : undefined,
      isValid: validation.isValid
    };
  }

  static extractTokenFromRaw(cookieString) {
    const sessionIdMatch = cookieString.match(/sessionid=([^;.....]+)/);
    if (sessionIdMatch) return sessionIdMatch[1];

    const sidTtMatch = cookieString.match(/sid_tt=([^;.....]+)/);
    if (sidTtMatch) return sidTtMatch[1];

    const tokenMatch = cookieString.match(/token=([^;.....]+)/);
    if (tokenMatch) return tokenMatch[1];

    if (!cookieString.includes('=') && !cookieString.includes('.....')) {
      return cookieString.startsWith('us-') ? cookieString.substring(3) : cookieString;
    }

    return '';
  }

  static detectCookieType(cookieString) {
    if (!cookieString || cookieString.trim().length === 0) {
      return { type: 'simple-token', complexity: 'low', estimatedFields: 0, features: [] };
    }

    const features = [];
    let fieldCount = 0;

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

    const keyFields = [
      'sessionid', 'sid_tt', 'uid_tt', '_tea_web_id', 'capcut_locale',
      'store-region', 'sid_guard', 'csrf_token', 'passport_csrf_token'
    ];

    keyFields.forEach(field => {
      if (cookieString.includes(field)) {
        features.push(field);
      }
    });

    const commercialFields = ['store_country_code', 'store_id', '_isCommercialFreemiumStage'];
    const hasCommercial = commercialFields.some(field => cookieString.includes(field));
    if (hasCommercial) features.push('commercial-fields');

    let type;
    if (fieldCount === 1 && !cookieString.includes('=')) {
      type = 'simple-token';
    } else if (fieldCount <= 5) {
      type = cookieString.includes('.....') ? 'enhanced-cookie' : 'standard-cookie';
    } else {
      type = 'complex-cookie';
    }

    let complexity;
    if (fieldCount <= 5) complexity = 'low';
    else if (fieldCount <= 20) complexity = 'medium';
    else complexity = 'high';

    return { type, complexity, estimatedFields: fieldCount, features };
  }

  static createCookieSummary(cookieString) {
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

// 测试用的Cookie字符串
const testCookies = {
  // 复杂Cookie（您提供的示例）
  complex: [
    'is_staff_user=false',
    'sid_guard=68360921%257C1732879755%257C5184000%257CFri%252C%252B30-Aug-2025%252B03%253A15%253A55%252BGMT',
    '_tea_web_id=6836092188128796170',
    'store-region=us',
    'store-region-src=uid',
    'sid_tt=68360921a0f383e31113c4493e9c9c1f7e5e',
    'sessionid=68360921a0f383e31113c4493e9c9c1f7e5e',
    'sessionid_ss=68360921a0f383e31113c4493e9c9c1f7e5e',
    'uid_tt=7325460301268143616',
    'uid_tt_ss=7325460301268143616',
    'store_country_code=us',
    'tt-target-idc=useast5',
    'store-country-sign=US',
    'store_id=useast5',
    '_isCommercialFreemiumStage=0',
    'capcut_locale=en'
  ].join('.....'),

  // 标准Cookie
  standard: 'sessionid=abc123.....capcut_locale=en.....uid_tt=user456....._tea_web_id=789',

  // 简单Token
  simpleToken: 'us-token123456',

  // 中国版Cookie
  chinaCookie: 'sessionid=cn123.....capcut_locale=zh-CN.....store-region=cn-gd',

  // 无效Cookie
  invalid: 'invalid-cookie-string'
};

// ============================================================================
// 1. 快速验证示例
// ============================================================================

function quickValidationExamples() {
  console.log('🔍 快速验证示例');
  console.log('='.repeat(50));

  Object.entries(testCookies).forEach(([name, cookie]) => {
    console.log(`\n📋 ${name}:`);
    const validation = CookieUtils.quickValidate(cookie);

    console.log(`  有效性: ${validation.isValid ? '✅ 有效' : '❌ 无效'}`);
    console.log(`  格式: ${validation.format}`);
    console.log(`  有Token: ${validation.hasToken ? '✅' : '❌'}`);
    console.log(`  有地区信息: ${validation.hasLocale ? '✅' : '❌'}`);
    if (validation.region) {
      console.log(`  地区: ${validation.region === 'us' ? '🌍 国际版' : '🇨🇳 中国版'}`);
    }
  });
}

// ============================================================================
// 2. 关键信息提取示例
// ============================================================================

function keyInfoExtractionExamples() {
  console.log('\n🔑 关键信息提取示例');
  console.log('='.repeat(50));

  Object.entries(testCookies).forEach(([name, cookie]) => {
    if (name === 'invalid') return; // 跳过无效Cookie

    console.log(`\n📋 ${name}:`);
    const keyInfo = CookieUtils.extractKeyInfo(cookie);

    console.log(`  Token: ${keyInfo.token ? keyInfo.token.substring(0, 15) + '...' : 'N/A'}`);
    console.log(`  地区: ${keyInfo.region === 'us' ? '🌍 国际版' : '🇨🇳 中国版'}`);
    console.log(`  用户ID: ${keyInfo.userId || 'N/A'}`);
    console.log(`  Web ID: ${keyInfo.webId || 'N/A'}`);
    console.log(`  会话ID: ${keyInfo.sessionId ? keyInfo.sessionId.substring(0, 15) + '...' : 'N/A'}`);
    console.log(`  有效性: ${keyInfo.isValid ? '✅ 有效' : '❌ 无效'}`);
  });
}

// ============================================================================
// 3. Cookie类型检测示例
// ============================================================================

function cookieTypeDetectionExamples() {
  console.log('\n📊 Cookie类型检测示例');
  console.log('='.repeat(50));

  Object.entries(testCookies).forEach(([name, cookie]) => {
    if (name === 'invalid') return; // 跳过无效Cookie

    console.log(`\n📋 ${name}:`);
    const typeInfo = CookieUtils.detectCookieType(cookie);

    console.log(`  类型: ${typeInfo.type}`);
    console.log(`  复杂度: ${typeInfo.complexity}`);
    console.log(`  估计字段数: ${typeInfo.estimatedFields}`);
    console.log(`  特征数量: ${typeInfo.features.length}`);

    if (typeInfo.features.length > 0) {
      console.log(`  主要特征:`);
      typeInfo.features.slice(0, 5).forEach(feature => {
        console.log(`    • ${feature}`);
      });
      if (typeInfo.features.length > 5) {
        console.log(`    ... 还有 ${typeInfo.features.length - 5} 个特征`);
      }
    }
  });
}

// ============================================================================
// 4. Cookie摘要生成示例
// ============================================================================

function cookieSummaryExamples() {
  console.log('\n📝 Cookie摘要生成示例');
  console.log('='.repeat(50));

  Object.entries(testCookies).forEach(([name, cookie]) => {
    console.log(`\n📋 ${name}:`);
    const summary = CookieUtils.createCookieSummary(cookie);
    console.log(`  摘要: ${summary}`);
  });
}

// ============================================================================
// 5. 实际使用场景示例
// ============================================================================

function practicalUsageExamples() {
  console.log('\n🎯 实际使用场景示例');
  console.log('='.repeat(50));

  // 场景1: API调用前的Cookie验证
  console.log('\n🚀 场景1: API调用前的Cookie验证');
  const apiCookie = testCookies.complex;
  const validation = CookieUtils.quickValidate(apiCookie);

  if (validation.isValid) {
    console.log('✅ Cookie有效，可以进行API调用');
    const keyInfo = CookieUtils.extractKeyInfo(apiCookie);
    console.log(`📱 将使用 ${keyInfo.region === 'us' ? '国际版' : '中国版'} API`);
    console.log(`🔐 认证Token: ${keyInfo.token.substring(0, 10)}...`);
  } else {
    console.log('❌ Cookie无效，需要用户重新登录');
  }

  // 场景2: Cookie缓存管理
  console.log('\n💾 场景2: Cookie缓存管理');
  const cachedCookies = [
    testCookies.complex,
    testCookies.standard,
    testCookies.chinaCookie
  ];

  console.log('缓存中的Cookie:');
  cachedCookies.forEach((cookie, index) => {
    const summary = CookieUtils.createCookieSummary(cookie);
    console.log(`  ${index + 1}. ${summary}`);
  });

  // 场景3: Cookie类型统计
  console.log('\n📈 场景3: Cookie类型统计');
  const allCookies = Object.values(testCookies).filter(c => c !== testCookies.invalid);
  const typeStats = {};

  allCookies.forEach(cookie => {
    const typeInfo = CookieUtils.detectCookieType(cookie);
    typeStats[typeInfo.type] = (typeStats[typeInfo.type] || 0) + 1;
  });

  console.log('Cookie类型分布:');
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}个`);
  });

  // 场景4: 错误处理
  console.log('\n⚠️  场景4: 错误处理');
  try {
    const result = CookieUtils.extractKeyInfo(testCookies.invalid);
    console.log('错误处理结果:', result);
  } catch (error) {
    console.log('捕获到错误:', error.message);
  }
}

// ============================================================================
// 6. 性能测试示例
// ============================================================================

function performanceTestExamples() {
  console.log('\n⚡ 性能测试示例');
  console.log('='.repeat(50));

  const testCookie = testCookies.complex;
  const iterations = 1000;

  console.log(`🏃 执行 ${iterations} 次操作...`);

  // 测试快速验证性能
  const startQuickValidate = Date.now();
  for (let i = 0; i < iterations; i++) {
    CookieUtils.quickValidate(testCookie);
  }
  const quickValidateTime = Date.now() - startQuickValidate;

  // 测试关键信息提取性能
  const startExtractInfo = Date.now();
  for (let i = 0; i < iterations; i++) {
    CookieUtils.extractKeyInfo(testCookie);
  }
  const extractInfoTime = Date.now() - startExtractInfo;

  // 测试类型检测性能
  const startTypeDetection = Date.now();
  for (let i = 0; i < iterations; i++) {
    CookieUtils.detectCookieType(testCookie);
  }
  const typeDetectionTime = Date.now() - startTypeDetection;

  console.log('\n📊 性能结果:');
  console.log(`  快速验证: ${quickValidateTime}ms (${(quickValidateTime / iterations).toFixed(3)}ms/op)`);
  console.log(`  信息提取: ${extractInfoTime}ms (${(extractInfoTime / iterations).toFixed(3)}ms/op)`);
  console.log(`  类型检测: ${typeDetectionTime}ms (${(typeDetectionTime / iterations).toFixed(3)}ms/op)`);
  console.log(`  总计: ${(quickValidateTime + extractInfoTime + typeDetectionTime)}ms`);
}

// ============================================================================
// 7. 主函数
// ============================================================================

function runCookieUtilsExamples() {
  console.log('🚀 Cookie工具函数示例开始运行');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('');

  try {
    // 1. 快速验证
    quickValidationExamples();

    // 2. 关键信息提取
    keyInfoExtractionExamples();

    // 3. Cookie类型检测
    cookieTypeDetectionExamples();

    // 4. Cookie摘要生成
    cookieSummaryExamples();

    // 5. 实际使用场景
    practicalUsageExamples();

    // 6. 性能测试
    performanceTestExamples();

    console.log('\n✅ 所有示例运行完成!');
    console.log('\n📋 功能总结:');
    console.log('  ✅ 快速验证: 毫秒级Cookie有效性检查');
    console.log('  ✅ 信息提取: 提取Token、地区、用户ID等关键信息');
    console.log('  ✅ 类型检测: 智能识别Cookie类型和复杂度');
    console.log('  ✅ 摘要生成: 一行式Cookie状态摘要');
    console.log('  ✅ 错误处理: 优雅的错误处理和降级');
    console.log('  ✅ 性能优化: 高性能的批量处理能力');

  } catch (error) {
    console.error('\n❌ 示例运行过程中出现错误:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行示例
if (require.main === module) {
  runCookieUtilsExamples();
}

module.exports = {
  CookieUtils,
  testCookies,
  quickValidationExamples,
  keyInfoExtractionExamples,
  cookieTypeDetectionExamples,
  cookieSummaryExamples,
  practicalUsageExamples,
  performanceTestExamples,
  runCookieUtilsExamples
};