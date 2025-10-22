# 即梦API - HuggingFace Space部署

## 🎨 部署说明

本项目基于预构建的Docker镜像 `ghcr.io/gdtiti/jimeng-api:latest` 进行部署。

## 📋 部署步骤

1. **复制文件到HF Space**
   - 将 `hf/` 目录下的所有文件复制到你的HuggingFace Space
   - 确保 `Spacefile.yaml` 配置正确

2. **配置环境变量** (可选)
   在Space设置页面可以配置以下环境变量：
   ```
   JIMENG_CN_URLS=https://jimeng.jianying.com
   JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us
   NODE_ENV=production
   ```

3. **启动部署**
   - 推送代码到HF Space
   - 系统会自动构建和启动服务

## 🌐 访问方式

- **Web界面**: `https://your-space.hf.space`
- **API端点**: `https://your-space.hf.space/v1/*`
- **健康检查**: `https://your-space.hf.space/ping`

## 📡 API使用

### 图像生成
```bash
curl -X POST https://your-space.hf.space/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-cookie-token" \
  -d '{
    "prompt": "美丽的少女，胶片感",
    "model": "jimeng-4.0",
    "ratio": "1:1",
    "resolution": "2k",
    "n": 1
  }'
```

### 支持的模型

**国内版:**
- `jimeng-4.0`, `jimeng-3.1`, `jimeng-3.0`, `jimeng-2.1`, `jimeng-xl-pro`

**国际版 (需要国际站Cookie):**
- `jimeng-4.0`, `jimeng-3.0`, `nanobanana` ✨

### Cookie格式

1. **国内站**: `sessionid=your_session_id`
2. **国际站(简单)**: `us-your_session_id`
3. **国际站(复杂)**: `sessionid=abc.....sid_tt=def.....capcut_locale=en.....`

## 🔧 技术架构

- **后端**: 预构建Docker镜像 (Node.js + TypeScript)
- **前端**: Flask + HTML/CSS/JavaScript
- **端口**:
  - Web界面: 7860 (HF标准)
  - API服务: 5100 (容器内部)

## ⚠️ 注意事项

- HF免费版有资源限制，建议同时处理不超过5个任务
- 图像生成通常需要30-120秒
- 国际站需要特殊的Cookie格式
- nanobanana模型固定使用1024x1024分辨率

## 🐛 故障排除

1. **服务连接失败**: 检查镜像是否正确启动
2. **生成失败**: 验证Cookie格式和有效性
3. **加载缓慢**: HF免费版性能限制，耐心等待

## 📄 许可证

MIT License