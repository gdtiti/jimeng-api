"use strict";

import environment from "@/lib/environment.ts";
import config from "@/lib/config.ts";
import "@/lib/initialize.ts";
import server from "@/lib/server.ts";
import routes from "@/api/routes/index.ts";
import logger from "@/lib/logger.ts";
import envLoader, { printEnvironmentStatus, validateConfiguration } from "@/lib/env-loader.ts";

const startupTime = performance.now();

(async () => {
  logger.header();

  logger.info("<<<< jimeng free server >>>>");
  logger.info("Version:", environment.package.version);
  logger.info("Process id:", process.pid);
  logger.info("Environment:", environment.env);
  logger.info("Service name:", config.service.name);

  // 打印环境变量加载状态
  printEnvironmentStatus();

  // 验证配置
  const validation = validateConfiguration();
  if (!validation.isValid) {
    logger.error("❌ 配置验证失败:");
    validation.errors.forEach(error => logger.error(`  - ${error}`));
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    logger.warn("⚠️  配置警告:");
    validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  server.attachRoutes(routes);
  await server.listen();

  config.service.bindAddress &&
    logger.success("Service bind address:", config.service.bindAddress);
})()
  .then(() =>
    logger.success(
      `Service startup completed (${Math.floor(performance.now() - startupTime)}ms)`
    )
  )
  .catch((err) => console.error(err));
