#!/bin/bash

# HuggingFace Space部署脚本
echo "🚀 设置HuggingFace Space环境..."

# 创建必要的目录
mkdir -p dist
mkdir -p public

# 复制必要文件
echo "📁 复制应用文件..."
cp -r ../dist/* ./dist/ 2>/dev/null || echo "dist目录不存在，将在构建时创建"
cp -r ../public/* ./public/ 2>/dev/null || echo "public目录不存在，将在构建时创建"

# 设置权限
chmod +x setup.sh

# 创建默认环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建默认环境变量..."
    cat > .env << EOF
# HuggingFace Space环境变量
PORT=7860
HOST=0.0.0.0
NODE_ENV=production

# API地址配置
JIMENG_CN_URLS=https://jimeng.jianying.com
JIMENG_US_URLS=https://api-proxy-1.deno.dev/dreamina/us
DREAMINA_CN_PROXY=https://jimeng.jianying.com/tech
DREAMINA_US_PROXY=https://api-proxy-1.deno.dev/dreamina/us

# 日志配置
LOG_LEVEL=info

# 性能配置
RATE_LIMIT_ENABLED=false
CACHE_ENABLED=true

# 安全配置
CORS_ORIGINS=*
EOF
fi

echo "✅ 设置完成！"