// src/api/consts/dreamina.ts

// 即梦国际站API地址 - 支持多地址负载均衡
export const BASE_URL_DREAMINA_US = "https://api-proxy-1.deno.dev/dreamina/us";
// 原始地址: "https://dreamina-api.us.capcut.com";

// 图片处理服务地址
export const BASE_URL_IMAGEX_US = "https://imagex16-normal-us-ttp.capcutapi.us";

// 国际站助手ID
export const AID_DREAMINA = 513641;

// 版本信息
export const WEB_VERSION = "7.5.0";
export const DA_VERSION = "3.3.2";
export const AIGC_FEATURES = "app_lip_sync";

// 新增: nanobanana 模型支持
export const NANOBANANA_MODEL = "nanobanana";
export const NANOBANANA_API_MODEL = "external_model_gemini_flash_image_v25";

// 国际站支持的模型列表
export const SUPPORTED_US_MODELS = [
  "jimeng-4.0",
  "jimeng-3.0",
  "nanobanana"
];
