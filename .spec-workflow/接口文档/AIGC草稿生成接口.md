# AIGC草稿生成接口文档

## 接口概述

**接口功能**: 创建AIGC生成任务的草稿，支持图片生成、视频生成、图生图等功能

**请求方法**: POST
**接口路径**: `/mweb/v1/aigc_draft/generate`
**支持区域**: 即梦中国、即梦国际
**支持功能**: 图片生成、视频生成、图像混合、多图生成

## 请求参数

### URL参数 (Query Parameters)

#### 通用参数

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| aid | string | 是 | - | 应用ID |
| device_platform | string | 是 | "web" | 设备平台 |
| region | string | 是 | - | 区域: "cn" 或 "US" |
| webId | string | 是 | - | Web ID |
| da_version | string | 是 | "3.3.2" | DA版本号 |
| web_version | string | 是 | "7.5.0" | Web版本号 |
| aigc_features | string | 是 | "app_lip_sync" | AIGC功能标识 |
| web_component_open_flag | number | 是 | 1 | Web组件开启标志 |

#### 特定参数 (可选)

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| babi_param | string | 否 | - | Babi参数，用于埋点统计 |
| aigc_features | string | 否 | - | AIGC功能特性 |
| web_version | string | 否 | - | Web版本号 |
| da_version | string | 否 | - | DA版本号 |

### 请求体 (Request Body)

#### 核心结构

```json
{
  "extend": {
    "root_model": "high_aes_general_v40",
    "template_id": "",
    "m_video_commerce_info": {
      "benefit_type": "basic_video_operation_vgfm_v_three",
      "resource_id": "generate_video",
      "resource_id_type": "str",
      "resource_sub_type": "aigc"
    }
  },
  "submit_id": "submit_id_string",
  "metrics_extra": "metrics_json_string",
  "draft_content": "draft_json_string",
  "http_common_info": {
    "aid": 513695
  }
}
```

## 功能类型

### 1. 图片生成 (Text-to-Image)

#### 请求参数

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| extend.root_model | string | 是 | 模型标识，如"high_aes_general_v40" |
| extend.template_id | string | 否 | 模板ID |
| draft_content | string | 是 | 草稿内容JSON字符串 |

#### 草稿内容结构

```json
{
  "type": "draft",
  "id": "draft_id",
  "min_version": "3.0.2",
  "min_features": [],
  "is_from_tsn": true,
  "version": "3.3.2",
  "main_component_id": "component_id",
  "component_list": [{
    "type": "image_base_component",
    "id": "component_id",
    "min_version": "3.0.2",
    "aigc_mode": "workbench",
    "metadata": {
      "type": "",
      "id": "metadata_id",
      "created_platform": 3,
      "created_platform_version": "",
      "created_time_in_ms": "1640995200000",
      "created_did": ""
    },
    "generate_type": "generate",
    "abilities": {
      "type": "",
      "id": "abilities_id",
      "generate": {
        "type": "",
        "id": "generate_id",
        "core_param": {
          "type": "",
          "id": "core_param_id",
          "model": "high_aes_general_v40",
          "prompt": "生成提示词",
          "negative_prompt": "负面提示词",
          "seed": 2500000001,
          "sample_strength": 0.5,
          "image_ratio": 1,
          "large_image_info": {
            "type": "",
            "id": "large_image_info_id",
            "height": 2048,
            "width": 2048,
            "resolution_type": "2k"
          },
          "intelligent_ratio": false
        },
        "history_option": {
          "type": "",
          "id": "history_option_id"
        }
      }
    }
  }]
}
```

### 2. 图生图 (Image-to-Image)

#### 草稿内容结构

