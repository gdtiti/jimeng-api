# 使用预构建的即梦API镜像
FROM ghcr.io/gdtiti/jimeng-api:latest

# 设置工作目录
WORKDIR /app

# 安装Python和Flask用于HF Web界面
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# 复制HF Web界面代码
COPY app.py .

# 创建启动脚本
RUN echo '#!/bin/bash\n\
echo "🎨 启动即梦API HuggingFace Space..."\n\
echo "📡 启动Node.js API服务在端口5100..."\n\
echo "🌐 启动Flask Web界面在端口7860..."\n\
# 后台启动Node.js API服务\n\
npm start &\n\
# 等待API服务启动\n\
sleep 10\n\
# 启动Flask Web界面\n\
exec python3 app.py' > start.sh && chmod +x start.sh

# 暴露端口
EXPOSE 5100 7860

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:7860/ping || exit 1

# 启动应用
CMD ["./start.sh"]