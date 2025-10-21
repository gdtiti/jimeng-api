#!/bin/bash

# HuggingFace Space自动部署脚本
echo "🚀 开始部署到HuggingFace Space..."

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

# 构建Node.js项目
echo "🔨 构建Node.js项目..."
if [ -d "../dist" ]; then
    echo "✅ 找到现有dist目录"
else
    echo "📦 需要先构建dist目录"
    echo "请运行: npm run build"
    exit 1
fi

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
    "multi-region-support"
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