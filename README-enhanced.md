# 即梦API - 增强版

> 基于即梦AI的免费图片和视频生成API服务，支持新的认证机制和多地址轮询功能

## 🆕 新特性

### 🔐 智能认证系统
- **新格式支持**: 支持完整cookie字符串（用"....."分隔）
- **自动地区检测**: 通过`capcut_locale`字段自动判断即梦中国/国际
- **向后兼容**: 完全兼容现有的refreshToken格式
- **缓存优化**: 智能认证信息缓存管理

### 🌐 多地址轮询
- **故障转移**: 支持多个备用API地址
- **负载均衡**: 随机、轮询、故障转移策略
- **动态配置**: 支持环境变量和配置文件
- **健康检查**: 自动URL可用性检测

### 🚀 增强功能
- **智能重试**: 根据错误类型智能重试
- **性能监控**: 请求性能统计和监控
- **错误处理**: 统一的错误处理和故障恢复
- **配置管理**: 灵活的配置系统

## 📦 快速开始

### 1. 安装和设置

```bash
# 克隆项目
git clone https://github.com/your-repo/jimeng-api.git
cd jimeng-api

# 安装依赖
npm install

# 设置配置文件
npm run setup:config    # 创建 config.yml
npm run setup:env      # 创建 .env 文件

# 构建项目
npm run build

# 验证配置
npm run validate:all

# 启动服务
npm start
```

### 2. 环境配置

创建 `.env` 文件：

```bash
# 服务配置
PORT=5566
HOST=0.0.0.0

# URL配置 - 支持多个地址用分号分隔
JIMENG_CN_URLS=https://jimeng.jianying.com
JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us;https://dreamina-api.us.capcut.com;https://api.dreamina.ai/us
IMAGEX_CN_URLS=https://imagex.bytedanceapi.com
IMAGEX_US_URLS=https://imagex16-normal-us-ttp.capcutapi.us
COMMERCE_US_URLS=https://commerce.us.capcut.com

# 认证配置
AUTH_CACHE_TTL=300000

# 日志配置
LOG_LEVEL=info
```

### 3. 配置文件

创建 `config.yml` 文件：

```yaml
urls:
  jimeng-cn:
    name: "即梦中国"
    urls: "https://jimeng.jianying.com"
    strategy: "random"
    timeout: 30000

  jimeng-us:
    name: "即梦国际"
    urls: "https://api-proxy-1.deno.dev/dreamina/us;https://dreamina-api.us.capcut.com"
    strategy: "round-robin"
    timeout: 30000
```

## 🔐 认证机制

### 新格式（推荐）

```javascript
// 生成cookie字符串
function generateCookieString(token, region = 'cn') {
  const cookieFields = {
    '_tea_web_id': '123456789',
    'sessionid': token,
    'capcut_locale': region === 'us' ? 'en' : 'zh-CN',
    // ... 其他字段
  };

  return Object.entries(cookieFields)
    .map(([key, value]) => `${key}=${value}`)
    .join('.....'); // 使用"....."作为分隔符
}

// 国际版cookie
const internationalCookie = generateCookieString('your-token', 'us');
// 输出: _tea_web_id=123456789.....sessionid=your-token.....capcut_locale=en

// 中国版cookie
const chinaCookie = generateCookieString('your-token', 'cn');
// 输出: _tea_web_id=123456789.....sessionid=your-token.....capcut_locale=zh-CN
```

### API调用示例

```javascript
import { request } from './api/controllers/core-enhanced';

// 使用新格式cookie
const response = await request(
  'POST',
  '/mweb/v1/aigc_draft/generate',
  internationalCookie, // cookie字符串
  {
    data: { /* 请求数据 */ },
    serviceType: 'jimeng'  // 指定服务类型
  }
);
```

### 向后兼容

```javascript
// 旧格式仍然支持
const refreshToken = "us-your-refresh-token-here";

const response = await request(
  'POST',
  '/mweb/v1/aigc_draft/generate',
  refreshToken, // 仍然可以使用refreshToken
  {
    data: { /* 请求数据 */ }
  }
);
```

## 🌐 URL配置

### 环境变量配置

```bash
# 多个URL用分号分隔
JIMENG_US_URLS="https://api1.example.com;https://api2.example.com;https://api3.example.com"

# 支持不同的负载均衡策略
# random: 随机选择
# round-robin: 轮询选择
# failover: 故障转移（使用第一个可用的）
```

### 代码中使用

```javascript
import { getJimengURL, getImageXURL } from './lib/config/url-manager';

// 自动选择最优URL
const jimengURL = getJimengURL('us');
const imagexURL = getImageXURL('cn');

// 在请求中指定服务类型
await request('POST', '/api/endpoint', cookieString, {
  serviceType: 'jimeng'  // 自动使用配置的jimeng URL
});
```

## 📚 API接口

### 图片生成

```javascript
import { generateImages } from './api/controllers/images';

const imageUrls = await generateImages(
  'jimeng-4.0',
  '一只可爱的猫咪在花园里玩耍',
  { ratio: '1:1', resolution: '2k' },
  cookieString  // 使用新的cookie字符串
);
```

### 视频生成

```javascript
import { generateVideo } from './api/controllers/videos';

const videoUrl = await generateVideo(
  'jimeng-video-3.0',
  '夕阳下的海滩',
  { width: 1024, height: 1024 },
  cookieString
);
```

### 图生图

