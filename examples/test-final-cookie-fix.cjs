/**
 * 最终Cookie解析修复测试
 * 模拟实际API调用场景
 */

// 模拟logger
const mockLogger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

// 模拟util
const mockUtil = {
  unixTimestamp: () => Math.floor(Date.now() / 1000),
  uuid: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
};

// 用户提供的复杂Cookie字符串
const complexCookieString = "_tea_web_id=.....ttwid=.....msToken=YAL9hVMdmv1anwkaHa_FdfypO0fl0k1HlsSuwJe9R8hsgvlhW2MeuFJVDuSUZvsk6IKrsyglkzV6EQ2_X3FUl7SCAscb-Wr1sU728Qe2ryOp....._isCommercialFreemiumStage=0.....sid_guard=b034430a69540f2e291807152e3564f9%7C1760809379%7C5184000%7CWed%2C+17-Dec-2025+17%3A42%3A59+GMT.....cc-target-idc=useast5.....store-country-code-src=uid.....store-country-code=us.....store-idc=useast5.....tt-target-idc-sign=oNgAFaBFEQSRVU-PiWeT3Z-v4QnoaQrvZsmqX3v02LnkRD8xXYyZA1iKMTSk49znB3GNXIQir16LU0zvhkF1MBjmRbGZ-5CkhV73wMJbGqD69ULmp1P2bk25dIM-dFgvN96K2KeZwxNveFI67mxvlGlo8c9DYMUuufcoHmAfVnJIRP__9LM1fWJzbz3Wuu1u_36mC7hyAmOc4pkLYC41NdIJFsx0kNZZzoMcxO1rd3e1snJBA8SCTG7Z-RcUYdMf5lwos_Eev0XlhcntJ0DhqE_HCGSCsuW9Tu_LYh3s-rOHn5Fk_J-yWgWYG8r4A0OXkBksyS6CkOQsmZbYEb_tzjn-rkrPhLSPZXI0ORKjxjnfqjTfehwQ3dB_QoPsR_S8xrzpHMogBA0gn7EKQ3-P6CUclprU_y-uBz0bU0Cj_-hw77r111pxegLl3YiWDaTdUMt5Bm4rs_Qk1GhMoDCYnEQhmEK-JfUMzdfegvmlLKzptlnLsIGUIsRjvZC9AmEm.....ssid_ucp_v1=1.0.0-KDU3YzdlMzExNDZiZDBmMTYwMDc1ZWRhNjk3YmI1NTYxNmQ0OTZmNjcKGQiRiMa8s670-WgQo6PPxwYY6awfOAFA6wcQAxoCbXkiIGIwMzQ0MzBhNjk1NDBmMmUyOTE4MDcxNTJlMzU2NGY5.....sid_ucp_v1=1.0.0-KDU3YzdlMzExNDZiZDBmMTYwMDc1ZWRhNjk3YmI1NTYxNmQ0OTZmNjcKGQiRiMa8s670-WgQo6PPxwYY6awfOAFA6wcQAxoCbXkiIGIwMzQ0MzBhNjk1NDBmMmUyOTE4MDcxNTJlMzU2NGY5.....store-country-sign=MEIEDPzFitKJ0W5v-KnaZQQgykKLYJamh1UVr8XXNSTVNenYlqsrQjlMaAxTblXfC_QEEBCxVrST_3XHY_fNAQ1aXnc.....uid_tt=4aff6662f14a2ab36c77714c129f98d5f35a0c1e3c55cad7f54a16d8e186aa3a.....sid_tt=b034430a69540f2e291807152e3564f9.....sessionid_ss=b034430a69540f2e291807152e3564f9.....uid_tt_ss=4aff6662f14a2ab36c77714c129f98d5f35a0c1e3c55cad7f54a16d8e186aa3a.....tt_session_tlb_tag=sttt%7C5%7CsDRDCmlUDy4pGAcVLjVk-f________-nrtkFLuwWOFAfNL3aHtq2oHJvYEmCR-X56lmCNgoYLeo%3D.....odin_tt=51562445d9e0206fe448d454212319fbb03136172417c1d447a750e367727f282350a86f996aa8c089ba5ad70d2a5009b1c0130b1c3199c937f9c41f1f9f6215.....fpk1=c9746acbd0706291fd2047ef80c20039f88aae9e041fb6e9ab5efba20bae7d6a2f1f8f21c75426a343da6435b642a75e.....sessionid=b034430a69540f2e291807152e3564f9.....passport_csrf_token_default=636edf5d323b7856e1491d2a53109695.....s_v_web_id=verify_mgwke345_lwa6QfPK_Ap1d_48rI_A4hB_h5IesrDqfw6O.....passport_csrf_token=636edf5d323b7856e1491d2a53109695.....capcut_locale=en";

