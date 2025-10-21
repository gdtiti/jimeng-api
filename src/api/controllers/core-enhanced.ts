import { PassThrough } from "stream";
import path from "path";
import _ from "lodash";
import mime from "mime";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

import APIException from "@/lib/exceptions/APIException.ts";
import EX from "@/api/consts/exceptions.ts";
import { createParser } from "eventsource-parser";
import logger from "@/lib/logger.ts";
import util from "@/lib/util.ts";
import { JimengErrorHandler, JimengErrorResponse } from "@/lib/error-handler.ts";
import { getAuthInfo, AuthInfo } from "@/lib/auth/auth-manager.ts";
import { RETRY_CONFIG } from "@/api/consts/common.ts";

// 模型名称
const MODEL_NAME = "jimeng";
// 设备ID
const DEVICE_ID = Math.random() * 999999999999999999 + 7000000000000000000;
// WebID
const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
// 用户ID
const USER_ID = util.uuid(false);
// 文件最大大小
const FILE_MAX_SIZE = 100 * 1024 * 1024;

/**
 * 增强版请求函数 - 支持新的认证机制和URL管理
 *
 * @param method 请求方法
 * @param uri 请求路径
 * @param authString 认证字符串（cookie字符串或refreshToken）
 * @param options 请求选项
 */
export async function request(
  method: string,
  uri: string,
  authString: string,
  options: AxiosRequestConfig & {
    noDefaultParams?: boolean;
    serviceType?: "jimeng" | "imagex" | "commerce";
    region?: "cn" | "us";
    customUrls?: {
      baseUrl?: string;
      imagexUrl?: string;
      commerceUrl?: string;
    };
  } = {}
) {
  try {
    // 获取认证信息
    const authInfo = await getAuthInfo(authString, {
      region: options.region,
      ...options.customUrls
    });

    // 根据服务类型选择合适的URL
    let baseUrl: string;
    switch (options.serviceType) {
      case "imagex":
        baseUrl = authInfo.imagexUrl;
        break;
      case "commerce":
        baseUrl = authInfo.commerceUrl;
        break;
      case "jimeng":
      default:
        baseUrl = authInfo.baseUrl;
        break;
    }

    // 构建请求参数
    const requestParams = options.noDefaultParams ? (options.params || {}) : {
      aid: authInfo.aid,
      device_platform: "web",
      region: authInfo.region,
      webId: WEB_ID,
      da_version: "3.3.2",
      web_component_open_flag: 1,
      web_version: "7.5.0",
      aigc_features: "app_lip_sync",
      ...(options.params || {}),
    };

    // 合并请求头
    const headers = {
      ...authInfo.headers,
      ...(options.headers || {}),
    };

    const fullUrl = `${baseUrl}${uri}`;

    logger.info(`发送请求: ${method.toUpperCase()} ${fullUrl}`);
    logger.info(`认证信息: 地区=${authInfo.region}, AID=${authInfo.aid}`);
    logger.info(`请求参数: ${JSON.stringify(requestParams)}`);
    logger.info(`请求数据: ${JSON.stringify(options.data || {})}`);

    // 执行请求（包含重试逻辑）
    const response = await executeRequestWithRetry(
      method,
      fullUrl,
      requestParams,
      headers,
      options,
      authInfo
    );

    return response;

  } catch (error) {
    logger.error(`请求失败: ${error.message}`);
    throw error;
  }
}

/**
 * 执行带重试机制的请求
 */
