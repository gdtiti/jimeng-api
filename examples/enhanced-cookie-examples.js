/**
 * 增强Cookie处理器使用示例
 *
 * 展示如何使用增强的Cookie处理功能来处理复杂的Cookie字符串
 */

import { EnhancedCookieManager } from '../dist/lib/auth/enhanced-cookie-manager.js';
import { CookieProcessor } from '../dist/lib/auth/cookie-processor.js';

// ============================================================================
// 1. 复杂Cookie字符串示例
// ============================================================================

/**
 * 您提供的复杂Cookie字符串示例（经过格式化以便阅读）
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

console.log('🍪 复杂Cookie字符串示例:');
console.log('长度:', complexCookieString.length);
console.log('前100个字符:', complexCookieString.substring(0, 100) + '...');
console.log('');

// ============================================================================
// 2. 基础解析示例
// ============================================================================

function basicParsingExample() {
  console.log('=== 基础Cookie解析示例 ===');

  try {
    // 使用增强Cookie管理器解析
    const parsed = EnhancedCookieManager.parseCookie(complexCookieString);

    console.log('✅ 解析成功!');
    console.log('基础信息:', {
      token: parsed.token.substring(0, 20) + '...',
      isUS: parsed.isUS,
      region: parsed.region,
      cookieString: parsed.cookieString.substring(0, 100) + '...'
    });

    // 显示分类信息
    console.log('\n📊 字段统计:');
    console.log('  总字段数:', parsed.totalFields);
    console.log('  设备信息字段数:', Object.keys(parsed.deviceInfo || {}).length);
    console.log('  会话信息字段数:', Object.keys(parsed.sessionInfo || {}).length);
    console.log('  商业信息字段数:', Object.keys(parsed.commercialInfo || {}).length);
    console.log('  地区信息字段数:', Object.keys(parsed.localeInfo || {}).length);
    console.log('  其他字段数:', Object.keys(parsed.additionalInfo || {}).length);

    return parsed;

  } catch (error) {
    console.error('❌ 解析失败:', error.message);
    return null;
  }
}

// ============================================================================
// 3. 详细字段分析示例
// ============================================================================

function detailedFieldAnalysis(parsedCookie) {
  console.log('\n=== 详细字段分析示例 ===');

  if (!parsedCookie) {
    console.log('❌ 无有效的Cookie数据');
    return;
  }

  // 设备信息分析
  console.log('\n🖥️  设备信息:');
  if (parsedCookie.deviceInfo) {
    Object.entries(parsedCookie.deviceInfo).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  // 会话信息分析
  console.log('\n🔐 会话信息:');
  if (parsedCookie.sessionInfo) {
    Object.entries(parsedCookie.sessionInfo).forEach(([key, value]) => {
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`  ${key}: ${displayValue}`);
    });
  }

  // 商业信息分析
  console.log('\n💰 商业信息:');
  if (parsedCookie.commercialInfo) {
    Object.entries(parsedCookie.commercialInfo).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  // 地区信息分析
  console.log('\n🌍 地区信息:');
  if (parsedCookie.localeInfo) {
    Object.entries(parsedCookie.localeInfo).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  // 重要字段摘要
  console.log('\n📋 重要字段摘要:');
  const importantFields = [
    'sessionid', 'sid_tt', 'uid_tt', 'capcut_locale',
    'store-region', '_tea_web_id', 'sid_guard'
  ];

  importantFields.forEach(field => {
    const value = parsedCookie.additionalInfo[field];
    if (value) {
      const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      console.log(`  ${field}: ${displayValue}`);
    }
  });
}

// ============================================================================
// 4. Cookie验证和处理示例
// ============================================================================

function cookieValidationExample() {
  console.log('\n=== Cookie验证和处理示例 ===');

  // 使用Cookie处理器进行验证
  const processResult = CookieProcessor.processCookie(complexCookieString, {
    format: 'enhanced',
    validateFields: ['capcut_locale', 'sessionid', 'sid_tt', 'uid_tt'],
    strictMode: true,
    cleanString: true
  });

  console.log('处理结果:', {
    成功: processResult.success,
    数据有效: !!processResult.data,
    警告数量: processResult.warnings?.length || 0,
    建议数量: processResult.suggestions?.length || 0
  });

  if (processResult.warnings && processResult.warnings.length > 0) {
    console.log('\n⚠️  警告信息:');
    processResult.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }

  if (processResult.suggestions && processResult.suggestions.length > 0) {
    console.log('\n💡 改进建议:');
    processResult.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }

  return processResult;
}

// ============================================================================
// 5. Cookie完整性检查示例
// ============================================================================

function cookieIntegrityExample() {
  console.log('\n=== Cookie完整性检查示例 ===');

  const integrityCheck = CookieProcessor.validateCookieIntegrity(complexCookieString);

  console.log('完整性检查结果:', {
    是否有效: integrityCheck.isValid,
    问题数量: integrityCheck.issues.length,
    修复建议数量: integrityCheck.fixes.length
  });

  if (integrityCheck.issues.length > 0) {
    console.log('\n🚨 发现的问题:');
    integrityCheck.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }

  if (integrityCheck.fixes.length > 0) {
    console.log('\n🔧 修复建议:');
    integrityCheck.fixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });
  }

  return integrityCheck;
}

// ============================================================================
// 6. Cookie格式化示例
// ============================================================================

function cookieFormattingExample() {
  console.log('\n=== Cookie格式化示例 ===');

  // 格式化为标准格式（使用分号分隔）
  const standardFormat = CookieProcessor.formatCookieString(complexCookieString, {
    separator: 'semicolon',
    sortFields: true,
    validateFields: false
  });

  console.log('标准格式（分号分隔）:');
  console.log('长度:', standardFormat.length);
  console.log('前200个字符:', standardFormat.substring(0, 200) + '...');

  // 格式化为增强格式（使用点分隔）
  const enhancedFormat = CookieProcessor.formatCookieString(complexCookieString, {
    separator: 'dots',
    sortFields: true,
    validateFields: false
  });

  console.log('\n增强格式（点分隔）:');
  console.log('长度:', enhancedFormat.length);
  console.log('前200个字符:', enhancedFormat.substring(0, 200) + '...');

  return { standardFormat, enhancedFormat };
}

// ============================================================================
// 7. 字段提取和操作示例
// ============================================================================

function fieldManipulationExample() {
  console.log('\n=== 字段提取和操作示例 ===');

  // 提取重要字段
  const importantFields = [
    'sessionid', 'sid_tt', 'uid_tt', 'capcut_locale',
    'store-region', '_tea_web_id', 'sid_guard'
  ];

  const extractedFields = CookieProcessor.extractFields(complexCookieString, importantFields);

  console.log('提取的重要字段:');
  Object.entries(extractedFields).forEach(([key, value]) => {
    const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`  ${key}: ${displayValue}`);
  });

  // 检查是否包含所需字段
  const hasRequiredFields = CookieProcessor.hasFields(complexCookieString, [
    'capcut_locale', 'sessionid', 'sid_tt'
  ]);

  console.log('\n必填字段检查:', hasRequiredFields ? '✅ 包含所有必填字段' : '❌ 缺少必填字段');

  // 更新字段示例
  const updatedCookie = CookieProcessor.updateFields(complexCookieString, {
    'test_field': 'test_value',
    'updated_timestamp': Date.now().toString()
  });

  console.log('\n字段更新结果:');
  console.log('原字段数:', complexCookieString.split('.....').length);
  console.log('新字段数:', updatedCookie.split('.....').length);

  return extractedFields;
}

// ============================================================================
// 8. Cookie比较示例
// ============================================================================

function cookieComparisonExample() {
  console.log('\n=== Cookie比较示例 ===');

  // 创建一个简化的Cookie用于比较
  const simplifiedCookie = [
    'sessionid=68360921a0f383e31113c4493e9c9c1f7e5e',
    'capcut_locale=en',
    'uid_tt=7325460301268143616',
    '_tea_web_id=6836092188128796170'
  ].join('.....');

  const comparison = CookieProcessor.compareCookies(complexCookieString, simplifiedCookie);

  console.log('比较结果:');
  console.log('  是否等效:', comparison.areEquivalent);
  console.log('  差异数量:', comparison.differences.length);
  console.log('  相似数量:', comparison.similarities.length);

  if (comparison.differences.length > 0) {
    console.log('\n🔍 主要差异:');
    comparison.differences.slice(0, 5).forEach((diff, index) => {
      console.log(`  ${index + 1}. ${diff}`);
    });
  }

  if (comparison.similarities.length > 0) {
    console.log('\n📋 相似点:');
    comparison.similarities.forEach((sim, index) => {
      console.log(`  ${index + 1}. ${sim}`);
    });
  }

  return comparison;
}

// ============================================================================
// 9. Cookie摘要生成示例
// ============================================================================

function cookieSummaryExample() {
  console.log('\n=== Cookie摘要生成示例 ===');

  const summary = CookieProcessor.getCookieSummary(complexCookieString);

  console.log('Cookie摘要:');
  console.log('  是否有效:', summary.isValid);
  console.log('  地区:', summary.region);
  console.log('  是否国际版:', summary.isUS);
  console.log('  原始长度:', summary.originalLength);
  console.log('  格式:', summary.format);
  console.log('  字段数量:', summary.fieldCount);
  console.log('  Token:', summary.token ? summary.token.substring(0, 20) + '...' : 'N/A');

  // 显示字段类型分布
  if (summary.fieldDistribution) {
    console.log('\n📊 字段类型分布:');
    Object.entries(summary.fieldDistribution).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  return summary;
}

// ============================================================================
// 10. Cookie模板生成示例
// ============================================================================

function cookieTemplateExample() {
  console.log('\n=== Cookie模板生成示例 ===');

  // 基于当前Cookie生成标准模板
  const parsed = EnhancedCookieManager.parseCookie(complexCookieString);
  const template = CookieProcessor.createCookieTemplate(
    parsed.token,
    parsed.region,
    {
      includeDeviceInfo: true,
      includeSessionInfo: true,
      includeAuthInfo: true,
      includeCommercialInfo: true
    }
  );

  console.log('生成的Cookie模板:');
  console.log('长度:', template.length);
  console.log('字段数:', template.split('.....').length);
  console.log('前200个字符:', template.substring(0, 200) + '...');

  // 比较模板与原始Cookie
  const comparison = CookieProcessor.compareCookies(complexCookieString, template);
  console.log('\n模板比较:');
  console.log('  字段数量差异:', comparison.summary.cookie1.fieldCount - comparison.summary.cookie2.fieldCount);
  console.log('  地区一致性:', comparison.similarities.some(s => s.includes('地区')));

  return template;
}

// ============================================================================
// 11. 主函数 - 运行所有示例
// ============================================================================

async function runEnhancedCookieExamples() {
  console.log('🚀 增强Cookie处理器示���开始运行...\n');

  try {
    // 1. 基础解析
    const parsedCookie = basicParsingExample();

    // 2. 详细字段分析
    detailedFieldAnalysis(parsedCookie);

    // 3. Cookie验证和处理
    const processResult = cookieValidationExample();

    // 4. 完整性检查
    const integrityCheck = cookieIntegrityExample();

    // 5. 格式化示例
    const formats = cookieFormattingExample();

    // 6. 字段操作
    const extractedFields = fieldManipulationExample();

    // 7. Cookie比较
    const comparison = cookieComparisonExample();

    // 8. 摘要生成
    const summary = cookieSummaryExample();

    // 9. 模板生成
    const template = cookieTemplateExample();

    console.log('\n✅ 所有示例运行完成!');
    console.log('\n📋 处理结果汇总:');
    console.log('  解析状态:', parsedCookie ? '✅ 成功' : '❌ 失败');
    console.log('  验证状态:', processResult?.success ? '✅ 通过' : '❌ 失败');
    console.log('  完整性状态:', integrityCheck?.isValid ? '✅ 完整' : '❌ 有问题');
    console.log('  格式化: ✅ 完成');
    console.log('  字段操作: ✅ 完成');
    console.log('  比较分析: ✅ 完成');
    console.log('  摘要生成: ✅ 完成');
    console.log('  模板生成: ✅ 完成');

  } catch (error) {
    console.error('\n❌ 示例运行过程中出现错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 如果直接运行此文件，则执行所有示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedCookieExamples();
}

// 导出示例函数供其他文件使用
export {
  complexCookieString,
  basicParsingExample,
  detailedFieldAnalysis,
  cookieValidationExample,
  cookieIntegrityExample,
  cookieFormattingExample,
  fieldManipulationExample,
  cookieComparisonExample,
  cookieSummaryExample,
  cookieTemplateExample,
  runEnhancedCookieExamples
};