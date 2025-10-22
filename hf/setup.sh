#!/bin/bash

# 即梦API HF Space环境设置脚本
echo "🎨 设置即梦API HuggingFace Space环境..."

# 创建必要的目录
mkdir -p dist
mkdir -p public
mkdir -p logs

# 设置权限
chmod +x setup.sh

# 创建默认环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建默认环境变量..."
    cat > .env << EOF
# 即梦API HuggingFace Space配置
NODE_ENV=production
PORT=5100
HOST=0.0.0.0

# API地址配置
JIMENG_CN_URLS=https://jimeng.jianying.com
JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us
DREAMINA_CN_PROXY=https://jimeng.jianying.com/tech
DREAMINA_US_PROXY=https://api-proxy-1.deno.dev/dreamina/us

# 日志配置
LOG_LEVEL=info
LOG_FILE_ENABLED=false

# 性能配置
RATE_LIMIT_ENABLED=false
CACHE_ENABLED=true
CACHE_TTL=300

# 安全配置
CORS_ORIGINS=*
MAX_FILE_SIZE=104857600

# 请求配置
REQUEST_TIMEOUT=45000
MAX_RETRY_COUNT=3

# 默认配置
DEFAULT_REGION=cn
DEFAULT_IMAGE_MODEL=jimeng-4.0
DEFAULT_VIDEO_MODEL=jimeng-video-3.0
EOF
fi

echo "✅ 环境设置完成！"
echo ""
echo "📋 配置信息:"
echo "- Web界面端口: 7860"
echo "- API服务端口: 5100"
echo "- 预构建镜像: ghcr.io/gdtiti/jimeng-api:latest"
echo "- 支持模型: jimeng-4.0, jimeng-3.0, nanobanana ✨"
echo "- 支持复杂Cookie解析 ✅"
echo "- HF Space适配完成 🚀"