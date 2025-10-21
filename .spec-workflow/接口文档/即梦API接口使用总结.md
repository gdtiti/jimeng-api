# 即梦API接口使用总结

## 项目概述

当前项目使用了即梦国际和即梦中国的多个API接口，实现图片生成、视频生成、图生图等功能。本文档提供了所有接口的完整使用指南和最佳实践。

## 接口分类

### 1. 图片上传流程接口

#### 1.1 获取上传令牌接口
- **接口**: `/mweb/v1/get_upload_token`
- **用途**: 获取AWS S3认证凭证
- **支持区域**: 即梦中国、即梦国际
- **文档**: [获取上传令牌接口文档](./获取上传令牌接口.md)

#### 1.2 申请图片上传权限接口
- **接口**: `/?Action=ApplyImageUpload&Version=2018-08-01`
- **用途**: 申请具体上传权限，获取上传地址
- **服务**: AWS ImageX
- **文档**: [申请图片上传权限接口文档](./申请图片上传权限接口.md)

#### 1.3 图片文件上传接口
- **接口**: `/upload/v1/{store_uri}`
- **用途**: 上传图片文件到ImageX存储
- **文档**: [图片文件上传接口文档](./图片文件上传接口.md)

#### 1.4 提交图片上传接口
- **接口**: `/?Action=CommitImageUpload&Version=2018-08-01`
- **用途**: 确认上传完成，获取最终图片URI
- **文档**: [提交图片上传接口文档](./提交图片上传接口.md)

### 2. AIGC生成接口

#### 2.1 AIGC草稿生成接口
- **接口**: `/mweb/v1/aigc_draft/generate`
- **用途**: 创建图片/视频生成任务
- **支持功能**: 图片生成、视频生成、图生图、多图生成
- **文档**: [AIGC草稿生成接口文档](./AIGC草稿生成接口.md)

#### 2.2 历史记录查询接口
- **接口**: `/mweb/v1/get_history_by_ids`
- **用途**: 查询生成任务状态和结果
- **文档**: [历史记录查询接口文档](./历史记录查询接口.md)

### 3. 用户管理接口

#### 3.1 用户账户信息接口
- **接口**: `/passport/account/info/v2`
- **用途**: 验证token、获取用户信息、检查权限
- **文档**: [用户账户信息接口文档](./用户账户信息接口.md)

#### 3.2 积分信息查询接口
- **接口**: `/commerce/v1/benefits/user_credit`
- **用途**: 查询用户积分状态
- **文档**: [积分信息查询接口文档](./积分信息查询接口.md)

#### 3.3 接收积分接口
- **接口**: `/commerce/v1/benefits/credit_receive`
- **用途**: 领取每日积分奖励
- **文档**: [接收积分接口文档](./接收积分接口.md)

## 区域差异对比

### 即梦中国
- **基础URL**: `https://jimeng.jianying.com`
- **应用ID**: 513695
- **语言**: 中文
- **图片存储**: `https://imagex.bytedanceapi.com`
- **积分系统**: 积分 (Credit)
- **每日奖励**: 100积分

### 即梦国际
- **基础URL**: `https://api-proxy-1.deno.dev/dreamina/us`
- **应用ID**: 513641
- **语言**: 英文
- **图片存储**: `https://imagex16-normal-us-ttp.capcutapi.us`
- **积分系统**: Credits
- **Token前缀**: 需要添加"us-"前缀

## SessionID组织方式

### 中国版本
```javascript
const sessionid = refreshToken; // 直接使用refreshToken
```

### 国际版本
```javascript
const sessionid = refreshToken.startsWith('us-')
  ? refreshToken.substring(3)  // 去掉"us-"前缀
  : refreshToken;
```

