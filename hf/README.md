# 即梦API - HuggingFace Space部署

## 🚀 项目介绍

这是即梦API的HuggingFace Space部署版本，提供免费的AI图像和视频生成服务，基于即梦AI的逆向工程实现，提供与OpenAI API兼容的接口格式。

## 🌟 功能特性

- ✨ **AI图像生成**: 支持多种风格和分辨率的图像生成
- 🎬 **AI视频生成**: 支持AI视频内容生成
- 🔄 **OpenAI兼容**: 提供与OpenAI API兼容的接口格式
- 🌍 **多地区支持**: 支持中国版和国际版API
- 🍪 **智能Cookie处理**: 支持复杂Cookie字符串解析
- 📊 **积分系统**: 完整的积分查询和收取功能
- 🔄 **智能重试**: 自动重试和错误恢复机制

## 🛠️ 技术栈

- **后端**: Node.js + TypeScript
- **框架**: Koa.js
- **部署**: HuggingFace Spaces
- **API**: RESTful API
- **缓存**: 内存缓存系统
- **日志**: 结构化日志记录

## 📋 部署说明

### 1. Fork项目到你的HuggingFace账户

1. 访问 [即梦API GitHub仓库](https://github.com/your-repo/jimeng-api)
2. 点击 "Fork" 按钮fork到你自己的账户
3. 在HuggingFace Space中创建新的Space

### 2. 创建HuggingFace Space

1. 访问 [HuggingFace Spaces](https://huggingface.co/spaces)
2. 点击 "Create new Space"
3. 选择以下配置：
   - **Space name**: `jimeng-api`
   - **License**: MIT
   - **Space Hardware**: CPU Basic (免费) 或 CPU Upgrade
   - **SDK**: Docker

### 3. 部署代码

#### 方案A: 通过Git部署
```bash
git clone https://github.com/your-username/jimeng-api.git
cd jimeng-api
git remote add space https://huggingface.co/spaces/your-username/jimeng-api
git subtree add --prefix hf origin/main
git push space main
```

#### 方案B: 直接上传文件
1. 将 `hf/` 目录下的所有文件上传到你的Space
2. Space会自动检测Docker配置并开始部署

### 4. 配置环境变量

在Space设置中添加以下环境变量：

```bash
# 服务配置
PORT=7860
HOST=0.0.0.0
NODE_ENV=production

# API地址配置
JIMENG_CN_URLS=https://jimeng.jianying.com
JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us
DREAMINA_CN_PROXY=https://jimeng.jianying.com/tech
DREAMINA_US_PROXY=https://api-proxy-1.deno.dev/dreamina/us

# 认证配置（可选）
DEFAULT_TOKEN_CN=
DEFAULT_TOKEN_US=

# 其他配置
LOG_LEVEL=info
RATE_LIMIT_ENABLED=false
CACHE_ENABLED=true
```

## 🎯 使用方法

### 1. 访问应用

部署完成后，访问你的Space URL：
`https://your-username-jimeng-api.hf.space`

### 2. API调用示例

```javascript
const API_BASE = 'https://your-username-jimeng-api.hf.space';

// 图像生成
fetch(`${API_BASE}/v1/images/generations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token-here' // 使用你的Cookie字符串
  },
  body: JSON.stringify({
    prompt: "美丽的少女，胶片感",
    model: "jimeng-4.0",
    n: 1,
    size: "1024x1024",
    response_format: "url"
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### 3. Cookie配置

支持多种Cookie格式：

```javascript
// 复杂Cookie格式（推荐）
const cookie = "_tea_web_id=abc.....sessionid=xyz.....capcut_locale=en.....";

// 标准Cookie格式
const cookie = "sessionid=xyz; capcut_locale=en; uid_tt=123";

// 简单Token格式（向后兼容）
const cookie = "us-your-token-here";
```

## 🔧 配置选项

### 环境变量说明

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `PORT` | 服务端口 | 7860 | 否 |
| `HOST` | 绑定地址 | 0.0.0.0 | 否 |
| `NODE_ENV` | 运行环境 | production | 否 |
| `JIMENG_CN_URLS` | 中国版API地址 | 见配置 | 是 |
| `JIMENG_US_URLS` | 国际版API地址 | 见配置 | 是 |
| `LOG_LEVEL` | 日志级别 | info | 否 |
| `RATE_LIMIT_ENABLED` | 启用速率限制 | false | 否 |

### 支持的图像模型

- `jimeng-4.0` - 高质量图像生成
- `jimeng-4.0-visual` - 视觉增强版
- `jimeng-4.0-anime` - 动漫风格

### 支持的分辨率

- `1k`: 1024x1024 (1:1), 1472x1104 (4:3), 1104x1472 (3:4)
- `2k`: 2048x2048 (1:1), 2560x1440 (16:9), 1440x2560 (9:16)
- `4k`: 4096x4096 (1:1), 4096x3072 (4:3), 3072x4096 (3:4)

## 📊 性能优化

### 缓存策略

- 生成结果缓存：1小时
- 用户信息缓存：10分钟
- 模型配置缓存：30分钟

### 速率限制

- 默认：禁用
- 可通过环境变量 `RATE_LIMIT_ENABLED=true` 启用
- 默认限制：100请求/分钟

## 🔍 监控和日志

### 日志查看

Space提供实时日志查看，可以监控：

- API请求状态
- 错误信息
- 性能指标
- 用户活动

### 健康检查

访问 `/ping` 端点检查服务状态：

```bash
curl https://your-username-jimeng-api.hf.space/ping
```

## ⚠️ 注意事项

### 1. 资源限制

HuggingFace Spaces免费版有以下限制：
- CPU: 2 vCPU
- 内存: 16GB
- 磁盘: 50GB
- 月度运行时间: 无限制

### 2. 并发限制

由于CPU限制，建议：
- 同时处理的生成任务不超过5个
- 大图像生成可能需要较长时间
- 建议使用较小的分辨率以获得更快响应

### 3. Token管理

- Cookie Token有有效期，需要定期更新
- 建议使用自动Token刷新机制
- 存储Token时注意安全

## 🛠️ 故障排除

### 常见问题

1. **服务启动失败**
   - 检查环境变量配置
   - 查看Space日志
   - 确认Docker镜像构建成功

2. **API调用失败**
   - 检查Token是否有效
   - 确认网络连接
   - 查看详细错误信息

3. **生成超时**
   - 降低分辨率
   - 减少并发请求数
   - 检查网络状况

### 调试模式

启用调试模式获取更多日志：

```bash
LOG_LEVEL=debug
```

## 📈 升级和维护

### 自动更新

Space会自动检测代码变更并重新部署：

1. 更新代码到GitHub仓库
2. Space会自动拉取最新代码
3. Docker容器会自动重启

### 手动重启

在Space控制台中可以手动重启服务。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- 即梦AI团队提供的API服务
- HuggingFace提供的部署平台
- 所有贡献者和用户的支持