async function executeRequestWithRetry(
  method: string,
  url: string,
  params: any,
  headers: any,
  options: any,
  authInfo: AuthInfo
) {
  let retries = 0;
  const maxRetries = RETRY_CONFIG.MAX_RETRY_COUNT;
  let lastError = null;

  while (retries <= maxRetries) {
    try {
      if (retries > 0) {
        logger.info(`第 ${retries} 次重试请求: ${method.toUpperCase()} ${url}`);
        // 重试前等待一段时间
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY));
      }

      const response = await axios.request({
        method,
        url,
        params,
        headers,
        timeout: 45000, // 增加超时时间到45秒
        validateStatus: () => true, // 允许任何状态码
        ..._.omit(options, "params", "headers"),
      });

      // 记录响应状态
      logger.info(`响应状态: ${response.status} ${response.statusText}`);

      // 流式响应直接返回response
      if (options.responseType == "stream") return response;

      // 记录响应数据摘要
      const responseDataSummary = JSON.stringify(response.data).substring(0, 500) +
        (JSON.stringify(response.data).length > 500 ? "..." : "");
      logger.info(`响应数据摘要: ${responseDataSummary}`);

      // 检查HTTP状态码
      if (response.status >= 400) {
        logger.warn(`HTTP错误: ${response.status} ${response.statusText}`);

        // 对于某些错误，尝试故障转移
        if (shouldTryFailover(response.status, retries) && retries < maxRetries) {
          retries++;
          const newAuthInfo = tryFailover(authInfo, url);
          if (newAuthInfo) {
            // 更新URL并重试
            const newUrl = replaceBaseUrl(url, newAuthInfo.baseUrl);
            logger.info(`故障转移到新URL: ${newUrl}`);
            return executeRequestWithRetry(method, newUrl, params, newAuthInfo.headers, options, newAuthInfo);
          }
        }

        if (retries < maxRetries) {
          retries++;
          continue;
        }
      }

      return checkResult(response);

    } catch (error) {
      lastError = error;
      logger.error(`请求失败 (尝试 ${retries + 1}/${maxRetries + 1}): ${error.message}`);

      // 如果是网络错误或超时，尝试重试
      if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout') || error.message.includes('network')) &&
          retries < maxRetries) {
        retries++;
        continue;
      }

      // 对于连接错误，尝试故障转移
      if (isConnectionError(error) && retries < maxRetries) {
        retries++;
        const newAuthInfo = tryFailover(authInfo, url);
        if (newAuthInfo) {
          const newUrl = replaceBaseUrl(url, newAuthInfo.baseUrl);
          logger.info(`网络错误，故障转移到新URL: ${newUrl}`);
          return executeRequestWithRetry(method, newUrl, params, newAuthInfo.headers, options, newAuthInfo);
        }
      }

      // 其他错误直接抛出
      break;
    }
  }

  // 所有重试都失败了，抛出最后一个错误
  if (lastError) {
    logger.error(`请求失败，已重试 ${retries} 次: ${lastError.message}`);
    if (lastError.response) {
      logger.error(`响应状态: ${lastError.response.status}`);
      logger.error(`响应数据: ${JSON.stringify(lastError.response.data)}`);
    }
    throw lastError;
  } else {
    // 这种情况理论上不应该发生，但为了安全起见
    const error = new Error(`请求失败，已重试 ${retries} 次，但没有具体错误信息`);
    logger.error(error.message);
    throw error;
  }
}

/**
 * 判断是否应该尝试故障转移
 */
function shouldTryFailover(statusCode: number, retries: number): boolean {
  const failoverStatusCodes = [500, 502, 503, 504, 429];
  return failoverStatusCodes.includes(statusCode) && retries < 2;
}

/**
 * 判断是否为连接错误
 */
function isConnectionError(error: any): boolean {
  return error.code === 'ECONNREFUSED' ||
         error.code === 'ENOTFOUND' ||
         error.code === 'ECONNRESET' ||
         error.message.includes('Network Error') ||
         error.message.includes('fetch failed');
}

/**
 * 尝试故障转移
 */
function tryFailover(authInfo: AuthInfo, currentUrl: string): AuthInfo | null {
  // 这里可以实现更复杂的故障转移逻辑
  // 例如：尝试不同的URL、不同的认证方式等
  // 目前返回null，表示不进行故障转移
  return null;
}

/**
 * 替换URL中的基础域名
 */
function replaceBaseUrl(url: string, newBaseUrl: string): string {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(newBaseUrl);
    urlObj.hostname = baseUrlObj.hostname;
    urlObj.protocol = baseUrlObj.protocol;
    urlObj.port = baseUrlObj.port;
    return urlObj.toString();
  } catch (error) {
    logger.error(`替换URL失败: ${error.message}`);
    return url;
  }
}

