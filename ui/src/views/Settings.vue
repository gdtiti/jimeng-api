<template>
  <div class="settings-page">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-left">
        <el-button
          text
          @click="$router.back()"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>系统设置</h1>
      </div>
      <div class="nav-right">
        <el-button @click="exportSettings">
          <el-icon><Download /></el-icon>
          导出设置
        </el-button>
        <el-button @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          导入设置
        </el-button>
      </div>
    </div>

    <div class="settings-content">
      <!-- 轮询配置 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <h3>
              <el-icon><Timer /></el-icon>
              轮询配置
            </h3>
            <p class="card-description">配置图片生成轮询间隔和等待时间</p>
          </div>
        </template>

        <el-form :model="settings.polling" label-width="150px">
          <el-form-item label="轮询间隔">
            <el-input-number
              v-model="settings.polling.polling_interval"
              :min="1000"
              :max="60000"
              :step="1000"
              :suffix="pollingIntervalSuffix"
              @change="updateSetting('polling_interval', settings.polling.polling_interval)"
            />
            <div class="form-help">
              轮询查询图片生成状态的时间间隔（毫秒），默认3000ms（3秒）
            </div>
          </el-form-item>

          <el-form-item label="最大等待时间">
            <el-input-number
              v-model="settings.polling.max_wait_time"
              :min="60000"
              :max="3600000"
              :step="10000"
              :suffix="waitTimeSuffix"
              @change="updateSetting('max_wait_time', settings.polling.max_wait_time)"
            />
            <div class="form-help">
              图片生成的最大等待时间（毫秒），默认400000ms（400秒）
            </div>
          </el-form-item>

          <el-form-item label="任务超时时间">
            <el-input-number
              v-model="settings.polling.task_timeout"
              :min="60000"
              :max="3600000"
              :step="10000"
              :suffix="waitTimeSuffix"
              @change="updateSetting('task_timeout', settings.polling.task_timeout)"
            />
            <div class="form-help">
              单个任务的超时时间（毫秒），默认600000ms（10分钟）
            </div>
          </el-form-item>

          <el-form-item label="最大并发任务">
            <el-input-number
              v-model="settings.polling.max_concurrent_tasks"
              :min="1"
              :max="20"
              @change="updateSetting('max_concurrent_tasks', settings.polling.max_concurrent_tasks)"
            />
            <div class="form-help">
              同时处理的最大任务数量，默认5个
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 上传配置 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <h3>
              <el-icon><Upload /></el-icon>
              上传配置
            </h3>
            <p class="card-description">配置文件上传相关参数</p>
          </div>
        </template>

        <el-form :model="settings.upload" label-width="150px">
          <el-form-item label="最大文件大小">
            <el-input-number
              v-model="settings.upload.max_file_size"
              :min="1024"
              :max="104857600"
              :step="1024"
              :suffix="fileSizeSuffix"
              @change="updateSetting('max_file_size', settings.upload.max_file_size)"
            />
            <div class="form-help">
              单个文件的最大大小（字节），默认104857600（100MB）
            </div>
          </el-form-item>

          <el-form-item label="上传目录">
            <el-input
              v-model="settings.upload.upload_dir"
              placeholder="上传文件保存目录"
              @change="updateSetting('upload_dir', settings.upload.upload_dir)"
            />
            <div class="form-help">
              文件上传后保存的目录路径
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 默认配置 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <h3>
              <el-icon><Setting /></el-icon>
              默认配置
            </h3>
            <p class="card-description">设置新任务的默认参数</p>
          </div>
        </template>

        <el-form :model="settings.defaults" label-width="150px">
          <el-form-item label="默认模型">
            <el-select
              v-model="settings.defaults.default_model"
              @change="updateSetting('default_model', settings.defaults.default_model)"
            >
              <el-option label="即梦" value="jimeng" />
              <el-option label="NanoBanana" value="nanobanana" />
            </el-select>
            <div class="form-help">
              创建新任务时默认使用的模型
            </div>
          </el-form-item>

          <el-form-item label="默认地区">
            <el-radio-group
              v-model="settings.defaults.default_region"
              @change="updateSetting('default_region', settings.defaults.default_region)"
            >
              <el-radio label="cn">国内版</el-radio>
              <el-radio label="us">国际版</el-radio>
            </el-radio-group>
            <div class="form-help">
              创建新任务时默认选择的地区
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 系统信息 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <h3>
              <el-icon><InfoFilled /></el-icon>
              系统信息
            </h3>
            <p class="card-description">查看系统运行状态和信息</p>
          </div>
        </template>

        <div class="system-info">
          <div class="info-grid">
            <div class="info-item">
              <label>运行时间</label>
              <span>{{ formatUptime(systemInfo.uptime) }}</span>
            </div>
            <div class="info-item">
              <label>系统时间</label>
              <span>{{ formatTime(systemInfo.currentTime) }}</span>
            </div>
            <div class="info-item">
              <label>用户角色</label>
              <el-tag :type="authStore.user?.role === 'admin' ? 'danger' : 'primary'">
                {{ authStore.user?.role === 'admin' ? '管理员' : '普通用户' }}
              </el-tag>
            </div>
            <div class="info-item">
              <label>数据库</label>
              <span>SQLite</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="resetToDefaults">
          <el-icon><RefreshLeft /></el-icon>
          恢复默认设置
        </el-button>
        <el-button @click="refreshSettings">
          <el-icon><Refresh /></el-icon>
          刷新设置
        </el-button>
      </div>
    </div>

    <!-- 导入设置对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入设置"
      width="500px"
    >
      <div class="import-content">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          accept=".json"
          drag
        >
          <div class="upload-area">
            <el-icon class="upload-icon"><Upload /></el-icon>
            <div class="upload-text">
              <p>将设置文件拖拽到此处，或<em>点击上传</em></p>
              <p class="upload-hint">仅支持JSON格式文件</p>
            </div>
          </div>
        </el-upload>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="importing"
            :disabled="!importFile"
            @click="importSettings"
          >
            {{ importing ? '导入中...' : '导入' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import api from '@/utils/api'

const authStore = useAuthStore()

// 响应式数据
const settings = reactive({
  polling: {
    polling_interval: 3000,
    max_wait_time: 400000,
    task_timeout: 600000,
    max_concurrent_tasks: 5
  },
  upload: {
    max_file_size: 104857600,
    upload_dir: './uploads'
  },
  defaults: {
    default_model: 'jimeng',
    default_region: 'cn'
  }
})

const systemInfo = reactive({
  uptime: 0,
  currentTime: new Date()
})

const showImportDialog = ref(false)
const importing = ref(false)
const importFile = ref(null)
const uploadRef = ref()

// 计算属性
const pollingIntervalSuffix = computed(() => {
  const value = settings.polling.polling_interval
  if (value >= 60000) return `${value / 60000}分钟`
  return `${value / 1000}秒`
})

const waitTimeSuffix = computed(() => {
  const value = settings.polling.max_wait_time
  if (value >= 60000) return `${value / 60000}分钟`
  return `${value / 1000}秒`
})

const fileSizeSuffix = computed(() => {
  const value = settings.upload.max_file_size
  if (value >= 1048576) return `${(value / 1048576).toFixed(1)}MB`
  if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`
  return `${value}B`
})

// 方法
const fetchSettings = async () => {
  try {
    const response = await api.get('/settings')
    const data = response.data

    // 更新设置
    if (data.settings) {
      Object.assign(settings.polling, {
        polling_interval: parseInt(data.settings.polling_interval?.value || 3000),
        max_wait_time: parseInt(data.settings.max_wait_time?.value || 400000),
        task_timeout: parseInt(data.settings.task_timeout?.value || 600000),
        max_concurrent_tasks: parseInt(data.settings.max_concurrent_tasks?.value || 5)
      })

      Object.assign(settings.upload, {
        max_file_size: parseInt(data.settings.max_file_size?.value || 104857600),
        upload_dir: data.settings.upload_dir?.value || './uploads'
      })

      Object.assign(settings.defaults, {
        default_model: data.settings.default_model?.value || 'jimeng',
        default_region: data.settings.default_region?.value || 'cn'
      })
    }
  } catch (error) {
    console.error('获取设置失败:', error)
    ElMessage.error('获取设置失败')
  }
}

const updateSetting = async (key, value) => {
  try {
    await api.put('/settings', {
      [key]: value.toString()
    })

    ElMessage.success('设置更新成功')
  } catch (error) {
    console.error('更新设置失败:', error)
    ElMessage.error('更新设置失败')
  }
}

const resetToDefaults = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复所有设置为默认值吗？此操作不可恢复。',
      '确认重置',
      {
        confirmButtonText: '重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const defaultKeys = Object.keys({
      polling_interval: '3000',
      max_wait_time: '400000',
      task_timeout: '600000',
      max_concurrent_tasks: '5',
      max_file_size: '104857600',
      upload_dir: './uploads',
      default_model: 'jimeng',
      default_region: 'cn'
    })

    const response = await fetch('/api/settings/reset', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keys: defaultKeys
      })
    })

    if (response.ok) {
      ElMessage.success('设置已恢复为默认值')
      await fetchSettings()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置设置失败:', error)
      ElMessage.error('重置设置失败')
    }
  }
}

const refreshSettings = async () => {
  ElMessage.info('正在刷新设置...')
  await fetchSettings()
  ElMessage.success('设置已刷新')
}

const exportSettings = async () => {
  try {
    const response = await fetch('/api/settings/export', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `jimeng-settings-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      ElMessage.success('设置导出成功')
    }
  } catch (error) {
    console.error('导出设置失败:', error)
    ElMessage.error('导出设置失败')
  }
}

const handleFileChange = (file) => {
  if (file.raw) {
    importFile.value = file.raw
  }
}

const importSettings = async () => {
  if (!importFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  try {
    importing.value = true

    const text = await importFile.value.text()
    const data = JSON.parse(text)

    const response = await fetch('/api/settings/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        settings: data
      })
    })

    if (response.ok) {
      ElMessage.success('设置导入成功')
      showImportDialog.value = false
      importFile.value = null
      if (uploadRef.value) {
        uploadRef.value.clearFiles()
      }
      await fetchSettings()
    }
  } catch (error) {
    console.error('导入设置失败:', error)
    ElMessage.error('导入设置失败：请检查文件格式')
  } finally {
    importing.value = false
  }
}

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

const formatTime = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const updateSystemInfo = () => {
  systemInfo.currentTime = new Date()
  // 在实际应用中，这里可以从服务器获取系统信息
}

// 定时更新系统信息
let systemInfoTimer

onMounted(async () => {
  await fetchSettings()
  updateSystemInfo()

  systemInfoTimer = setInterval(updateSystemInfo, 60000) // 每分钟更新一次
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (systemInfoTimer) {
    clearInterval(systemInfoTimer)
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40px;
}

.top-nav {
  background: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-left h1 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.settings-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-card {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #333;
  font-size: 18px;
}

.card-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.form-help {
  margin-top: 4px;
  color: #999;
  font-size: 12px;
  line-height: 1.4;
}

.system-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.info-item label {
  color: #666;
  font-weight: 500;
}

.info-item span {
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.import-content {
  padding: 20px 0;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  padding: 40px;
  text-align: center;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #409eff;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 8px 0;
  color: #606266;
}

.upload-hint {
  color: #909399;
  font-size: 12px;
}

.dialog-footer {
  text-align: right;
}
</style>