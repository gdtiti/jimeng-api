# HuggingFace Space部署指南

## 🎯 快速部署

### 1. 创建Space

1. 访问 [HuggingFace Spaces](https://huggingface.co/spaces)
2. 点击 "Create new Space"
3. 配置如下：
   - **Space name**: `jimeng-api`
   - **License**: MIT
   - **Space Hardware**: CPU Basic (免费)
   - **SDK**: Docker

### 2. 上传文件

将以下文件上传到你的Space：

```
hf/
├── Dockerfile          # Docker配置
├── app.py              # Flask应用
├── requirements.txt    # Python依赖
├── setup.sh           # 环境设置脚本
├── .dockerignore      # Docker忽略文件
└── README.md          # 项目说明
```

### 3. 构建和部署

上传完成后，HuggingFace会自动：
1. 构建Docker镜像
2. 启动容器
3. 部署Web应用

## 🔧 环境变量配置

在Space设置中添加以下环境变量：

### 基础配置
```bash
PORT=7860
HOST=0.0.0.0
NODE_ENV=production
```

### API配置
```bash
JIMENG_CN_URLS=https://jimeng.jianying.com
JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us
DREAMINA_CN_PROXY=https://jimeng.jianying.com/tech
DREAMINA_US_PROXY=https://api-proxy-1.deno.dev/dreamina/us
```

### 认证配置（可选）
```bash
DEFAULT_TOKEN_CN=your-china-token
DEFAULT_TOKEN_US=your-us-token
```

### 性能配置
```bash
LOG_LEVEL=info
RATE_LIMIT_ENABLED=false
CACHE_ENABLED=true
CORS_ORIGINS=*
```

## 📱 访问应用

部署完成后，可以通过以下方式访问：

- **Web界面**: `https://your-username-jimeng-api.hf.space`
- **API端点**: `https://your-username-jimeng-api.hf.space/v1/`
- **健康检查**: `https://your-username-jimeng-api.hf.space/ping`

## 🧪 测试API

### 健康检查
```bash
curl https://your-username-jimeng-api.hf.space/ping
```

### 图像生成
```bash
curl -X POST https://your-username-jimeng-api.hf.space/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-cookie-token" \
  -d '{
    "prompt": "美丽的少女，胶片感",
    "model": "jimeng-4.0",
    "size": "1024x1024",
    "n": 1
  }'
```

## 🔍 故障排除

### 常见问题

1. **构建失败**
   - 检查Dockerfile语法
   - 确认所有文件都已上传
   - 查看构建日志

2. **服务启动失败**
   - 检查环境变量配置
   - 查看Space运行日志
   - 确认端口配置正确

3. **API调用失败**
   - 检查Token是否有效
   - 确认API地址配置正确
   - 查看详细错误信息

### 日志查看

在Space页面中可以查看：
- 构建日志
- 运行日志
- 错误信息

## 📊 监控

### 健康检查端点
- `/ping` - 基础健康检查
- `/health` - 详细健康信息

### 监控指标
- 服务状态
- 响应时间
- 错误率

## 🔄 更新部署

### 更新代码
1. 修改本地代码
2. 重新构建dist目录
3. 更新Space中的文件
4. 自动重新部署

### 环境变量更新
1. 在Space设置中修改环境变量
2. 重启Space使更改生效

## 🛡️ 安全注意事项

1. **Token安全**
   - 不要在代码中硬编码Token
   - 使用Space Secrets存储敏感信息
   - 定期更新Token

2. **访问控制**
   - 配置适当的CORS设置
   - 启用速率限制（如需要）
   - 监控API使用情况

## 📈 性能优化

### 硬件升级
- **CPU Basic**: 适合测试和小规模使用
- **CPU Upgrade**: 更好的性能和并发处理能力

### 缓存策略
- 启用响应缓存
- 配置适当的缓存过期时间
- 监控缓存命中率

## 💡 使用建议

1. **Token管理**
   - 使用长期有效的Cookie Token
   - 定期检查Token状态
   - 备份重要Token

2. **请求优化**
   - 使用合适的分辨率
   - 避免过长的提示词
   - 合理设置请求频率

3. **监控维护**
   - 定期检查服务状态
   - 监控资源使用情况
   - 及时处理异常情况

## 🆘 获取帮助

如果遇到问题，可以：

1. 查看HuggingFace Space文档
2. 检查���目GitHub Issues
3. 参考API文档
4. 联系项目维护者

## 📄 许可证

MIT License