/**
 * 预检查文件URL有效性
 */
export async function checkFileUrl(fileUrl: string) {
  if (util.isBASE64Data(fileUrl)) return;

  const result = await axios.head(fileUrl, {
    timeout: 15000,
    validateStatus: () => true,
  });

  if (result.status >= 400)
    throw new APIException(
      EX.API_FILE_URL_INVALID,
      `File ${fileUrl} is not valid: [${result.status}] ${result.statusText}`
    );

  // 检查文件大小
  if (result.headers && result.headers["content-length"]) {
    const fileSize = parseInt(result.headers["content-length"], 10);
    if (fileSize > FILE_MAX_SIZE)
      throw new APIException(
        EX.API_FILE_EXECEEDS_SIZE,
        `File ${fileUrl} is not valid`
      );
  }
}

/**
 * 上传文件 - 增强版
 */
export async function uploadFile(
  authString: string,
  fileUrl: string,
  isVideoImage: boolean = false,
  options: {
    region?: "cn" | "us";
    customUrls?: {
      baseUrl?: string;
      imagexUrl?: string;
    };
  } = {}
) {
  try {
    logger.info(`开始上传文件: ${fileUrl}, 视频图像模式: ${isVideoImage}`);

    // 预检查远程文件URL可用性
    await checkFileUrl(fileUrl);

    let filename, fileData, mimeType;

    // 如果是BASE64数据则直接转换为Buffer
    if (util.isBASE64Data(fileUrl)) {
      mimeType = util.extractBASE64DataFormat(fileUrl);
      const ext = mime.getExtension(mimeType);
      filename = `${util.uuid()}.${ext}`;
      fileData = Buffer.from(util.removeBASE64DataHeader(fileUrl), "base64");
      logger.info(`处理BASE64数据，文件名: ${filename}, 类型: ${mimeType}, 大小: ${fileData.length}字节`);
    } else {
      // 下载文件到内存
      filename = path.basename(fileUrl);
      logger.info(`开始下载远程文件: ${fileUrl}`);

      ({ data: fileData } = await axios.get(fileUrl, {
        responseType: "arraybuffer",
        maxContentLength: FILE_MAX_SIZE,
        timeout: 60000,
      }));

      logger.info(`文件下载完成，文件名: ${filename}, 大小: ${fileData.length}字节`);
    }

    // 获取文件的MIME类型
    mimeType = mimeType || mime.getType(filename);
    logger.info(`文件MIME类型: ${mimeType}`);

    // 获取上传凭证
    logger.info(`请求上传凭证，场景: ${isVideoImage ? 'video_cover' : 'aigc_image'}`);

    const uploadProofUrl = 'https://imagex.bytedanceapi.com/';
    const proofResult = await request(
      'POST',
      '/mweb/v1/get_upload_image_proof',
      authString,
      {
        data: {
          scene: isVideoImage ? 'video_cover' : 'aigc_image',
          file_name: filename,
          file_size: fileData.length,
        },
        serviceType: 'jimeng',
        region: options.region
      }
    );

    if (!proofResult || !proofResult.proof_info) {
      logger.error(`获取上传凭证失败: ${JSON.stringify(proofResult)}`);
      throw new APIException(EX.API_REQUEST_FAILED, '获取上传凭证失败');
    }

    logger.info(`获取上传凭证成功`);

    // 上传文件
    const { proof_info } = proofResult;
    logger.info(`开始上传文件到: ${uploadProofUrl}`);

    const uploadResult = await axios.post(
      uploadProofUrl,
      createFormData(fileData, filename, mimeType, proof_info),
      {
        headers: {
          ...proof_info.headers,
          'Content-Type': 'multipart/form-data',
        },
        params: proof_info.query_params,
        timeout: 60000,
        validateStatus: () => true,
      }
    );

    logger.info(`上传响应状态: ${uploadResult.status}`);

    if (!uploadResult || uploadResult.status !== 200) {
      logger.error(`上传文件失败: 状态码 ${uploadResult?.status}, 响应: ${JSON.stringify(uploadResult?.data)}`);
      throw new APIException(EX.API_REQUEST_FAILED, `上传文件失败: 状态码 ${uploadResult?.status}`);
    }

    // 验证 proof_info.image_uri 是否存在
    if (!proof_info.image_uri) {
      logger.error(`上传凭证中缺少 image_uri: ${JSON.stringify(proof_info)}`);
      throw new APIException(EX.API_REQUEST_FAILED, '上传凭证中缺少 image_uri');
    }

    logger.info(`文件上传成功: ${proof_info.image_uri}`);

    // 返回上传结果
    return {
      image_uri: proof_info.image_uri,
      uri: proof_info.image_uri,
    }
  } catch (error) {
    logger.error(`文件上传过程中发生错误: ${error.message}`);
    throw error;
  }
}

