# 环境变量配置指南

## 📋 概述

本文档详细介绍了即梦API项目的环境变量配置，包括所有可配置选项、默认值和使用建议。

## 🚀 快速开始

### 方法一：快速配置（推荐新手）

```bash
# 复制快速开始配置
cp .env.quick-start .env

# 根据需要修改配置
nano .env

# 启动服务
npm install && npm run build && npm start
```

### 方法二：完整配置（推荐生产环境）

```bash
# 复制完整配置示例
cp .env.example .env

# 根据需要修改配置
nano .env

# 验证配置
npm run validate:all

# 启动服务
npm start
```

## 🔧 核心配置

### 基础服务配置

| 变量名 | 默认值 | 说明 | 建议 |
|--------|--------|------|------|
| `PORT` | 5566 | 服务端口 | 生产环境建议使用反向代理 |
| `HOST` | 0.0.0.0 | 绑定地址 | 生产环境建议使用0.0.0.0 |
| `NODE_ENV` | production | 运行环境 | 生产环境使用production |
| `LOG_LEVEL` | info | 日志级别 | 开发使用debug，生产使用info |

### URL配置（重要）

#### 即梦服务URL

```bash
# 中国版（通常只有一个官方地址）
JIMENG_CN_URLS=https://jimeng.jianying.com

# 国际版（支持多个镜像地址，强烈建议配置多个）
JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us;https://dreamina-api.us.capcut.com;https://api.dreamina.ai/us;https://backup-api.dreamina.com/us
```

**配置建议**：
- 国际版务必配置多个URL，提高可用性
- 使用分号(`;`)分隔多个URL
- 将最快的URL放在前面

#### 图片存储服务URL

```bash
# 中国版ImageX
IMAGEX_CN_URLS=https://imagex.bytedanceapi.com;https://imagex-alternate.bytedanceapi.com

# 国际版ImageX
IMAGEX_US_URLS=https://imagex16-normal-us-ttp.capcutapi.us;https://imagex-backup.capcutapi.us
```

#### 商业服务URL

```bash
# 主要用于积分相关功能
COMMERCE_US_URLS=https://commerce.us.capcut.com;https://commerce-backup.capcut.com
```

### 认证配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `AUTH_CACHE_TTL` | 300000 | 认证缓存时间（5分钟） |
| `COOKIE_CACHE_TTL` | 300000 | Cookie缓存时间 |
| `USER_INFO_CACHE_TTL` | 600000 | 用户信息缓存时间（10分钟） |
| `CREDIT_INFO_CACHE_TTL` | 30000 | 积分信息缓存时间（30秒） |

## 🔒 安全配置

### 文件上传安全

```bash
# 最大文件大小（100MB）
MAX_FILE_SIZE=104857600

# 支持的文件类型
ALLOWED_FILE_TYPES=jpg,jpeg,png,webp,gif,bmp,tiff,heic,avif

# 请求验证
ENABLE_REQUEST_VALIDATION=true
ENABLE_RATE_LIMITING=true
```

### CORS配置

```bash
# 允许的源（生产环境建议指定具体域名）
CORS_ALLOWED_ORIGINS=*

# 允许的方法
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS

# 允许的头部
CORS_ALLOWED_HEADERS=Content-Type,Authorization
```

## ⚡ 性能配置

### 请求配置

```bash
# 请求超时时间（45秒）
REQUEST_TIMEOUT=45000

# 重试配置
MAX_RETRY_COUNT=3
RETRY_DELAY=5000
RETRY_BACKOFF_MULTIPLIER=2
```

### 缓存配置

```bash
# 生成结果缓存
RESULT_CACHE_SUCCESS_TTL=3600000    # 1小时
RESULT_CACHE_FAILURE_TTL=300000     # 5分钟

# 模型配置缓存
MODEL_CONFIG_CACHE_TTL=1800000      # 30分钟
```

### 并发限制