### Cookie构建
```javascript
function generateCookie(refreshToken) {
  const isUS = refreshToken.toLowerCase().startsWith('us-');
  const token = isUS ? refreshToken.substring(3) : refreshToken;

  return [
    `_tea_web_id=${WEB_ID}`,
    `is_staff_user=false`,
    `store-region=${isUS ? 'us' : 'cn-gd'}`,
    `store-region-src=uid`,
    `sid_guard=${token}%7C${timestamp}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
    `uid_tt=${USER_ID}`,
    `uid_tt_ss=${USER_ID}`,
    `sid_tt=${token}`,
    `sessionid=${token}`,
    `sessionid_ss=${token}`
  ].join("; ");
}
```

## 完整使用流程

### 图片生成流程

```javascript
async function generateImageWorkflow(prompt, refreshToken, options = {}) {
  try {
    // 1. 验证token
    const userInfo = await getUserAccountInfo(refreshToken);

    // 2. 检查积分
    const creditInfo = await getCreditInfo(refreshToken);
    if (creditInfo.credit.total_credit <= 0) {
      await receiveCredit(refreshToken);
    }

    // 3. 生成AIGC草稿
    const draftResult = await generateImageDraft(prompt, refreshToken, options);
    const historyId = draftResult.aigc_data.history_record_id;

    // 4. 轮询查询结果
    const finalResult = await pollGenerationResult(historyId, refreshToken);

    // 5. 提取图片URL
    const imageUrls = extractImageUrls(finalResult);

    return imageUrls;
  } catch (error) {
    console.error('图片生成失败:', error);
    throw error;
  }
}
```

### 图生图流程

```javascript
async function generateImageWithImages(prompt, images, refreshToken, options = {}) {
  try {
    // 1. 上传输入图片
    const uploadedImages = [];
    for (const image of images) {
      const imageUri = await uploadImageWorkflow(image, refreshToken);
      uploadedImages.push(imageUri);
    }

    // 2. 生成图生图草稿
    const draftResult = await generateImageCompositionDraft(
      prompt,
      uploadedImages,
      refreshToken,
      options
    );

    // 3. 轮询查询结果
    const finalResult = await pollGenerationResult(
      draftResult.aigc_data.history_record_id,
      refreshToken
    );

    // 4. 提取图片URL
    const imageUrls = extractImageUrls(finalResult);

    return imageUrls;
  } catch (error) {
    console.error('图生图失败:', error);
    throw error;
  }
}
```

### 视频生成流程

```javascript
async function generateVideoWorkflow(prompt, refreshToken, options = {}) {
  try {
    // 1. 准备首帧/尾帧图片
    let firstFrameImage, endFrameImage;

    if (options.firstFrameImage) {
      firstFrameImage = await uploadImageWorkflow(options.firstFrameImage, refreshToken);
    }

    if (options.endFrameImage) {
      endFrameImage = await uploadImageWorkflow(options.endFrameImage, refreshToken);
    }

    // 2. 生成视频草稿
    const draftResult = await generateVideoDraft(prompt, refreshToken, {
      ...options,
      firstFrameImage,
      endFrameImage
    });

    // 3. 轮询查询结果（视频生成时间较长）
    const finalResult = await pollGenerationResult(
      draftResult.aigc_data.history_record_id,
      refreshToken,
      'video' // 指定为视频查询
    );

    // 4. 提取视频URL
    const videoUrls = extractVideoUrls(finalResult);

    return videoUrls[0]; // 返回第一个视频URL
  } catch (error) {
    console.error('视频生成失败:', error);
    throw error;
  }
}
```

## 图片上传完整流程

```javascript
async function uploadImageWorkflow(imageInput, refreshToken) {
  try {
    // 1. 获取上传令牌
    const tokenResult = await getUploadToken(refreshToken);

    // 2. 申请上传权限
    const applyResult = await applyImageUpload(
      getImageSize(imageInput),
      tokenResult
    );

    // 3. 上传图片文件
    await uploadImageFile(
      applyResult.UploadAddress.UploadHosts[0],
      applyResult.UploadAddress.StoreInfos[0].StoreUri,
      applyResult.UploadAddress.StoreInfos[0].Auth,
      imageInput
    );

    // 4. 提交上传
    const commitResult = await commitImageUpload(
      tokenResult.service_id,
      applyResult.UploadAddress.SessionKey,
      tokenResult
    );

    // 5. 返回图片URI
    return commitResult.Result.Results[0].Uri;
  } catch (error) {
    console.error('图片上传失败:', error);
    throw error;
  }
}
```

## 错误处理最佳实践

### 统一错误处理

```javascript
class JimengAPIError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'JimengAPIError';
    this.code = code;
    this.context = context;
  }
}