/**
 * 创建FormData
 */
function createFormData(fileData: Buffer, filename: string, mimeType: string, proofInfo: any): FormData {
  const formData = new FormData();
  const blob = new Blob([fileData], { type: mimeType });
  formData.append('file', blob, filename);
  return formData;
}

/**
 * 检查请求结果
 */
export function checkResult(result: AxiosResponse) {
  const { ret, errmsg, data } = result.data;
  if (!_.isFinite(Number(ret))) return result.data;
  if (ret === '0') return data;

  // 使用统一错误处理器
  JimengErrorHandler.handleApiResponse(result.data as JimengErrorResponse, {
    context: '即梦API请求',
    operation: '请求'
  });
}

/**
 * Token切分 - 保持向后兼容
 */
export function tokenSplit(authorization: string) {
  return authorization.replace("Bearer ", "").split(",");
}

/**
 * 获取Token存活状态 - 增强版
 */
export async function getTokenLiveStatus(authString: string) {
  try {
    const result = await request(
      "POST",
      "/passport/account/info/v2",
      authString,
      {
        params: {
          account_sdk_source: "web",
        },
        serviceType: 'jimeng'
      }
    );

    const { user_id } = checkResult(result);
    return !!user_id;
  } catch (err) {
    return false;
  }
}

/**
 * 兼容性函数 - 获取积分信息
 */
export async function getCredit(authString: string) {
  const {
    credit: { gift_credit, purchase_credit, vip_credit }
  } = await request("POST", "/commerce/v1/benefits/user_credit", authString, {
    data: {},
    headers: {
      Referer: "https://jimeng.jianying.com/ai-tool/image/generate",
    },
    noDefaultParams: true,
    serviceType: 'commerce'
  });

  logger.info(`\n积分信息: \n赠送积分: ${gift_credit}, 购买积分: ${purchase_credit}, VIP积分: ${vip_credit}`);
  return {
    giftCredit: gift_credit,
    purchaseCredit: purchase_credit,
    vipCredit: vip_credit,
    totalCredit: gift_credit + purchase_credit + vip_credit
  }
}

/**
 * 兼容性函数 - 接收今日积分
 */
export async function receiveCredit(authString: string) {
  logger.info("正在收取今日积分...");

  const { cur_total_credits, receive_quota } = await request("POST", "/commerce/v1/benefits/credit_receive", authString, {
    data: {
      time_zone: "Asia/Shanghai"
    },
    headers: {
      Referer: "https://jimeng.jianying.com/ai-tool/image/generate"
    },
    serviceType: 'commerce'
  });

  logger.info(`\n今日${receive_quota}积分收取成功\n剩余积分: ${cur_total_credits}`);
  return cur_total_credits;
}

/**
 * 获取认证信息 - 暴露给外部使用
 */
export async function getAuthInfoForRequest(authString: string, options?: {
  region?: "cn" | "us";
  customUrls?: {
    baseUrl?: string;
    imagexUrl?: string;
    commerceUrl?: string;
  };
}) {
  return getAuthInfo(authString, options);
}

// 导出原有函数以保持兼容性
export { acquireToken, generateCookie } from './core';