```bash
# 并发连接数限制
MAX_CONCURRENT_CONNECTIONS=100

# 每IP每分钟最大请求数
MINUTE_REQUEST_LIMIT_PER_IP=60

# 每用户每日最大请求数
DAILY_REQUEST_LIMIT_PER_USER=1000
```

## 🌐 URL管理配置

### 负载均衡策略

系统支持三种URL选择策略，通过URL管理器配置：

1. **random** - 随机选择（默认推荐）
2. **round-robin** - 轮询选择
3. **failover** - 故障转移

### URL健康检查

```bash
# 健康检查间隔（5分钟）
URL_HEALTH_CHECK_INTERVAL=300000

# 健康检查超时（5秒）
URL_HEALTH_CHECK_TIMEOUT=5000

# 默认策略
DEFAULT_URL_STRATEGY=random
```

## 📊 监控配置

### 性能监控

```bash
# 启用性能监控
ENABLE_PERFORMANCE_MONITORING=true

# 指标收集间隔（1分钟）
METRICS_COLLECTION_INTERVAL=60000

# 启用健康检查
ENABLE_HEALTH_CHECK=true
```

### 日志配置

```bash
# 日志文件路径
LOG_FILE_PATH=./logs/app.log
ERROR_LOG_FILE_PATH=./logs/error.log
ACCESS_LOG_FILE_PATH=./logs/access.log

# 日志轮转
LOG_MAX_FILE_SIZE=10485760    # 10MB
LOG_MAX_FILES=5
```

## 🧪 开发和调试

### 开发模式

```bash
# 调试模式
DEBUG_MODE=false

# 模拟模式
MOCK_MODE=false

# 详细日志
VERBOSE_LOGGING=false

# 热重载
ENABLE_HOT_RELOAD=false
```

### API文档

```bash
# 启用API文档
ENABLE_API_DOCS=true
API_DOCS_PATH=/docs

# Swagger UI
ENABLE_SWAGGER_UI=true
SWAGGER_UI_PATH=/swagger
```

## 🌍 地区配置

### 默认地区设置

```bash
# 默认地区 (cn, us)
DEFAULT_REGION=cn

# 语言配置
DEFAULT_LANGUAGE_CN=zh-CN
DEFAULT_LANGUAGE_US=en-US

# 时区配置
TIMEZONE_CN=Asia/Shanghai
TIMEZONE_US=America/New_York
```

## 🎛️ 功能开关

```bash
# 功能开关
ENABLE_FAILOVER=true
ENABLE_REQUEST_CACHE=true
ENABLE_SMART_RETRY=true
ENABLE_BATCH_OPERATIONS=true
ENABLE_PERFORMANCE_OPTIMIZATION=true

# 实验性功能
ENABLE_EXPERIMENTAL_FEATURES=false
```

## 🐳 Docker配置

```bash
# Docker配置
DOCKER_CONTAINER_NAME=jimeng-api
DOCKER_IMAGE_TAG=latest
DOCKER_NETWORK=bridge
```

## 📧 通知配置

```bash
# 错误通知
ERROR_NOTIFICATION_EMAIL=admin@example.com
ADMIN_EMAIL=admin@example.com

# Webhook通知
NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/your-webhook
```

## 🔒 安全最佳实践

### 生产环境安全配置

```bash
# 严格的CORS配置
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# 启用安全特性
ENABLE_REQUEST_VALIDATION=true
ENABLE_RATE_LIMITING=true

# 限制文件类型
ALLOWED_FILE_TYPES=jpg,jpeg,png,webp

# 限制文件大小
MAX_FILE_SIZE=52428800  # 50MB

# 速率限制
MINUTE_REQUEST_LIMIT_PER_IP=30
DAILY_REQUEST_LIMIT_PER_USER=500
```

### 监控和告警

