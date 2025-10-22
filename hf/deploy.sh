#!/bin/bash

# 即梦API HF部署脚本 - 基于预构建镜像
echo "🎨 即梦API HuggingFace Space部署脚本"
echo "=========================================="

# 检查必要文件
echo "📋 检查部署文件..."
required_files=("Dockerfile" "app.py" "requirements.txt" "README.md" "Spacefile.yaml")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺少必要文件: $file"
        exit 1
    fi
done

echo "✅ 所有必要文件已就绪"

# 基于预构建镜像，无需本地构建
echo "🐳 使用预构建Docker镜像: ghcr.io/gdtiti/jimeng-api:latest"
echo "✅ 包含Nanobanana模型支持和复杂Cookie解析"
echo "🔧 HF配置已适配预构建镜像"

# 检查环境变量
echo "🔍 检查环���变量..."
if [ -f ".env" ]; then
    echo "✅ 找到环境变量文件"
else
    echo "⚠️  未找到.env文件，使用默认配置"
    cp .env.example .env
fi

# 创建部署信息
echo "📝 创建部署信息..."
cat > deployment-info.json << EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.3.0",
  "environment": "huggingface-space",
  "hardware": "cpu-basic",
  "app_port": 7860,
  "features": [
    "ai-image-generation",
    "ai-video-generation",
    "openai-compatible-api",
    "smart-cookie-parsing",
    "multi-region-support",
    "nanobanana-model",
    "prebuilt-docker-image"
  ]
}
EOF

# 设置权限
chmod +x setup.sh

# 显示部署状态
echo ""
echo "📊 部署状态:"
echo "  ✅ 文件检查完成"
echo "  ✅ 环境配置完成"
echo "  ✅ 部署信息已生成"
echo ""
echo "🌐 部署信息:"
echo "  Space端口: 7860"
echo "  API端点: /v1/"
echo "  健康检查: /ping"
echo "  API文档: /docs"
echo ""
echo "📋 下一步操作:"
echo "  1. 将所有文件上传到HuggingFace Space"
echo "  2. 配置环境变量"
echo "  3. 等待构建完成"
echo "  4. 访问你的Space URL"
echo ""
echo "🎯 部署准备完成！可以上传到HuggingFace Space了。"