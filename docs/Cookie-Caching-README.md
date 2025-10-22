# Cookie缓存管理器

## 概述

本模块为即梦API项目实现了智能的Cookie和Session缓存机制，解决同一个sessionid或cookie在多次请求中重复解析和构造的问题，显著提升API性能。

## 🎯 核心功能

### 1. 智能缓存键生成
- **相同sessionid自动识别**：不同格式的相同sessionid会生成相同的缓存键
- **多格式支持**：支持完整cookie字符串、sessionid格式、refreshToken格式
- **地区感知**：根据`capcut_locale`自动识别cn/us地区

### 2. 分层缓存机制
- **解析缓存**：缓存cookie解析结果（默认TTL: 30分钟）
- **认证缓存**：缓存完整认证信息（默认TTL: 5分钟）
- **内存管理**：自动LRU淘汰，防止内存泄漏

### 3. 性能优化
- **命中率监控**：实时统计缓存命中率
- **预热机制**：支持批量预热常用sessionid
- **自动清理**：定期清理过期缓存项

## 📁 文件结构

```
src/lib/auth/
├── cookie-cache-manager.ts      # 核心缓存管理器
├── auth-manager.ts              # 集成缓存的认证管理器（已更新）
├── enhanced-cookie-manager.ts   # 增强的cookie解析器
├── cookie-manager.ts            # 基础cookie管理器
└── __tests__/
    └── cookie-cache-manager.test.ts  # 单元测试

examples/
├── cookie-cache-usage.js       # 使用示例
└── enhanced-cookie-examples.js # 增强功能示例

docs/
└── Cookie-Caching-README.md    # 本文档
```

## 🚀 快速开始

### 基本使用

```typescript
import { getAuthInfo } from './src/lib/auth/auth-manager.js';

// 第一次调用 - 解析并缓存
const auth1 = await getAuthInfo('sessionid=abc123.....capcut_locale=zh-CN');

// 第二次调用 - 直接命中缓存
const auth2 = await getAuthInfo('sessionid=abc123.....capcut_locale=zh-CN.....extra=value');
```

### 缓存统计

```typescript
import { getCookieCacheStatistics } from './src/lib/auth/auth-manager.js';

const stats = getCookieCacheStatistics();
console.log(`解析缓存命中率: ${stats.parse.hitRate.toFixed(1)}%`);
console.log(`认证缓存命中率: ${stats.auth.hitRate.toFixed(1)}%`);
```

### 缓存预热

```typescript
import { warmupCookieCache } from './src/lib/auth/auth-manager.js';

const commonSessions = [
  'sessionid=user001.....capcut_locale=zh-CN',
  'sessionid=user002.....capcut_locale=en'
];

await warmupCookieCache(commonSessions);
```

### 配置缓存参数

```typescript
import { configureCookieCache } from './src/lib/auth/auth-manager.js';

configureCookieCache({
  parseResultTTL: 60 * 60 * 1000,  // 解析结果缓存1小时
  authInfoTTL: 15 * 60 * 1000,     // 认证信息缓存15分钟
  maxCacheSize: 2000,               // 最大缓存2000项
  cleanupInterval: 5 * 60 * 1000    // 5分钟清理一次
});
```

## 🔧 高级功能

### 缓存状态检查

```typescript
import { checkCacheStatus } from './src/lib/auth/auth-manager.js';

const status = checkCacheStatus('sessionid=abc123.....');
console.log(`解析缓存: ${status.parseCache ? '命中' : '未命中'}`);
console.log(`认证缓存: ${status.authCache ? '命中' : '未命中'}`);
```

### 手动缓存失效

```typescript
import { invalidateCookieCache } from './src/lib/auth/auth-manager.js';

// 清除特定session的缓存
invalidateCookieCache('sessionid=abc123.....');
```

### 获取详细缓存信息

```typescript
import { getCookieCacheManager } from './src/lib/auth/cookie-cache-manager.ts';

const manager = getCookieCacheManager();
const details = manager.getCacheDetails();

console.log('解析缓存详情:', details.parseCache);
console.log('认证缓存详情:', details.authCache);
```

