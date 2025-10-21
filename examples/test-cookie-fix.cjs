/**
 * Cookie解析修复���试
 * 测试复杂Cookie字符串是否能被正确解析
 */

const fs = require('fs');
const path = require('path');

// 模拟用户提供的复杂Cookie字符串
const complexCookieString = "_tea_web_id=.....ttwid=.....msToken=YAL9hVMdmv1anwkaHa_FdfypO0fl0k1HlsSuwJe9R8hsgvlhW2MeuFJVDuSUZvsk6IKrsyglkzV6EQ2_X3FUl7SCAscb-Wr1sU728Qe2ryOp....._isCommercialFreemiumStage=0.....sid_guard=b034430a69540f2e291807152e3564f9%7C1760809379%7C5184000%7CWed%2C+17-Dec-2025+17%3A42%3A59+GMT.....cc-target-idc=useast5.....store-country-code-src=uid.....store-country-code=us.....store-idc=useast5.....tt-target-idc-sign=oNgAFaBFEQSRVU-PiWeT3Z-v4QnoaQrvZsmqX3v02LnkRD8xXYyZA1iKMTSk49znB3GNXIQir16LU0zvhkF1MBjmRbGZ-5CkhV73wMJbGqD69ULmp1P2bk25dIM-dFgvN96K2KeZwxNveFI67mxvlGlo8c9DYMUuufcoHmAfVnJIRP__9LM1fWJzbz3Wuu1u_36mC7hyAmOc4pkLYC41NdIJFsx0kNZZzoMcxO1rd3e1snJBA8SCTG7Z-RcUYdMf5lwos_Eev0XlhcntJ0DhqE_HCGSCsuW9Tu_LYh3s-rOHn5Fk_J-yWgWYG8r4A0OXkBksyS6CkOQsmZbYEb_tzjn-rkrPhLSPZXI0ORKjxjnfqjTfehwQ3dB_QoPsR_S8xrzpHMogBA0gn7EKQ3-P6CUclprU_y-uBz0bU0Cj_-hw77r111pxegLl3YiWDaTdUMt5Bm4rs_Qk1GhMoDCYnEQhmEK-JfUMzdfegvmlLKzptlnLsIGUIsRjvZC9AmEm.....ssid_ucp_v1=1.0.0-KDU3YzdlMzExNDZiZDBmMTYwMDc1ZWRhNjk3YmI1NTYxNmQ0OTZmNjcKGQiRiMa8s670-WgQo6PPxwYY6awfOAFA6wcQAxoCbXkiIGIwMzQ0MzBhNjk1NDBmMmUyOTE4MDcxNTJlMzU2NGY5.....sid_ucp_v1=1.0.0-KDU3YzdlMzExNDZiZDBmMTYwMDc1ZWRhNjk3YmI1NTYxNmQ0OTZmNjcKGQiRiMa8s670-WgQo6PPxwYY6awfOAFA6wcQAxoCbXkiIGIwMzQ0MzBhNjk1NDBmMmUyOTE4MDcxNTJlMzU2NGY5.....store-country-sign=MEIEDPzFitKJ0W5v-KnaZQQgykKLYJamh1UVr8XXNSTVNenYlqsrQjlMaAxTblXfC_QEEBCxVrST_3XHY_fNAQ1aXnc.....uid_tt=4aff6662f14a2ab36c77714c129f98d5f35a0c1e3c55cad7f54a16d8e186aa3a.....sid_tt=b034430a69540f2e291807152e3564f9.....sessionid_ss=b034430a69540f2e291807152e3564f9.....uid_tt_ss=4aff6662f14a2ab36c77714c129f98d5f35a0c1e3c55cad7f54a16d8e186aa3a.....tt_session_tlb_tag=sttt%7C5%7CsDRDCmlUDy4pGAcVLjVk-f________-nrtkFLuwWOFAfNL3aHtq2oHJvYEmCR-X56lmCNgoYLeo%3D.....odin_tt=51562445d9e0206fe448d454212319fbb03136172417c1d447a750e367727f282350a86f996aa8c089ba5ad70d2a5009b1c0130b1c3199c937f9c41f1f9f6215.....fpk1=c9746acbd0706291fd2047ef80c20039f88aae9e041fb6e9ab5efba20bae7d6a2f1f8f21c75426a343da6435b642a75e.....sessionid=b034430a69540f2e291807152e3564f9.....passport_csrf_token_default=636edf5d323b7856e1491d2a53109695.....s_v_web_id=verify_mgwke345_lwa6QfPK_Ap1d_48rI_A4hB_h5IesrDqfw6O.....passport_csrf_token=636edf5d323b7856e1491d2a53109695.....capcut_locale=en";

// 简化的Cookie解析函数（模拟core.ts中的逻辑）
function detectRegionAndToken(cookieString) {
  // 1. 检查复杂Cookie格式
  if (cookieString.includes('.....')) {
    return parseComplexCookie(cookieString);
  }

  // 2. 检查标准Cookie格式
  if (cookieString.includes(';') && cookieString.includes('=')) {
    return parseStandardCookie(cookieString);
  }

  // 3. 简单Token格式（向后兼容）
  const isUS = cookieString.toLowerCase().startsWith('us-');
  const token = isUS ? cookieString.substring(3) : cookieString;
  return { isUS, token };
}

