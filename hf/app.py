"""
HuggingFace Space Flask应用
用于提供Web界面和代理API服务
"""

import os
import subprocess
import threading
import time
from flask import Flask, render_template_string, request, jsonify, send_from_directory
import requests

# Flask应用
app = Flask(__name__)

# HTML模板
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>即梦AI图像生成服务</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .main-content {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }

        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }

        textarea {
            height: 100px;
            resize: vertical;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .generate-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .generate-btn:hover {
            transform: translateY(-2px);
        }

        .generate-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .result {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            display: none;
        }

        .result img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin-top: 10px;
        }

        .status {
            text-align: center;
            padding: 20px;
            color: #666;
        }

        .error {
            background: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .success {
            background: #efe;
            color: #393;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .api-info {
            background: #f0f8ff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }

        .api-info h3 {
            color: #333;
            margin-bottom: 15px;
        }

        .api-endpoint {
            background: #333;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 即梦AI图像生成</h1>
            <p>免费AI图像和视频生成服务</p>
        </div>

        <div class="main-content">
            <div class="api-info">
                <h3>📡 API端点</h3>
                <div class="api-endpoint" id="api-endpoint">https://your-space.hf.space</div>
                <p><strong>健康检查:</strong> <a href="/ping" target="_blank">/ping</a></p>
                <p><strong>API文档:</strong> <a href="/docs" target="_blank">/docs</a></p>
            </div>

            <form id="generate-form">
                <div class="form-group">
                    <label for="prompt">📝 生成描述</label>
                    <textarea id="prompt" name="prompt" placeholder="描述你想要生成的图像，例如：美丽的少女，胶片感" required></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="model">🤖 模型选择</label>
                        <select id="model" name="model">
                            <option value="jimeng-4.0">jimeng-4.0 (标准)</option>
                            <option value="jimeng-4.0-visual">jimeng-4.0-visual (视觉增强)</option>
                            <option value="jimeng-4.0-anime">jimeng-4.0-anime (动漫风格)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="resolution">📐 分辨率</label>
                        <select id="resolution" name="resolution">
                            <option value="1k">1K (1024x1024)</option>
                            <option value="2k">2K (2048x2048)</option>
                            <option value="4k">4K (4096x4096)</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="ratio">📏 比例</label>
                        <select id="ratio" name="ratio">
                            <option value="1:1">1:1 (正方形)</option>
                            <option value="9:16">9:16 (竖版)</option>
                            <option value="16:9">16:9 (横版)</option>
                            <option value="4:3">4:3 (标准)</option>
                            <option value="3:4">3:4 (竖版)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="token">🔑 Cookie Token</label>
                        <input type="password" id="token" name="token" placeholder="输入你的Cookie Token (可选)">
                        <small style="color: #666; display: block; margin-top: 5px;">
                            留空使用默认Token，或输入你的完整Cookie字符串
                        </small>
                    </div>
                </div>

                <button type="submit" class="generate-btn" id="generate-btn">
                    🚀 开始生成
                </button>
            </form>

            <div id="result" class="result">
                <h3>生成结果</h3>
                <div id="result-content"></div>
            </div>
        </div>
    </div>

    <script>
        // 设置API端点
        document.getElementById('api-endpoint').textContent = window.location.origin;

        // 表单提交处理
        document.getElementById('generate-form').addEventListener('submit', async function(e) {
            e.preventDefault();

            const btn = document.getElementById('generate-btn');
            const result = document.getElementById('result');
            const resultContent = document.getElementById('result-content');

            // 获取表单数据
            const formData = new FormData(e.target);
            const prompt = formData.get('prompt');
            const model = formData.get('model');
            const resolution = formData.get('resolution');
            const ratio = formData.get('ratio');
            const token = formData.get('token');

            // 显示生成状态
            btn.disabled = true;
            btn.textContent = '⏳ 生成中...';
            result.style.display = 'block';
            resultContent.innerHTML = '<div class="status">🎨 正在生成图像，请稍候...</div>';

            try {
                // 构建请求
                const requestData = {
                    prompt: prompt,
                    model: model,
                    size: getResolutionSize(resolution, ratio),
                    n: 1,
                    response_format: "url"
                };

                const headers = {
                    'Content-Type': 'application/json'
                };

                // 添加认证头
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                // 发送请求
                const response = await fetch('/v1/images/generations', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestData)
                });

                const data = await response.json();

                if (response.ok && data.data && data.data.length > 0) {
                    // 显示成功结果
                    const imageUrl = data.data[0].url;
                    resultContent.innerHTML = `
                        <div class="success">
                            <p>✅ 生成成功！</p>
                            <p><strong>模型:</strong> ${model}</p>
                            <p><strong>分辨率:</strong> ${getResolutionSize(resolution, ratio)}</p>
                            <img src="${imageUrl}" alt="Generated image" style="max-width: 100%; border-radius: 8px;">
                            <p style="margin-top: 10px;">
                                <a href="${imageUrl}" target="_blank" style="color: #667eea;">🔗 查看大图</a>
                            </p>
                        </div>
                    `;
                } else {
                    // 显示错误
                    resultContent.innerHTML = `
                        <div class="error">
                            <p>❌ 生成失败</p>
                            <p><strong>错误信息:</strong> ${data.error?.message || data.message || '未知错误'}</p>
                        </div>
                    `;
                }

            } catch (error) {
                resultContent.innerHTML = `
                    <div class="error">
                        <p>❌ 网络错误</p>
                        <p><strong>错误信息:</strong> ${error.message}</p>
                    </div>
                `;
            } finally {
                // 恢复按钮状态
                btn.disabled = false;
                btn.textContent = '🚀 开始生成';
            }
        });

        // 获取分辨率尺寸
        function getResolutionSize(resolution, ratio) {
            const sizes = {
                '1k': {
                    '1:1': '1024x1024',
                    '9:16': '936x1664',
                    '16:9': '1664x936',
                    '4:3': '1472x1104',
                    '3:4': '1104x1472'
                },
                '2k': {
                    '1:1': '2048x2048',
                    '9:16': '1440x2560',
                    '16:9': '2560x1440',
                    '4:3': '2048x1536',
                    '3:4': '1536x2048'
                },
                '4k': {
                    '1:1': '4096x4096',
                    '9:16': '2304x4096',
                    '16:9': '4096x2304',
                    '4:3': '4096x3072',
                    '3:4': '3072x4096'
                }
            };

            return sizes[resolution]?.[ratio] || sizes['1k']['1:1'];
        }
    </script>
</body>
</html>
"""

def start_node_server():
    """启动Node.js服务器"""
    try:
        # 检查Node.js是否可用
        subprocess.run(['node', '--version'], check=True, capture_output=True)

        # 启动Node.js服务器
        print("🚀 启动Node.js服务器...")
        subprocess.run(['node', 'dist/index.js'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ 启动Node.js服务器失败: {e}")
        print("请确保已正确构建dist目录")
    except FileNotFoundError:
        print("❌ 未找到Node.js，正在启动备用服务...")

@app.route('/')
def index():
    """主页"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/ping')
def ping():
    """健康检查"""
    return jsonify({
        "status": "ok",
        "message": "即梦API服务正在运行",
        "version": "1.3.0",
        "timestamp": int(time.time())
    })

@app.route('/health')
def health():
    """详细健康检查"""
    return jsonify({
        "status": "healthy",
        "service": "jimeng-api",
        "version": "1.3.0",
        "uptime": int(time.time()),
        "environment": os.getenv('NODE_ENV', 'production'),
        "endpoints": {
            "images": "/v1/images/generations",
            "videos": "/v1/videos/generations",
            "ping": "/ping",
            "health": "/health"
        }
    })

@app.route('/docs')
def docs():
    """API文档"""
    return jsonify({
        "title": "即梦API文档",
        "version": "1.3.0",
        "endpoints": {
            "图像生成": {
                "method": "POST",
                "path": "/v1/images/generations",
                "description": "生成AI图像"
            },
            "视频生成": {
                "method": "POST",
                "path": "/v1/videos/generations",
                "description": "生成AI视频"
            },
            "健康检查": {
                "method": "GET",
                "path": "/ping",
                "description": "检查服务状态"
            }
        },
        "authentication": {
            "type": "Bearer Token",
            "description": "使用Cookie字符串作为Token"
        }
    })

@app.route('/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_api(path):
    """代理API请求到Node.js服务器"""
    try:
        # 构建目标URL
        target_url = f"http://localhost:3000/v1/{path}"

        # 获取请求数据
        method = request.method
        headers = dict(request.headers)

        # 移除一些不需要的头部
        headers.pop('host', None)
        headers.pop('content-length', None)

        # 获取请求体
        body = request.get_data()

        # 发送请求
        response = requests.request(
            method=method,
            url=target_url,
            headers=headers,
            data=body,
            timeout=300
        )

        # 返回响应
        return (response.content, response.status_code, dict(response.headers))

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": {
                "message": "Node.js服务未启动或连接失败",
                "code": "SERVICE_UNAVAILABLE"
            }
        }), 503
    except Exception as e:
        return jsonify({
            "error": {
                "message": f"代理请求失败: {str(e)}",
                "code": "PROXY_ERROR"
            }
        }), 500

if __name__ == '__main__':
    print("🎨 即梦API HuggingFace Space服务")
    print("=" * 50)

    # 在后台线程中启动Node.js服务器
    node_thread = threading.Thread(target=start_node_server, daemon=True)
    node_thread.start()

    # 等待一会儿让Node.js服务器启动
    time.sleep(5)

    # 启动Flask服务器
    port = int(os.environ.get('PORT', 7860))
    host = os.environ.get('HOST', '0.0.0.0')

    print(f"🌐 Flask服务器启动在 http://{host}:{port}")
    print(f"📱 访问地址: https://your-space.hf.space")
    print("=" * 50)

    app.run(host=host, port=port, debug=False)