## 📊 性能提升

### 测试结果

基于简化的性能测试，缓存机制在以下场景中表现优异：

1. **相同sessionid重复访问**：
   - 缓存命中率：66.7%+
   - 解析时间减少：避免重复的字符串解析操作

2. **多用户并发场景**：
   - 每个独立session创建独立缓存项
   - 相同session的不同请求共享缓存

3. **内存效率**：
   - 智能缓存键避免重复存储相同session
   - 自动LRU淘汰控制内存使用

### 适用场景

- ✅ **高频API调用**：相同用户频繁请求
- ✅ **批量处理**：处理大量用户数据
- ✅ **并发请求**：多个请求使用相同session
- ✅ **长期会话**：用户session在较长时间内保持有效

## ⚙️ 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `parseResultTTL` | number | 1800000 (30分钟) | 解析结果缓存时间 |
| `authInfoTTL` | number | 300000 (5分钟) | 认证信息缓存时间 |
| `maxCacheSize` | number | 1000 | 最大缓存项数量 |
| `cleanupInterval` | number | 600000 (10分钟) | 自动清理间隔 |
| `enableStats` | boolean | true | 是否启用统计功能 |

## 🧪 测试

### 运行单元测试

```bash
# 如果配置了测试框架
npm test src/lib/auth/__tests__/cookie-cache-manager.test.ts

# 运行简化测试
node simple-cache-test.js
```

### 测试覆盖

- ✅ 基本缓存功能
- ✅ 相同sessionid识别
- ✅ 不同sessionid隔离
- ✅ 缓存失效机制
- ✅ 多地区支持
- ✅ 性能对比

## 🔍 监控和调试

### 日志级别

缓存管理器使用标准logger输出：

```typescript
// 开启调试日志查看缓存行为
logger.debug('Cookie解析缓存命中: session_abc123_cn');
logger.info('认证信息缓存已刷新: sessionid=abc123...');
```

### 统计指标

```typescript
interface CacheStats {
  size: number;           // 缓存大小
  hits: number;           // 命中次数
  misses: number;         // 未命中次数
  hitRate: number;        // 命中率 (百分比)
  expiredItems: number;   // 过期项数量
  totalAccess: number;    // 总访问次数
}
```

## 🛠️ 故障排除

### 常见问题

1. **缓存命中率低**
   - 检查sessionid格式是否一致
   - 确认TTL设置是否合理
   - 查看缓存大小限制

2. **内存占用过高**
   - 调整`maxCacheSize`参数
   - 减少TTL时间
   - 增加清理频率

3. **不同格式未命中缓存**
   - 确认sessionid核心部分相同
   - 检查缓存键生成逻辑

### 调试命令

```typescript
// 查看当前缓存状态
const stats = getCookieCacheStatistics();
console.log('缓存统计:', stats);

// 检查特定session缓存状态
const status = checkCacheStatus(yourCookieString);
console.log('缓存状态:', status);

// 清除所有缓存（调试用）
getCookieCacheManager().clearAllCache();
```

## 🔮 未来改进

1. **持久化缓存**：支持Redis等外部缓存
2. **缓存预热策略**：智能预测常用session
3. **更多统计指标**：详细的性能分析
4. **缓存压缩**：减少内存占用
5. **分布式缓存**：支持多实例部署

## 📝 更新日志

### v1.0.0 (2024-10-22)
- ✨ 实现基础Cookie缓存机制
- ✨ 智能缓存键生成
- ✨ 分层缓存架构
- ✨ 统计和监控功能
- ✨ 完整的单元测试
- 📚 详细的使用文档

## 🤝 贡献

欢迎提交Issue和Pull Request来改进缓存机制。

## 📄 许可证

本项目采用GPL-3.0许可证。

---

**注意**：本缓存机制专为即梦API项目设计，确保在生产环境中合理配置缓存参数以获得最佳性能。