async function handleAPIRequest(requestFn, ...args) {
  try {
    return await requestFn(...args);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          throw new JimengAPIError('认证失败，请检查token', 'AUTH_FAILED', { status, data });
        case 403:
          throw new JimengAPIError('权限不足', 'PERMISSION_DENIED', { status, data });
        case 429:
          throw new JimengAPIError('请求过于频繁，请稍后重试', 'RATE_LIMIT', { status, data });
        case 500:
          throw new JimengAPIError('服务器内部错误', 'SERVER_ERROR', { status, data });
        default:
          throw new JimengAPIError(`API请求失败: ${data?.errmsg || error.message}`, 'API_ERROR', { status, data });
      }
    } else {
      throw new JimengAPIError(`网络错误: ${error.message}`, 'NETWORK_ERROR', { originalError: error });
    }
  }
}
```

### 重试机制

```javascript
async function retryOperation(operation, maxRetries = 3, backoffMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // 判断是否可重试
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = backoffMs * Math.pow(2, attempt - 1);
      console.log(`操作失败，${delay}ms后重试 (${attempt}/${maxRetries}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function isRetryableError(error) {
  const retryableCodes = ['NETWORK_ERROR', 'SERVER_ERROR', 'RATE_LIMIT'];
  return retryableCodes.includes(error.code) ||
         error.message.includes('timeout') ||
         error.message.includes('connection');
}
```

## 性能优化建议

### 1. 缓存策略
- 用户信息缓存10分钟
- 积分信息缓存30秒
- 生成结果根据状态设置不同缓存时间

### 2. 并发控制
- 图片上传并发数不超过3个
- API查询并发数不超过5个
- 实现请求队列管理

### 3. 资源管理
- 及时清理过期缓存
- 监控内存使用情况
- 实现连接池管理

## 监控指标

### 关键指标
- API请求成功率
- 平均响应时间
- 生成任务完成率
- 积分消费统计
- 用户活跃度

### 日志记录
```javascript
const logger = {
  info: (message, context = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, context);
  },
  error: (message, error, context = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, {
      error: error.message,
      stack: error.stack,
      ...context
    });
  },
  warn: (message, context = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, context);
  }
};
```

## 安全考虑

1. **令牌保护**: 严格保护refreshToken，避免在日志中泄露
2. **HTTPS传输**: 所有API请求必须使用HTTPS
3. **参数验证**: 严格验证所有输入参数
4. **��率限制**: 实现合理的请求频率控制
5. **错误处理**: 避免在错误信息中泄露敏感数据
6. **缓存安全**: 设置合理的缓存过期时间

## 部署配置

### 环境变量
```bash
# 即梦中国
JIMENG_CN_BASE_URL=https://jimeng.jianying.com
JIMENG_CN_AID=513695

# 即梦国际
JIMENG_US_BASE_URL=https://api-proxy-1.deno.dev/dreamina/us
JIMENG_US_AID=513641

# 通用配置
DEFAULT_DEVICE_PLATFORM=web
DEFAULT_DA_VERSION=3.3.2
DEFAULT_WEB_VERSION=7.5.0
```

### 推荐配置
- Node.js 18+
- 内存: 至少512MB
- 超时设置: 请求45秒，生成任务最长20分钟
- 重试配置: 最大重试3次，指数退避

## 常见问题排查

### 1. Token失效
- 检查refreshToken格式
- 验证token是否过期
- 确认地区前缀是否正确

### 2. 图片上传失败
- 检查文件大小是否超限
- 验证文件格式是否支持
- 确认网络连接稳定

### 3. 生成任务超时
- 检查积分是否充足
- 验证提示词是否合规
- 确认模型是否可用

### 4. 权限不足
- 检查账户状态
- 验证VIP权限
- 确认地区限制

## 更新日志

### v1.0.0
- 完成所有基础接口文档
- 添加即梦国际支持
- 实现完整的错误处理机制
- 添加性能优化建议

---

**注意**: 本文档基于当前代码分析生成，实际API可能会有更新。建议定期检查官方文档和API变更通知。