```json
{
  "type": "draft",
  "id": "draft_id",
  "min_version": "3.0.2",
  "min_features": [],
  "is_from_tsn": true,
  "version": "3.3.2",
  "main_component_id": "component_id",
  "component_list": [{
    "type": "image_base_component",
    "id": "component_id",
    "min_version": "3.0.2",
    "aigc_mode": "workbench",
    "metadata": {
      "type": "",
      "id": "metadata_id",
      "created_platform": 3,
      "created_platform_version": "",
      "created_time_in_ms": "1640995200000",
      "created_did": ""
    },
    "generate_type": "blend",
    "abilities": {
      "type": "",
      "id": "abilities_id",
      "blend": {
        "type": "",
        "id": "blend_id",
        "min_version": "3.3.2",
        "min_features": [],
        "core_param": {
          "type": "",
          "id": "core_param_id",
          "model": "high_aes_general_v40",
          "prompt": "####生成提示词",
          "sample_strength": 0.5,
          "image_ratio": 1,
          "large_image_info": {
            "type": "",
            "id": "large_image_info_id",
            "height": 2048,
            "width": 2048,
            "resolution_type": "2k"
          },
          "intelligent_ratio": false
        },
        "ability_list": [{
          "type": "",
          "id": "ability_id",
          "name": "byte_edit",
          "image_uri_list": ["image_uri_1"],
          "image_list": [{
            "type": "image",
            "id": "image_id",
            "source_from": "upload",
            "platform_type": 1,
            "name": "",
            "image_uri": "image_uri_1",
            "width": 1024,
            "height": 1024,
            "format": "",
            "uri": "image_uri_1"
          }],
          "strength": 0.5
        }],
        "prompt_placeholder_info_list": [{
          "type": "",
          "id": "placeholder_id",
          "ability_index": 0
        }],
        "postedit_param": {
          "type": "",
          "id": "postedit_id",
          "generate_type": 0
        }
      }
    }
  }]
}
```

### 3. 视频生成 (Text-to-Video)

#### 草稿内容结构

```json
{
  "type": "draft",
  "id": "draft_id",
  "min_version": "3.0.5",
  "is_from_tsn": true,
  "version": "3.3.2",
  "main_component_id": "component_id",
  "component_list": [{
    "type": "video_base_component",
    "id": "component_id",
    "min_version": "1.0.0",
    "metadata": {
      "type": "",
      "id": "metadata_id",
      "created_platform": 3,
      "created_platform_version": "",
      "created_time_in_ms": 1640995200000,
      "created_did": ""
    },
    "generate_type": "gen_video",
    "aigc_mode": "workbench",
    "abilities": {
      "type": "",
      "id": "abilities_id",
      "gen_video": {
        "type": "",
        "id": "gen_video_id",
        "text_to_video_params": {
          "type": "",
          "id": "text_to_video_id",
          "model_req_key": "dreamina_ic_generate_video_model_vgfm_3.0",
          "priority": 0,
          "seed": 2500000001,
          "video_aspect_ratio": "16:9",
          "video_gen_inputs": [{
            "duration_ms": 5000,
            "first_frame_image": {
              "format": "",
              "height": 1024,
              "id": "image_id",
              "image_uri": "image_uri_1",
              "name": "",
              "platform_type": 1,
              "source_from": "upload",
              "type": "image",
              "uri": "image_uri_1",
              "width": 1024
            },
            "end_frame_image": {
              "format": "",
              "height": 1024,
              "id": "image_id_2",
              "image_uri": "image_uri_2",
              "name": "",
              "platform_type": 1,
              "source_from": "upload",
              "type": "image",
              "uri": "image_uri_2",
              "width": 1024
            },
            "fps": 24,
            "id": "video_input_id",
            "min_version": "3.0.5",
            "prompt": "视频生成提示词",
            "resolution": "720p",
            "type": "",
            "video_mode": 2
          }]
        },
        "video_task_extra": "metrics_json_string"
      }
    }
  }]
}
```

## 请求示例

### 图片生成请求示例

```javascript
async function generateImageDraft(prompt, refreshToken, options = {}) {
  const componentId = uuid();
  const submitId = uuid();
  const model = options.model || "high_aes_general_v40";

  const draftContent = {
    type: "draft",
    id: uuid(),
    min_version: "3.0.2",
    min_features: [],
    is_from_tsn: true,
    version: "3.3.2",
    main_component_id: componentId,
    component_list: [{
      type: "image_base_component",
      id: componentId,
      min_version: "3.0.2",
      aigc_mode: "workbench",
      metadata: {
        type: "",
        id: uuid(),
        created_platform: 3,
        created_platform_version: "",
        created_time_in_ms: Date.now().toString(),
        created_did: ""
      },
      generate_type: "generate",
      abilities: {
        type: "",
        id: uuid(),
        generate: {
          type: "",
          id: uuid(),
          core_param: {
            type: "",
            id: uuid(),
            model: model,
            prompt: prompt,
            negative_prompt: options.negativePrompt || "",
            seed: Math.floor(Math.random() * 100000000) + 2500000000,
            sample_strength: options.sampleStrength || 0.5,
            image_ratio: options.imageRatio || 1,
            large_image_info: {
              type: "",
              id: uuid(),
              height: options.height || 2048,
              width: options.width || 2048,
              resolution_type: options.resolutionType || "2k"
            },
            intelligent_ratio: false
          },
          history_option: {
            type: "",
            id: uuid(),
          }
        }
      }
    }]
  };

  const requestData = {
    extend: {
      root_model: model,
      template_id: "",
    },
    submit_id: submitId,
    metrics_extra: JSON.stringify({
      promptSource: "custom",
      generateCount: 1,
      enterFrom: "click",
      generateId: uuid(),
      isRegenerate: false
    }),
    draft_content: JSON.stringify(draftContent),
    http_common_info: {
      aid: 513695,
    },
  };

  const response = await request("POST", "/mweb/v1/aigc_draft/generate", refreshToken, {
    data: requestData,
    params: {
      babi_param: encodeURIComponent(
        JSON.stringify({
          scenario: "image_video_generation",
          feature_key: "aigc_to_image",
          feature_entrance: "to_image",
          feature_entrance_detail: "to_image-" + model,
        })
      ),
    }
  });

  return response;
}
```