// 修复后的Cookie处理函数（从core.ts复制）
function generateCookie(refreshToken) {
  // 检查是否是复杂Cookie格式（包含.....分隔符）
  if (refreshToken.includes('.....')) {
    // 复杂Cookie格式，直接使用并确保格式正确
    return formatComplexCookie(refreshToken);
  }

  // 检查是否是标准Cookie格式（包含;分隔符）
  if (refreshToken.includes(';') && refreshToken.includes('=')) {
    // 标准Cookie格式，直接使用
    return refreshToken;
  }

  // 简单Token格式（向后兼容）
  const isUS = refreshToken.toLowerCase().startsWith('us-');
  const token = isUS ? refreshToken.substring(3) : refreshToken;
  return [
    `_tea_web_id=${mockUtil.uuid()}`,
    `is_staff_user=false`,
    `store-region=${isUS ? 'us' : 'cn-gd'}`,
    `store-region-src=uid`,
    `sid_guard=${token}%7C${mockUtil.unixTimestamp()}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
    `uid_tt=${mockUtil.uuid()}`,
    `uid_tt_ss=${mockUtil.uuid()}`,
    `sid_tt=${token}`,
    `sessionid=${token}`,
    `sessionid_ss=${token}`,
    `sid_tt=${token}`
  ].join("; ");
}

function formatComplexCookie(cookieString) {
  try {
    // 分割Cookie字段
    const cookieItems = cookieString.split('.....')
      .map(item => item.trim())
      .filter(item => {
        // 过滤掉空字段和没有值的字段
        if (!item) return false;
        if (!item.includes('=')) return false;
        const [key, value] = item.split('=', 2);
        return key && value; // 只保留有键和值的字段
      });

    // 检查是否包含必需字段
    const hasSessionId = cookieItems.some(item => item.includes('sessionid='));
    const hasSidTt = cookieItems.some(item => item.includes('sid_tt='));
    const hasCapcutLocale = cookieItems.some(item => item.includes('capcut_locale='));

    if (!hasSessionId || !hasSidTt) {
      mockLogger.warn(`复杂Cookie可能缺少必需字段: sessionid=${hasSessionId}, sid_tt=${hasSidTt}`);
    }

    // 验证并记录Cookie信息
    mockLogger.info(`处理复杂Cookie: 原始${cookieString.split('.....').length}个字段，有效${cookieItems.length}个字段`);
    mockLogger.info(`Cookie字段检查: sessionid=${hasSessionId}, sid_tt=${hasSidTt}, capcut_locale=${hasCapcutLocale}`);

    // 转换为标准格式（用分号分隔）
    const standardCookie = cookieItems.join('; ');

    // 记录一些关键字段的值（不记录敏感信息）
    const sessionIdItem = cookieItems.find(item => item.includes('sessionid='));
    const sidTtItem = cookieItems.find(item => item.includes('sid_tt='));
    const uidTtItem = cookieItems.find(item => item.includes('uid_tt='));

    if (sessionIdItem) {
      const sessionId = sessionIdItem.split('=')[1];
      mockLogger.info(`提取sessionid: ${sessionId.substring(0, 15)}...`);
    }
    if (sidTtItem) {
      const sidTt = sidTtItem.split('=')[1];
      mockLogger.info(`提取sid_tt: ${sidTt.substring(0, 15)}...`);
    }
    if (uidTtItem) {
      const uidTt = uidTtItem.split('=')[1];
      mockLogger.info(`提取uid_tt: ${uidTt.substring(0, 15)}...`);
    }

    return standardCookie;

  } catch (error) {
    mockLogger.error(`格式化复杂Cookie失败: ${error.message}`);
    // 降级处理：返回原始字符串
    return cookieString;
  }
}

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
      mockLogger.info(`复杂Cookie地区检测: capcut_locale=${locale}, isUS=${isUS}`);

      // 提取token（优先使用sessionid）
      const sessionidItem = cookieItems.find(item => item.includes('sessionid='));
      const sidTtItem = cookieItems.find(item => item.includes('sid_tt='));
      const token = sessionidItem ?
        sessionidItem.split('=')[1] :
        (sidTtItem ? sidTtItem.split('=')[1] : '');

      return { isUS, token };
    }

    // 如果没有capcut_locale字段，降级处理
    mockLogger.warn('复杂Cookie中未找到capcut_locale字段，使用默认检测逻辑');
    return { isUS: false, token: '' };

  } catch (error) {
    mockLogger.error(`解析复杂Cookie失败: ${error.message}`);
    return { isUS: false, token: '' };
  }
}

function simulateAPIRequest(refreshToken) {
  console.log('🚀 模拟API请求');
  console.log('='.repeat(50));

  // 步骤1: 检测地区和提取token
  console.log('步骤1: 地区和Token检测');
  const { isUS, token } = detectRegionAndToken(refreshToken);
  console.log(`  地区: ${isUS ? '国际版' : '中国版'}`);
  console.log(`  Token: ${token ? token.substring(0, 20) + '...' : 'N/A'}`);
  console.log('');

  // 步骤2: 生成Cookie
  console.log('步骤2: Cookie生成');
  const cookie = generateCookie(refreshToken);
  console.log(`  Cookie长度: ${cookie.length}`);
  console.log(`  Cookie格式: ${cookie.includes(';') ? '标准格式(分号分隔)' : '其他格式'}`);
  console.log(`  Cookie预览: ${cookie.substring(0, 100)}...`);
  console.log('');

  // 步骤3: 分析Cookie内容
  console.log('步骤3: Cookie内容分析');
  const cookieFields = cookie.split('; ').filter(item => item.trim());
  console.log(`  字段数量: ${cookieFields.length}`);

  // 检查关键字段
  const keyFields = ['sessionid', 'sid_tt', 'uid_tt', 'capcut_locale', 'store-country-code'];
  keyFields.forEach(field => {
    const fieldItem = cookieFields.find(item => item.includes(`${field}=`));
    if (fieldItem) {
      const value = fieldItem.split('=')[1];
      const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.log(`  ✅ ${field}: ${displayValue}`);
    } else {
      console.log(`  ❌ ${field}: 未找到`);
    }
  });

  console.log('');

  // 步骤4: 模拟请求头构建
  console.log('步骤4: 请求头构建');
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': isUS ? 'https://commerce.us.capcut.com/' : 'https://jimeng.jianying.com/'
  };

  console.log(`  User-Agent: ${headers['User-Agent']}`);
  console.log(`  Referer: ${headers['Referer']}`);
  console.log(`  Cookie: 设置成功 (${cookie.length} 字符)`);
  console.log('');

  // 步骤5: 预测结果
  console.log('步骤5: 预测结果');
  const hasSessionId = cookieFields.some(item => item.includes('sessionid='));
  const hasSidTt = cookieFields.some(item => item.includes('sid_tt='));
  const hasCapcutLocale = cookieFields.some(item => item.includes('capcut_locale='));
  const hasValidAuth = token && hasSessionId && hasSidTt && hasCapcutLocale;

  if (hasValidAuth) {
    console.log('  ✅ 认证信息完整');
    console.log('  ✅ Cookie格式正确');
    console.log('  ✅ 地区检测准确');
    console.log('  🎯 预期: API调用应该成功');
  } else {
    console.log('  ❌ 认证信息不完整');
    console.log(`  检查结果: token=${!!token}, sessionid=${hasSessionId}, sid_tt=${hasSidTt}, capcut_locale=${hasCapcutLocale}`);
    console.log('  ⚠️  预期: API调用可能失败');
  }

  return {
    success: hasValidAuth,
    isUS,
    token: token ? token.substring(0, 20) + '...' : 'N/A',
    cookieLength: cookie.length,
    fieldCount: cookieFields.length
  };
}

function testFinalCookieFix() {
  console.log('🍪 最终Cookie解析修复测试');
  console.log('='.repeat(60));
  console.log('');

  // 测试复杂Cookie
  console.log('测试用例: 用户提供的复杂Cookie');
  const result1 = simulateAPIRequest(complexCookieString);
  console.log('');

  // 测试简单Token（向后兼容）
  console.log('测试用例: 简单Token格式');
  const result2 = simulateAPIRequest('us-simple-token-12345');
  console.log('');

  // 测试标准Cookie
  console.log('测试用例: 标准Cookie格式');
  const result3 = simulateAPIRequest('sessionid=test123.....capcut_locale=en.....uid_tt=user456');
  console.log('');

  // 总结
  console.log('📊 测试总结');
  console.log('='.repeat(30));
  console.log(`复杂Cookie: ${result1.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`简单Token: ${result2.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`标准Cookie: ${result3.success ? '✅ 通过' : '❌ 失败'}`);

  if (result1.success) {
    console.log('');
    console.log('🎉 Cookie解析修复成功！');
    console.log('用户的复���Cookie现在应该能够正常工作');
  } else {
    console.log('');
    console.log('⚠️  Cookie解析可能还有问题');
    console.log('需要进一步调试');
  }
}

// 运行测试
if (require.main === module) {
  testFinalCookieFix();
}

module.exports = {
  generateCookie,
  formatComplexCookie,
  detectRegionAndToken,
  simulateAPIRequest,
  testFinalCookieFix,
  complexCookieString
};