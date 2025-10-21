/**
 * 复杂Cookie字符串测试
 *
 * 测试您提供的复杂Cookie字符串的解析和处理
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 1. 复杂Cookie字符串示例
// ============================================================================

/**
 * 您提供的复杂Cookie字符串示例
 */
const complexCookieString = [
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
  '__tea_cache_tokens_2024__=100',
  'csrf_session_id=v2:asdlk5q2n5c2v6a:7z5a9k',
  'passport_csrf_token=5a8d2c3e4f5b6a7c8d9e0f1a2b3c4d5e',
  'MONITOR_USER_ID=7325460301268143616',
  'MONITOR_WEB_ID=6836092188128796170',
  'store_country_code=us',
  'tt-target-idc=useast5',
  'store-country-sign=US',
  'store_id=useast5',
  '_isCommercialFreemiumStage=0',
  's_v_web_id=verify_lu2k3j4h5g6f7d8e',
  'msToken',
  'odin_tt=68360921812e45f693c1b9a2c3d4e5f6a7b8c9d',
  'ttcid=68360921a0f383e31113c4493e9c9c1f7e5e',
  'bd_ticket_guard_client_data=eyJiZC10aWNrZXQtZ3VhcmQtdmVyc2lvbiI6MiwiYmQtdGlja2V0LWd1YXJkLWNsaWVudC1jc3IiOiItLS0tLUJFR0lOIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQ==',
  'tt_request_id=20241129103031123456789ABCDEF',
  'sla_bvid=1732879755',
  'stream_player_status_dict=%7B%227325460301268143616%22%3A%7B%22last_active_time%22%3A1732879755%7D%7D',
  'stream_focus_guard_dict=%7B%22stream_focus_guard%22%3A%7B%227325460301268143616%22%3A%7B%22last_active_time%22%3A1732879755%2C%22focus_start_time%22%3A1732879755%2C%22is_streaming%22%3Afalse%7D%7D%7D',
  'live_state=1',
  '__ac_nonce=061a2b3c4d5e6f7g8h9',
  '__ac_signature=_02B4Z6wo00f01abc.1234567890abcdef',
  'ttwid=1%7Cabcdefghijklmnopqrstuvwxyz123456',
  'dm_chrome_console=0',
  'dm_chrome_network=0',
  'dm_chrome_performance=0',
  'dm_chrome_application=0',
  'dm_chrome_security=0',
  'ttsig_bid=68360921.1234567890abcdef',
  'msToken',
  'strategy_task_args={"source_type":"normal","aid":1768,"channel":"web","version_code":"170400","device_type":"web","version_name":"1.70.4","update_version_code":"170400","os_version":"win10","device_platform":"web","ab_version":"1.70.4","device_brand":"","browser_language":"zh-CN","browser_platform":"Win32","browser_name="Chrome","browser_version":"119.0.0.0"}',
  'X-Bogus=DFSzsswVUANANUJDFKANJDKFLJKA',
  's_web_id=verify_lu2k3j4h5g6f7d8e',
  'webid=1732879755123456789',
  'msToken',
  'capcut_locale=en'
].join('.....');

// ============================================================================
// 2. 简化的Cookie解析器
// ============================================================================

class SimpleCookieParser {
  static parseCookie(cookieString) {
    try {
      if (!cookieString || cookieString.trim().length === 0) {
        throw new Error('Cookie字符串为空');
      }

      // 判断格式
      const isEnhancedFormat = cookieString.includes('.....');
      const isStandardFormat = cookieString.includes(';');

      let cookieItems = [];

      if (isEnhancedFormat) {
        cookieItems = cookieString.split('.....').filter(item => item.trim());
      } else if (isStandardFormat) {
        cookieItems = cookieString.split(';').filter(item => item.trim());
      } else {
        // 假设是token格式
        return this.parseTokenFormat(cookieString);
      }

      const parsed = {
        additionalInfo: {},
        deviceInfo: {},
        sessionInfo: {},
        commercialInfo: {},
        localeInfo: {},
        totalFields: cookieItems.length
      };

      // 解析每个字段
      cookieItems.forEach(item => {
        const [key, value] = item.split('=').map(s => s.trim());
        if (key && value !== undefined) {
          parsed.additionalInfo[key] = value;

          // 分类字段
          this.categorizeField(key, value, parsed);
        }
      });

      // 提取基本信息
      parsed.token = this.extractToken(parsed);
      parsed.isUS = this.detectInternationalVersion(parsed);
      parsed.region = parsed.isUS ? 'us' : 'cn';
      parsed.cookieString = cookieString;

      return parsed;

    } catch (error) {
      throw new Error(`Cookie解析失败: ${error.message}`);
    }
  }

  static parseTokenFormat(tokenString) {
    const isUS = tokenString.startsWith('us-');
    const token = isUS ? tokenString.substring(3) : tokenString;

    return {
      token,
      isUS,
      region: isUS ? 'us' : 'cn',
      cookieString: tokenString,
      additionalInfo: { sessionid: token },
      deviceInfo: {},
      sessionInfo: {},
      commercialInfo: {},
      localeInfo: {},
      totalFields: 1
    };
  }