### 视频生成请求示例

```javascript
async function generateVideoDraft(prompt, refreshToken, options = {}) {
  const componentId = uuid();
  const submitId = uuid();
  const model = options.model || "dreamina_ic_generate_video_model_vgfm_3.0";

  const draftContent = {
    type: "draft",
    id: uuid(),
    min_version: "3.0.5",
    is_from_tsn: true,
    version: "3.3.2",
    main_component_id: componentId,
    component_list: [{
      type: "video_base_component",
      id: componentId,
      min_version: "1.0.0",
      metadata: {
        type: "",
        id: uuid(),
        created_platform: 3,
        created_platform_version: "",
        created_time_in_ms: Date.now(),
        created_did: ""
      },
      generate_type: "gen_video",
      aigc_mode: "workbench",
      abilities: {
        type: "",
        id: uuid(),
        gen_video: {
          type: "",
          id: uuid(),
          text_to_video_params: {
            type: "",
            id: uuid(),
            model_req_key: model,
            priority: 0,
            seed: Math.floor(Math.random() * 100000000) + 2500000000,
            video_aspect_ratio: "16:9",
            video_gen_inputs: [{
              duration_ms: 5000,
              first_frame_image: options.firstFrameImage,
              end_frame_image: options.endFrameImage,
              fps: 24,
              id: uuid(),
              min_version: "3.0.5",
              prompt: prompt,
              resolution: "720p",
              type: "",
              video_mode: 2
            }]
          },
          video_task_extra: JSON.stringify({
            "enterFrom": "click",
            "isDefaultSeed": 1,
            "promptSource": "custom",
            "isRegenerate": false,
            "originSubmitId": uuid(),
          })
        }
      }
    }]
  };

  const requestData = {
    extend: {
      root_model: model,
      m_video_commerce_info: {
        benefit_type: "basic_video_operation_vgfm_v_three",
        resource_id: "generate_video",
        resource_id_type: "str",
        resource_sub_type: "aigc"
      },
      m_video_commerce_info_list: [{
        benefit_type: "basic_video_operation_vgfm_v_three",
        resource_id: "generate_video",
        resource_id_type: "str",
        resource_sub_type: "aigc"
      }]
    },
    submit_id: submitId,
    metrics_extra: JSON.stringify({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": uuid(),
    }),
    draft_content: JSON.stringify(draftContent),
    http_common_info: {
      aid: 513695,
    },
  };

  const response = await request("POST", "/mweb/v1/aigc_draft/generate", refreshToken, {
    data: requestData,
    params: {
      aigc_features: "app_lip_sync",
      web_version: "6.6.0",
      da_version: "3.3.2",
    },
  });

  return response;
}
```

## 响应结构

### 成功响应 (200)