```bash
# 性能监控阈值
EVENT_LOOP_DELAY_THRESHOLD=100
MEMORY_USAGE_WARNING_THRESHOLD=80
CPU_USAGE_WARNING_THRESHOLD=80
RESPONSE_TIME_WARNING_THRESHOLD=3000
```

## 📋 配置检查清单

### 基础配置检查
- [ ] 设置正确的PORT和HOST
- [ ] 配置LOG_LEVEL（生产环境使用info）
- [ ] 设置NODE_ENV=production

### URL配置检查
- [ ] 配置JIMENG_CN_URLS
- [ ] 配置JIMENG_US_URLS（建议多个地址）
- [ ] 配置IMAGEX_CN_URLS和IMAGEX_US_URLS
- [ ] 配置COMMERCE_US_URLS

### 安全配置检查
- [ ] 设置MAX_FILE_SIZE
- [ ] 配置ALLOWED_FILE_TYPES
- [ ] 启用ENABLE_REQUEST_VALIDATION
- [ ] 配置CORS_ALLOWED_ORIGINS（生产环境）

### 性能配置检查
- [ ] 设置合理的REQUEST_TIMEOUT
- [ ] 配置重试参数
- [ ] 启用缓存功能
- [ ] 设置并发限制

### 监控配置检查
- [ ] 启用ENABLE_PERFORMANCE_MONITORING
- [ ] 配置日志文件路径
- [ ] 设置监控阈值
- [ ] 配置通知方式

## 🔄 配置验证

### 自动验证脚本

```bash
# 验证所有配置
npm run validate:all

# 单独验证各模块
npm run config:validate    # URL配置验证
npm run health-check        # URL健康检查
npm run test:auth           # 认证功能测试
npm run test:urls           # URL配置测试
```

### 手动验证步骤

1. **基础验证**
   ```bash
   node -e "console.log('PORT:', process.env.PORT)"
   node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"
   ```

2. **URL配置验证**
   ```bash
   node -e "console.log('JIMENG_US_URLS:', process.env.JIMENG_US_URLS)"
   node -e "console.log('JIMENG_CN_URLS:', process.env.JIMENG_CN_URLS)"
   ```

3. **功能验证**
   ```bash
   npm run test:cookie-parse
   npm run demo:cookie
   npm run demo:urls
   ```

## 🆘 故障排除

### 常见配置问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :5566

   # 修改端口
   PORT=8080 npm start
   ```

2. **URL不可用**
   ```bash
   # 测试URL可用性
   npm run test:urls

   # 检查URL配置
   npm run config:validate
   ```

3. **认证问题**
   ```bash
   # 测试cookie解析
   npm run test:cookie-parse

   # 检查认证缓存
   npm run demo:auth
   ```

### 配置调试

```bash
# 查看当前配置
npm run env:check

# 生成配置报告
npm run config:report

# 重置配置
npm run config:reset
```

## 📚 更多资源

- [完整配置示例](.env.example) - 所有配置选项的详细说明
- [快速开始配置](.env.quick-start) - 最小化配置，适合快速部署
- [新认证机制指南](.spec-workflow/接口文档/新认证机制使用指南.md) - 新功能使用方法
- [使用示例](examples/usage-examples.js) - 详细的代码示例

## 💡 配置建议

### 开发环境
```bash
# 使用快速配置
cp .env.quick-start .env

# 启用调试功能
DEBUG_MODE=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

### 测试环境
```bash
# 使用完整配置
cp .env.example .env

# 启用监控
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_HEALTH_CHECK=true
```

### 生产环境
```bash
# 使用完整配置并调整安全参数
cp .env.example .env

# 安全配置
ENABLE_REQUEST_VALIDATION=true
ENABLE_RATE_LIMITING=true
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# 性能优化
ENABLE_PERFORMANCE_OPTIMIZATION=true
ENABLE_REQUEST_CACHE=true
```

---

**注意**: 修改环境变量后需要重启服务才能生效。建议在修改配置前备份当前配置。