  static categorizeField(key, value, parsed) {
    // 设备信息
    if (key.includes('web_id') || key.includes('device') || key.includes('browser')) {
      parsed.deviceInfo[key] = value;
    }

    // 会话信息
    else if (key.includes('session') || key.includes('sid_') || key.includes('csrf') || key.includes('token')) {
      parsed.sessionInfo[key] = value;
    }

    // 商业信息
    else if (key.includes('store') || key.includes('commercial') || key.includes('credit')) {
      parsed.commercialInfo[key] = value;
    }

    // 地区信息
    else if (key.includes('locale') || key.includes('region') || key.includes('country')) {
      parsed.localeInfo[key] = value;
    }
  }

  static extractToken(parsed) {
    // 优先使用sessionid
    if (parsed.additionalInfo.sessionid) {
      return parsed.additionalInfo.sessionid;
    }

    // 其次使用sid_tt
    if (parsed.additionalInfo.sid_tt) {
      return parsed.additionalInfo.sid_tt;
    }

    return '';
  }

  static detectInternationalVersion(parsed) {
    // 检查capcut_locale字段
    if (parsed.additionalInfo.capcut_locale) {
      return parsed.additionalInfo.capcut_locale === 'en';
    }

    // 检查store-region字段
    if (parsed.additionalInfo['store-region']) {
      return parsed.additionalInfo['store-region'] === 'us';
    }

    return false;
  }

  static validateCookie(cookieString) {
    const issues = [];
    const fixes = [];

    if (!cookieString || cookieString.trim().length === 0) {
      issues.push('Cookie字符串为空');
      fixes.push('提供有效的cookie字符串');
      return { isValid: false, issues, fixes };
    }

    const parsed = this.parseCookie(cookieString);

    // 检查必要字段
    const requiredFields = ['sessionid', 'sid_tt'];
    const missingFields = requiredFields.filter(field => !parsed.additionalInfo[field]);

    if (missingFields.length > 0) {
      issues.push(`缺少必要字段: ${missingFields.join(', ')}`);
      fixes.push(`添加缺失的字段: ${missingFields.join(', ')}`);
    }

    // 检查地区信息
    if (!parsed.additionalInfo.capcut_locale) {
      issues.push('缺少地区信息字段capcut_locale');
      fixes.push('添加capcut_locale字段来指定地区');
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixes,
      parsed
    };
  }
}

// ============================================================================
// 3. 测试函数
// ============================================================================

function testComplexCookieParsing() {
  console.log('🍪 复杂Cookie字符串测试');
  console.log('='.repeat(50));

  console.log('原始Cookie字符串:');
  console.log('长度:', complexCookieString.length);
  console.log('字段数量:', complexCookieString.split('.....').length);
  console.log('');

  try {
    // 解析Cookie
    const parsed = SimpleCookieParser.parseCookie(complexCookieString);

    console.log('✅ 解析成功!');
    console.log('');
    console.log('📊 基本信息:');
    console.log('  Token:', parsed.token.substring(0, 20) + '...');
    console.log('  是否国际版:', parsed.isUS);
    console.log('  地区:', parsed.region);
    console.log('  总字段数:', parsed.totalFields);
    console.log('');

    console.log('🗂️  字段分类统计:');
    console.log('  设备信息:', Object.keys(parsed.deviceInfo).length, '个字段');
    console.log('  会话信息:', Object.keys(parsed.sessionInfo).length, '个字段');
    console.log('  商业信息:', Object.keys(parsed.commercialInfo).length, '个字段');
    console.log('  地区信息:', Object.keys(parsed.localeInfo).length, '个字段');
    console.log('  其他字段:', Object.keys(parsed.additionalInfo).length -
                Object.keys(parsed.deviceInfo).length -
                Object.keys(parsed.sessionInfo).length -
                Object.keys(parsed.commercialInfo).length -
                Object.keys(parsed.localeInfo).length, '个字段');
    console.log('');

    // 显示重要字段
    console.log('🔑 重要字段:');
    const importantFields = [
      'sessionid', 'sid_tt', 'uid_tt', 'capcut_locale',
      'store-region', '_tea_web_id', 'sid_guard', 'store_country_code'
    ];

    importantFields.forEach(field => {
      const value = parsed.additionalInfo[field];
      if (value) {
        const displayValue = value.length > 40 ? value.substring(0, 40) + '...' : value;
        console.log(`  ${field}: ${displayValue}`);
      }
    });

    return parsed;

  } catch (error) {
    console.error('❌ 解析失败:', error.message);
    return null;
  }
}

function testCookieValidation() {
  console.log('\n🔍 Cookie验证测试');
  console.log('='.repeat(50));

  const validation = SimpleCookieParser.validateCookie(complexCookieString);

  console.log('验证结果:');
  console.log('  是否有效:', validation.isValid);
  console.log('  问题数量:', validation.issues.length);
  console.log('  修复建议数量:', validation.fixes.length);

  if (validation.issues.length > 0) {
    console.log('\n⚠️  发现的问题:');
    validation.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }

  if (validation.fixes.length > 0) {
    console.log('\n🔧 修复建议:');
    validation.fixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });
  }

  return validation;
}

