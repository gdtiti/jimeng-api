import Koa from 'koa';
import Router from 'koa-router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { koaJwt } from 'koa-jwt';
import dotenv from 'dotenv';

import { database } from './src/lib/database/database.ts';
import authRoutes from './src/api/routes/auth.ts';
import tasksRoutes from './src/api/routes/tasks.ts';
import settingsRoutes from './src/api/routes/settings.ts';

// 加载环境变量
dotenv.config();

const app = new Koa();
const router = new Router();

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(bodyParser({
  enableTypes: ['json', 'form'],
  multipart: true,
  formidable: {
    maxFileSize: 100 * 1024 * 1024 // 100MB
  }
}));

// 将数据库实例附加到上下文
app.use(async (ctx, next) => {
  ctx.state.db = database;
  await next();
});

// 路由配置
router.get('/health', (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// API路由
router.use('/api/auth', authRoutes.routes());
router.use('/api/tasks', tasksRoutes.routes());
router.use('/api/settings', settingsRoutes.routes());

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('服务器错误:', err);
    ctx.status = err.status || 500;
    ctx.body = {
      message: err.message || '服务器内部错误',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
  }
});

// 应用路由
app.use(router.routes()).use(router.allowedMethods());

// 启动服务器
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // 初始化数据库
    const dbPath = process.env.DB_PATH || './data/jimeng.db';
    await database.initialize(dbPath);

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`🚀 即梦AI管理服务器启动成功!`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🗄️ 数据库: ${dbPath}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);

      if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        console.log(`👑 管理员账户: ${process.env.ADMIN_USERNAME}`);
      }

      console.log(`\n📋 API端点:`);
      console.log(`   POST /api/auth/login - 用户登录`);
      console.log(`   GET  /api/tasks - 获取任务列表`);
      console.log(`   POST /api/tasks - 创建新任务`);
      console.log(`   GET  /api/tasks/:id - 获取任务详情`);
      console.log(`   GET  /api/settings - 获取系统设置`);
      console.log(`   GET  /health - 健康检查`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，开始优雅关闭...');
  await database.close();
  process.exit(0);
});

// 启动服务器
startServer();