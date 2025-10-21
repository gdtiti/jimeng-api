# 即梦API nanobanana 模型集成说明

## 📋 概述

本次更新为即梦API项目添加了对国际站 `nanobanana` 模型的支持，增强了模型的地区化管理和验证功能。

## 🆕 新增功能

### 1. **nanobanana 模型支持**
- **模型名称**: `nanobanana`
- **API映射**: `external_model_gemini_flash_image_v25`
- **支持地区**: 仅国际站（dreamina）
- **特点**: 基于Google Gemini Flash Image的图像生成模型

### 2. **增强的模型管理**
- **地区化模型映射**: 区分国内站和国际站的模型支持
- **智能模型验证**: 自动检测地区并验证模型支持性
- **详细错误信息**: 提供清晰的��型支持提示

### 3. **改进的认证系统**
- **复杂Cookie支持**: 支持 `.....` 分隔符的Cookie格式
- **智能地区检测**: 基于 `capcut_locale` 字段自动识别地区
- **向后兼容**: 保持对旧格式Cookie的支持

## 🛠️ 技术实现

### 更新的文件列表

1. **`src/api/consts/common.ts`**
   - 添加 `IMAGE_MODEL_MAP_US` 国际站模型映射
   - 添加 `DRAFT_MIN_VERSION` 版本支持

2. **`src/api/consts/dreamina.ts`**
   - 新增 `NANOBANANA_MODEL` 和 `NANOBANANA_API_MODEL` 常量
   - 添加 `SUPPORTED_US_MODELS` 支持的模型列表

3. **`src/api/controllers/core.ts`**
   - 导入新的模型映射常量
   - 增强地区检测逻辑

4. **`src/api/controllers/images.ts`**
   - 更新 `getModel()` 函数支持地区参数
   - 添加 `isModelSupported()` 和 `getSupportedModels()` 函数
   - 更新所有图片生成函数支持地区化处理

5. **`src/api/routes/images.ts`**
   - 添加模型验证逻辑
   - 提供详细的错误提示

## 📖 使用方法

### 1. **国际站 nanobanana 模型**

```bash
curl -X POST http://localhost:5100/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sessionid=your_sessionid.....sid_tt=your_sid_tt.....capcut_locale=en.....other_data" \
  -d '{
    "model": "nanobanana",
    "prompt": "a futuristic cityscape, cyberpunk style, neon lights",
    "ratio": "16:9",
    "resolution": "2k"
  }'
```

### 2. **Cookie格式说明**

#### 国际站Cookie格式（推荐）
```
sessionid=your_sessionid.....sid_tt=your_sid_tt.....capcut_locale=en.....other_cookie_fields
```

#### 国内站Cookie格式
```
your_domestic_sessionid
```

### 3. **支持的模型列表**

#### 国际站模型
- `nanobanana` - Google Gemini Flash Image模型
- `jimeng-4.0` - 即梦4.0模型
- `jimeng-3.0` - 即梦3.0模型

#### 国内站模型
- `jimeng-4.0` - 即梦4.0模型
- `jimeng-3.1` - 即梦3.1艺术模型
- `jimeng-3.0` - 即梦3.0模型
- `jimeng-2.1` - 即梦2.1模型
- `jimeng-2.0-pro` - 即梦2.0 Pro模型
- `jimeng-2.0` - 即梦2.0模型
- `jimeng-1.4` - 即梦1.4模型
- `jimeng-xl-pro` - 即梦XL Pro模型

## 🔧 API响应示例

### 成功响应
```json
{
  "created": 1698765432,
  "data": [
    {
      "url": "https://example.com/generated-image-1.jpg"
    },
    {
      "url": "https://example.com/generated-image-2.jpg"
    }
  ]
}
```

### 模型不支持错误
```json
{
  "error": {
    "message": "国际版不支持模型 \"jimeng-2.0\"。支持的模型: nanobanana, jimeng-4.0, jimeng-3.0",
    "type": "invalid_request_error",
    "code": "unsupported_model"
  }
}
```

## 🧪 测试

### 运行测试脚本
```bash
# 确保API服务器已启动
npm run dev

# 在另一个终端运行测试
node test/nanobanana-test.js
```

### 测试用例
1. ✅ 国际站 nanobanana 模型生成测试
2. ✅ 国际站 jimeng-4.0 模型生成测试
3. ✅ 国内站模型生成测试
4. ✅ 模型验证功能测试
5. ✅ Cookie格式解析测试

## 📝 注意事项

### 1. **Cookie配置**
- 确保Cookie中的 `capcut_locale=en` 字段用于国际站识别
- 复杂Cookie字段使用 `.....` 分隔符
- 优先使用 `sessionid` 或 `sid_tt` 字段作为认证token

### 2. **模型选择**
- 国际站建议使用 `nanobanana` 模型获得更好的效果
- 国内站继续使用原有的 `jimeng` 系列模型
- 系统会自动验证模型支持性并提供错误提示

### 3. **兼容性**
- 完全向后兼容现有的API调用方式
- 支持原有的Cookie格式
- 不影响现有功能的使用

## 🔄 迁移指南

如果您已经在使用即梦API，迁移到支持nanobanana的版本只需要：

1. **更新代码**：拉取最新代码或应用相关修改
2. **配置Cookie**：如果需要使用国际站功能，更新Cookie格式
3. **测试验证**：运行测试脚本确保功能正常

无需修改现有的API调用代码，所有更改都是向后兼容的。

## 🐛 问题排查

### 常见问题

1. **"不支持的模型"错误**
   - 检查模型名称是否正确
   - 确认Cookie中的地区标识是否正确
   - 查看支持的模型列表

2. **"认证失败"错误**
   - 验证Cookie格式是否正确
   - 检查Cookie是否已过期
   - 确认网络连接正常

3. **"地区检测失败"错误**
   - 确保国际站Cookie包含 `capcut_locale=en`
   - 检查Cookie分隔符是否正确使用 `.....`
   - 尝试使用更完整的Cookie信息

### 调试模式

启用详细日志记录：
```bash
DEBUG=jimeng:* npm run dev
```

## 📞 支持

如有问题，请：
1. 查看本文档的问题排查部分
2. 运行测试脚本进行诊断
3. 检查API服务器的日志输出
4. 提交Issue并附上详细的错误信息和Cookie示例（请隐藏敏感信息）