```javascript
import { generateImageComposition } from './api/controllers/images';

const imageUrls = await generateImageComposition(
  'jimeng-4.0',
  '将这张图片改成油画风格',
  [inputImageBuffer],
  { ratio: '1:1', resolution: '2k' },
  cookieString
);
```

### 积分管理

```javascript
import { getCredit, receiveCredit } from './api/controllers/core-enhanced';

// 查询积分
const creditInfo = await getCredit(cookieString);

// 接收每日积分
const newBalance = await receiveCredit(cookieString);
```

## 🛠️ 开发工具

### 测试和验证

```bash
# 运行所有示例
npm run examples

# 测试认证功能
npm run test:auth

# 测试URL配置
npm run test:urls

# 测试cookie解析
npm run test:cookie-parse

# 健康检查
npm run health-check
```

### 示例代码

```bash
# 基础示例
npm run examples:basic

# 认证示例
npm run examples:auth

# URL管理示例
npm run examples:urls

# 性能监控示例
npm run examples
```

### 调试工具

```bash
# 生成示例cookie
npm run demo:cookie

# 测试认证流程
npm run demo:auth

# 查看URL配置
npm run demo:urls

# 启动监控模式
npm run dev:enhanced
```

## 🔧 配置选项

### URL策略配置

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `random` | 随机选择URL | 负载均衡 |
| `round-robin` | 轮询选择URL | 均匀分配 |
| `failover` | 故障转移 | 高可用性 |

### 服务类型

| 类型 | 说明 | 默认配置 |
|------|------|----------|
| `jimeng` | 即梦主服务 | 即梦中国/国际 |
| `imagex` | 图片存储服务 | ImageX中国/国际 |
| `commerce` | 商业服务 | 商业API |

### 地区配置

| 地区 | 语言 | 时区 | 货币 |
|------|------|------|------|
| `cn` | zh-CN | Asia/Shanghai | CNY |
| `us` | en-US | America/New_York | USD |

## 📊 监控和日志

### 性能监控

```javascript
import { AuthManager, URLManager } from './lib';

// 认证信息统计
const authStats = AuthManager.getInstance().getAuthStats();

// URL配置统计
const urlStats = URLManager.getInstance().getConfigStats();

console.log('认证缓存:', authStats);
console.log('URL配置:', urlStats);
```

### 日志级别

```bash
# 设置日志级别
export LOG_LEVEL=debug  # debug, info, warn, error

# 启用详细日志
export VERBOSE_LOGGING=true
```

## 🐳 Docker部署

### 构建镜像

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run

# 开发模式
npm run docker:dev
```

### Docker Compose

```yaml
version: '3.8'
services:
  jimeng-api:
    build: .
    ports:
      - "5566:5566"
    environment:
      - PORT=5566
      - LOG_LEVEL=info
      - JIMENG_US_URLS=https://api1.example.com;https://api2.example.com
    volumes:
      - ./config.yml:/app/config.yml
      - ./.env:/app/.env
```

## 🔄 迁移指南

### 从旧版本迁移

1. **保持现有代码兼容**：
   ```javascript
   // 旧代码无需修改
   const response = await request('POST', '/api/endpoint', refreshToken);
   ```

2. **逐步升级到新格式**：
   ```javascript
   // 逐步替换为新的cookie字符串
   const newCookieString = generateCookieString(token, detectRegion(refreshToken));
   const response = await request('POST', '/api/endpoint', newCookieString);
   ```

3. **配置多地址支持**：
   ```bash
   # 设置环境变量
   export JIMENG_US_URLS="https://api1.example.com;https://api2.example.com"
   ```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 GPL-3.0 许可证。详见 [LICENSE](LICENSE) 文件。

## 🆘 故障排除

### 常见问题

**Q: Cookie格式错误怎么办？**
```javascript
import { CookieManager } from './lib/auth/cookie-manager';

// 检查cookie格式
try {
  const parsed = CookieManager.parseCookie(cookieString);
  console.log('Cookie解析成功:', parsed.region);
} catch (error) {
  console.error('Cookie格式错误:', error.message);
}
```

**Q: URL不可用怎么办？**
```javascript
import { URLManager } from './lib/config/url-manager';

// 测试URL可用性
const urlManager = URLManager.getInstance();
const isAvailable = await urlManager.testURLAvailability('https://api.example.com');

if (!isAvailable) {
  console.log('URL不可用，尝试故障转移');
}
```

**Q: 如何切换地区？**
```javascript
// 方法1: 通过cookie中的capcut_locale字段自动判断
const cookieString = "sessionid=token.....capcut_locale=en.....";

// 方法2: 强制指定地区
const response = await request('POST', '/api/endpoint', cookieString, {
  region: 'us'  // 强制使用国际版
});
```

### 调试模式

```bash
# 启用调试模式
npm run debug

# 查看详细日志
LOG_LEVEL=debug npm start

# 监控认证和URL状态
npm run dev:enhanced
```

## 📈 性能优化建议

1. **使用多URL配置**：配置多个镜像地址提高可用性
2. **启用缓存**：合理设置认证缓存时间
3. **监控性能**：定期检查API响应时间和成功率
4. **故障转移**：配置故障转移策略保证服务连续性

## 🎯 路线图

- [x] 智能Cookie解析
- [x] 多地址轮询支持
- [x] 自动地区检测
- [x] 向后兼容性
- [x] 性能监控
- [ ] GraphQL支持
- [ ] WebSocket支持
- [ ] 批量操作优化
- [ ] 国际化支持

---

**注意**: 本增强版本完全向后兼容，您可以逐步迁移到新功能。如有问题，请提交Issue或联系开发团队。