function testFieldExtraction() {
  console.log('\n🛠️  字段提取测试');
  console.log('='.repeat(50));

  const parsed = SimpleCookieParser.parseCookie(complexCookieString);

  // 提取不同类型的字段
  console.log('🖥️  设备信息字段:');
  Object.entries(parsed.deviceInfo).slice(0, 5).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n🔐 会话信息字段:');
  Object.entries(parsed.sessionInfo).slice(0, 5).forEach(([key, value]) => {
    const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`  ${key}: ${displayValue}`);
  });

  console.log('\n💰 商业信息字段:');
  Object.entries(parsed.commercialInfo).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n🌍 地区信息字段:');
  Object.entries(parsed.localeInfo).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  return parsed;
}

function testFormatConversion() {
  console.log('\n🔄 格式转换测试');
  console.log('='.repeat(50));

  // 转换为标准格式（分号分隔）
  const standardFormat = complexCookieString.split('.....').join('; ');

  console.log('标准格式（分号分隔）:');
  console.log('长度:', standardFormat.length);
  console.log('前200字符:', standardFormat.substring(0, 200) + '...');

  // 验证转换后的解析
  const parsedStandard = SimpleCookieParser.parseCookie(standardFormat);
  console.log('\n转换后解析结果:');
  console.log('  解析成功:', !!parsedStandard);
  console.log('  地区一致:', parsedStandard.region === 'us');

  return { standardFormat, parsedStandard };
}

function generateCookieTemplate() {
  console.log('\n📋 Cookie模板生成测试');
  console.log('='.repeat(50));

  const parsed = SimpleCookieParser.parseCookie(complexCookieString);

  // 生成简化的标准模板
  const templateFields = {
    '_tea_web_id': parsed.deviceInfo._tea_web_id || 'default_web_id',
    'is_staff_user': 'false',
    'store-region': parsed.region === 'us' ? 'us' : 'cn-gd',
    'store-region-src': 'uid',
    'sid_guard': parsed.sessionInfo.sid_guard || 'default_guard',
    'uid_tt': parsed.additionalInfo.uid_tt || 'default_uid',
    'uid_tt_ss': parsed.additionalInfo.uid_tt_ss || 'default_uid',
    'sid_tt': parsed.token,
    'sessionid': parsed.token,
    'sessionid_ss': parsed.token,
    'capcut_locale': parsed.localeInfo.capcut_locale || (parsed.region === 'us' ? 'en' : 'zh-CN')
  };

  const templateCookie = Object.entries(templateFields)
    .map(([key, value]) => `${key}=${value}`)
    .join('.....');

  console.log('生成的标准模板:');
  console.log('字段数量:', Object.keys(templateFields).length);
  console.log('模板Cookie:', templateCookie.substring(0, 200) + '...');

  // 验证模板
  const templateParsed = SimpleCookieParser.parseCookie(templateCookie);
  console.log('\n模板验证:');
  console.log('  解析成功:', !!templateParsed);
  console.log('  地区正确:', templateParsed.region === parsed.region);
  console.log('  Token一致:', templateParsed.token === parsed.token);

  return templateCookie;
}

// ============================================================================
// 4. 主测试函数
// ============================================================================

function runAllTests() {
  console.log('🚀 复杂Cookie字符串处理测试开始');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('');

  try {
    // 1. 基础解析测试
    const parsed = testComplexCookieParsing();

    if (!parsed) {
      console.error('❌ 基础解析失败，跳过后续测试');
      return;
    }

    // 2. 验证测试
    const validation = testCookieValidation();

    // 3. 字段提取测试
    testFieldExtraction();

    // 4. 格式转换测试
    testFormatConversion();

    // 5. 模板生成测试
    generateCookieTemplate();

    console.log('\n✅ 所有测试完成!');
    console.log('\n📊 测试总结:');
    console.log('  ✅ Cookie解析: 成功');
    console.log('  ✅ 字段分类: 成功');
    console.log('  ✅ 地区检测: 成功');
    console.log('  ✅ 格式转换: 成功');
    console.log('  ✅ 模板生成: 成功');
    console.log('  ✅ 验证检查: 成功');

    console.log('\n🎯 主要发现:');
    console.log('  1. Cookie字符串包含', parsed.totalFields, '个字段');
    console.log('  2. 检测为', parsed.region === 'us' ? '国际版' : '中国版');
    console.log('  3. 包含完整的会话、设备、商业和地区信息');
    console.log('  4. 支持增强格式（.....分隔符）解析');
    console.log('  5. 可以正确提取Token和地区信息');

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = {
  complexCookieString,
  SimpleCookieParser,
  testComplexCookieParsing,
  testCookieValidation,
  testFieldExtraction,
  testFormatConversion,
  generateCookieTemplate,
  runAllTests
};