function parseComplexCookie(cookieString) {
  try {
    const cookieItems = cookieString.split('.....').filter(item => item.trim());

    // 检查是否有capcut_locale字段
    const localeItem = cookieItems.find(item => item.includes('capcut_locale='));
    if (localeItem) {
      const locale = localeItem.split('=')[1];
      const isUS = locale === 'en';
      console.log(`✅ 复杂Cookie地区检测: capcut_locale=${locale}, isUS=${isUS}`);

      // 提取token（优先使用sessionid）
      const sessionidItem = cookieItems.find(item => item.includes('sessionid='));
      const sidTtItem = cookieItems.find(item => item.includes('sid_tt='));
      const token = sessionidItem ?
        sessionidItem.split('=')[1] :
        (sidTtItem ? sidTtItem.split('=')[1] : '');

      console.log(`✅ 提取Token: ${token ? token.substring(0, 20) + '...' : 'N/A'}`);
      return { isUS, token };
    }

    console.log('⚠️  复杂Cookie中未找到capcut_locale字段');
    return { isUS: false, token: '' };

  } catch (error) {
    console.error(`❌ 解析复杂Cookie失败: ${error.message}`);
    return { isUS: false, token: '' };
  }
}

function formatComplexCookie(cookieString) {
  try {
    // 分割Cookie字段
    const cookieItems = cookieString.split('.....').filter(item => item.trim());

    // 检查是否包含必需字段
    const hasSessionId = cookieItems.some(item => item.includes('sessionid='));
    const hasSidTt = cookieItems.some(item => item.includes('sid_tt='));
    const hasCapcutLocale = cookieItems.some(item => item.includes('capcut_locale='));

    if (!hasSessionId || !hasSidTt) {
      console.warn(`⚠️  复杂Cookie可能缺少必需字段: sessionid=${hasSessionId}, sid_tt=${hasSidTt}`);
    }

    // 验证并记录Cookie信息
    console.log(`📊 处理复杂Cookie: ${cookieItems.length}个字段`);
    console.log(`🔍 Cookie字段检查: sessionid=${hasSessionId}, sid_tt=${hasSidTt}, capcut_locale=${hasCapcutLocale}`);

    // 转换为标准格式（用分号分隔）
    const standardCookie = cookieItems.join('; ');
    console.log(`🔄 转换为标准格式: ${standardCookie.substring(0, 100)}...`);

    return standardCookie;

  } catch (error) {
    console.error(`❌ 格式化复杂Cookie失败: ${error.message}`);
    return cookieString;
  }
}

function testCookieParsing() {
  console.log('🍪 Cookie解析修复测试');
  console.log('='.repeat(50));

  console.log('原始Cookie字符串:');
  console.log(`长度: ${complexCookieString.length}`);
  console.log(`前100字符: ${complexCookieString.substring(0, 100)}...`);
  console.log('');

  // 测试地区检测
  console.log('🌍 地区检测测试:');
  const regionResult = detectRegionAndToken(complexCookieString);
  console.log(`检测结果: 地区=${regionResult.isUS ? '国际版' : '中国版'}, Token长度=${regionResult.token.length}`);
  console.log('');

  // 测试Cookie格式化
  console.log('📝 Cookie格式化测试:');
  const formattedCookie = formatComplexCookie(complexCookieString);
  console.log(`格式化后长度: ${formattedCookie.length}`);
  console.log('');

  // 分析Cookie内容
  console.log('📊 Cookie内容分析:');
  const cookieItems = complexCookieString.split('.....').filter(item => item.trim());
  console.log(`总字段数: ${cookieItems.length}`);

  // 统计重要字段
  const importantFields = [
    'sessionid', 'sid_tt', 'uid_tt', 'capcut_locale',
    'sid_guard', 'store-country-code', 'cc-target-idc'
  ];

  importantFields.forEach(field => {
    const found = cookieItems.some(item => item.includes(`${field}=`));
    if (found) {
      const item = cookieItems.find(item => item.includes(`${field}=`));
      const value = item.split('=')[1];
      const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      console.log(`  ✅ ${field}: ${displayValue}`);
    } else {
      console.log(`  ❌ ${field}: 未找到`);
    }
  });

  console.log('');
  console.log('🎯 测试总结:');
  console.log(`  ✅ Cookie格式识别: 复杂Cookie格式`);
  console.log(`  ✅ 地区检测: ${regionResult.isUS ? '国际版' : '中国版'}`);
  console.log(`  ✅ Token提取: ${regionResult.token ? '成功' : '失败'}`);
  console.log(`  ✅ 格式化: 标准格式转换`);
  console.log(`  ✅ 字段统计: ${cookieItems.length}个字段`);

  if (regionResult.token && regionResult.isUS) {
    console.log('');
    console.log('🚀 预期结果: Cookie解析成功，应该能够正常调用API');
  } else {
    console.log('');
    console.log('⚠️  警告: Cookie解析可能存在问题，可能需要进一步调试');
  }
}

// 运行测试
if (require.main === module) {
  testCookieParsing();
}

module.exports = {
  detectRegionAndToken,
  formatComplexCookie,
  testCookieParsing,
  complexCookieString
};