```json
{
  "ret": "0",
  "errmsg": "success",
  "data": {
    "aigc_data": {
      "history_record_id": "history_id_string",
      "task_id": "task_id_string",
      "submit_id": "submit_id_string"
    },
    "extend": {
      "root_model": "high_aes_general_v40",
      "template_id": ""
    }
  }
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| ret | string | 返回码，"0"表示成功 |
| errmsg | string | 错误信息 |
| data | object | 响应数据 |
| aigc_data | object | AIGC生成数据 |
| history_record_id | string | 历史记录ID，用于查询生成结果 |
| task_id | string | 任务ID |
| submit_id | string | 提交ID |
| extend | object | 扩展信息 |
| root_model | string | 使用的模型 |

### 错误响应

```json
{
  "ret": "2038",
  "errmsg": "内容被过滤",
  "data": null
}
```

## 常见错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 2038 | 内容被过滤 | 检查提示词是否包含敏感内容 |
| 2001 | 积分不足 | 检查用户积分状态 |
| 2002 | 参数错误 | 检查请求参数格式 |
| 2003 | 模型不可用 | 尝试其他模型 |
| 2004 | 服务繁忙 | 稍后重试 |
| 2005 | 权限不足 | 检查用户权限 |

## 模型映射

### 图片模型

| 模型名称 | 模型标识 | 说明 |
|----------|----------|------|
| jimeng-4.0 | high_aes_general_v40 | 最新的图片生成模型 |
| jimeng-3.1 | high_aes_general_v30l_art_fangzhou:general_v3.0_18b | 3.1版本模型 |
| jimeng-3.0 | high_aes_general_v30l:general_v3.0_18b | 3.0版本模型 |
| jimeng-2.1 | high_aes_general_v21_L:general_v2.1_L | 2.1版本模型 |
| jimeng-2.0-pro | high_aes_general_v20_L:general_v2.0_L | 2.0 Pro版本 |
| jimeng-2.0 | high_aes_general_v20:general_v2.0 | 2.0版本模型 |
| jimeng-1.4 | high_aes_general_v14:general_v1.4 | 1.4版本模型 |
| jimeng-xl-pro | text2img_xl_sft | XL Pro模型 |

### 视频模型

| 模型名称 | 模型标识 | 说明 |
|----------|----------|------|
| jimeng-video-3.0-pro | dreamina_ic_generate_video_model_vgfm_3.0_pro | 视频生成3.0 Pro |
| jimeng-video-3.0 | dreamina_ic_generate_video_model_vgfm_3.0 | 视频生成3.0 |
| jimeng-video-2.0 | dreamina_ic_generate_video_model_vgfm_lite | 视频生成2.0 |
| jimeng-video-2.0-pro | dreamina_ic_generate_video_model_vgfm1.0 | 视频生成2.0 Pro |

## 地区差异

### 即梦中国

- **基础URL**: `https://jimeng.jianying.com`
- **应用ID**: 513695
- **模型访问**: 支持所有模型
- **语言**: 中文为主

### 即梦国际

- **基础URL**: `https://api-proxy-1.deno.dev/dreamina/us`
- **应用ID**: 513641
- **模型访问**: 支持国际版模型
- **语言**: 英文为主

## 使用流程

1. **准备内容**: 准备提示词和相关图片（如需）
2. **选择模型**: 根据需求选择合适的模型
3. **构建草稿**: 根据功能类型构建草稿内容
4. **发送请求**: 调用AIGC草稿生成接口
5. **获取ID**: 从响应中获取history_record_id
6. **查询结果**: 使用历史记录ID轮询查询生成结果

## 性能优化

### 并发控制

```javascript
class AIGCGenerator {
  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async generate(params) {
    return new Promise((resolve, reject) => {
      this.queue.push({ params, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { params, resolve, reject } = this.queue.shift();

    try {
      const result = await this.generateDraft(params);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}
```

### 缓存策略

```javascript
const draftCache = new Map();

async function cachedGenerateDraft(params) {
  const cacheKey = JSON.stringify(params);

  if (draftCache.has(cacheKey)) {
    return draftCache.get(cacheKey);
  }

  const result = await generateImageDraft(params);

  // 缓存5分钟
  draftCache.set(cacheKey, result);
  setTimeout(() => draftCache.delete(cacheKey), 5 * 60 * 1000);

  return result;
}
```

## 监控和日志

### 关键指标

```javascript
const generationMetrics = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  avgResponseTime: 0,
  modelUsage: {}
};

function recordGenerationRequest(model, success, responseTime) {
  generationMetrics.totalRequests++;

  if (success) {
    generationMetrics.successRequests++;
  } else {
    generationMetrics.failedRequests++;
  }

  // 更新平均响应时间
  const totalProcessed = generationMetrics.successRequests + generationMetrics.failedRequests;
  generationMetrics.avgResponseTime =
    (generationMetrics.avgResponseTime * (totalProcessed - 1) + responseTime) / totalProcessed;

  // 更新模型使用统计
  generationMetrics.modelUsage[model] = (generationMetrics.modelUsage[model] || 0) + 1;
}
```

## 安全考虑

1. **内容过滤**: 遵守平台内容规范
2. **频率限制**: 实现请求频率控制
3. **权限验证**: 验证用户生成权限
4. **积分检查**: 确认用户积分充足
5. **参数验证**: 严格验证输入参数
6. **错误处理**: 妥善处理各种异常情况