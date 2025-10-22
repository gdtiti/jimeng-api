<template>
  <div class="tasks-page">
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
        <h1>任务管理</h1>
      </div>
      <div class="nav-right">
        <el-button
          type="primary"
          @click="showCreateDialog = true"
        >
          <el-icon><Plus /></el-icon>
          创建任务
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filters-section">
      <el-card>
        <div class="filters-content">
          <div class="search-bar">
            <el-input
              v-model="searchQuery"
              placeholder="搜索标题或提示词..."
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button
              type="primary"
              @click="handleSearch"
            >
              搜索
            </el-button>
          </div>

          <div class="filters">
            <el-select
              v-model="statusFilter"
              placeholder="状态筛选"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部" value="" />
              <el-option label="等待中" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
            </el-select>

            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="handleFilter"
            />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <el-card>
        <div class="tasks-header">
          <h3>任务列表</h3>
          <div class="tasks-stats">
            <span>共 {{ tasksStore.pagination.total }} 个任务</span>
            <div class="realtime-controls">
              <div class="realtime-status">
                <el-icon v-if="realTimeActive" class="status-indicator active">
                  <Connection />
                </el-icon>
                <el-icon v-else class="status-indicator inactive">
                  <Connection />
                </el-icon>
                <span class="status-text">
                  {{ realTimeActive ? '智能更新' : '手动模式' }}
                </span>
                <span v-if="lastUpdate" class="last-update">
                  {{ formatTime(lastUpdate) }}
                </span>
              </div>
              <div class="control-buttons">
                <el-button
                  v-if="realTimeActive"
                  size="small"
                  type="warning"
                  @click="stopRealTimeUpdates"
                  :icon="VideoPause"
                >
                  暂停更新
                </el-button>
                <el-button
                  v-else
                  size="small"
                  type="success"
                  @click="startRealTimeUpdates"
                  :icon="VideoPlay"
                >
                  开启更新
                </el-button>
                <el-button
                  size="small"
                  @click="refreshTasks"
                  :loading="tasksStore.loading"
                  :icon="Refresh"
                >
                  手动刷新
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="tasksStore.loading" class="loading-state">
          <el-skeleton :rows="3" animated />
        </div>

        <div v-else-if="filteredTasks.length === 0" class="empty-state">
          <el-empty :description="searchQuery ? '没有找到匹配的任务' : '暂无任务'">
            <el-button
              v-if="!searchQuery"
              type="primary"
              @click="showCreateDialog = true"
            >
              创建第一个任务
            </el-button>
          </el-empty>
        </div>

        <div v-else class="tasks-grid">
          <div
            v-for="task in paginatedTasks"
            :key="task.id"
            class="task-card"
            :class="{ 'processing': task.status === 'processing' }"
          >
            <!-- 任务状态指示器 -->
            <div class="task-status">
              <el-icon v-if="task.status === 'pending'" class="status-icon pending">
                <Clock />
              </el-icon>
              <el-icon v-else-if="task.status === 'processing'" class="status-icon processing">
                <Loading />
              </el-icon>
              <el-icon v-else-if="task.status === 'completed'" class="status-icon completed">
                <SuccessFilled />
              </el-icon>
              <el-icon v-else-if="task.status === 'failed'" class="status-icon failed">
                <CircleCloseFilled />
              </el-icon>
            </div>

            <!-- 任务内容 -->
            <div class="task-content">
              <div class="task-header">
                <h4>{{ task.title }}</h4>
                <el-dropdown @command="(command) => handleTaskAction(command, task)">
                  <el-button text>
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view">查看详情</el-dropdown-item>
                      <el-dropdown-item command="retry" v-if="task.status === 'failed'">
                        重新执行
                      </el-dropdown-item>
                      <el-dropdown-item command="download" v-if="task.status === 'completed'">
                        下载图片
                      </el-dropdown-item>
                      <el-dropdown-item divided command="delete" class="danger">
                        删除任务
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="task-prompt">
                <p>{{ task.prompt }}</p>
                <div v-if="task.negative_prompt" class="negative-prompt">
                  <small>负面: {{ task.negative_prompt }}</small>
                </div>
              </div>

              <!-- 图片预览 -->
              <div v-if="task.image_url" class="task-image">
                <img
                  :src="task.image_url"
                  :alt="task.title"
                  @click="previewImage(task.image_url)"
                />
              </div>

              <!-- 错误信息 -->
              <div v-if="task.status === 'failed' && task.error_message" class="error-message">
                <el-alert
                  :title="task.error_message"
                  type="error"
                  :closable="false"
                  show-icon
                />
              </div>

              <!-- 任务元信息 -->
              <div class="task-meta">
                <el-tag :type="getStatusType(task.status)" size="small">
                  {{ getStatusText(task.status) }}
                </el-tag>
                <span class="task-time">
                  {{ formatTime(task.created_at) }}
                </span>
                <span class="task-model">
                  {{ task.model_name }}
                </span>
                <el-tag :type="task.region === 'us' ? 'warning' : 'primary'" size="small">
                  {{ task.region === 'us' ? '国际' : '国内' }}
                </el-tag>
              </div>

              <!-- 进度条（处理中的任务） -->
              <div v-if="task.status === 'processing'" class="task-progress">
                <el-progress
                  :percentage="getTaskProgress(task)"
                  :status="getTaskProgressStatus(task)"
                  :stroke-width="6"
                />
                <p class="progress-text">{{ getTaskProgressText(task) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="tasksStore.pagination.total > 0" class="pagination-section">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="tasksStore.pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 创建任务对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建新任务"
      width="700px"
      @close="resetForm"
    >
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskRules"
        label-width="100px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input
            v-model="taskForm.title"
            placeholder="请输入任务标题"
            clearable
          />
        </el-form-item>

        <el-form-item label="提示词" prop="prompt">
          <el-input
            v-model="taskForm.prompt"
            type="textarea"
            :rows="4"
            placeholder="请输入图片生成提示词，描述你想要生成的图片内容"
            clearable
            show-word-limit
            maxlength="1000"
          />
        </el-form-item>

        <el-form-item label="负面提示词">
          <el-input
            v-model="taskForm.negative_prompt"
            type="textarea"
            :rows="2"
            placeholder="请输入不希望出现在图片中的内容（可选）"
            clearable
            show-word-limit
            maxlength="500"
          />
        </el-form-item>

        <el-form-item label="Cookie" prop="cookie_string">
          <el-input
            v-model="taskForm.cookie_string"
            type="textarea"
            :rows="3"
            placeholder="请输入你的即梦Cookie字符串，用于身份验证"
            clearable
          />
        </el-form-item>

        <el-form-item label="地区">
          <el-radio-group v-model="taskForm.region">
            <el-radio label="cn">国内版</el-radio>
            <el-radio label="us">国际版</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="模型">
          <el-select v-model="taskForm.model_name" placeholder="选择模型">
            <el-option label="即梦 (推荐)" value="jimeng" />
            <el-option label="NanoBanana" value="nanobanana" />
          </el-select>
        </el-form-item>

        <el-form-item label="高级设置">
          <el-checkbox v-model="taskForm.high_priority">
            高优先级处理
          </el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="creating"
            @click="submitTask"
          >
            {{ creating ? '创建中...' : '创建任务' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="showImagePreview"
      title="图片预览"
      width="80%"
      align-center
    >
      <div class="image-preview">
        <img :src="previewImageUrl" :alt="'预览图片'" />
      </div>
      <template #footer>
        <div class="preview-footer">
          <el-button @click="showImagePreview = false">关闭</el-button>
          <el-button type="primary" @click="downloadCurrentImage">
            <el-icon><Download /></el-icon>
            下载图片
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  Refresh,
  Connection
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useRealTimeUpdates } from '@/composables/useRealTimeUpdates.js'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tasksStore = useTasksStore()

// 响应式数据
const searchQuery = ref('')
const statusFilter = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(20)

const showCreateDialog = ref(false)
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const creating = ref(false)

// 表单数据
const taskFormRef = ref()
const taskForm = reactive({
  title: '',
  prompt: '',
  negative_prompt: '',
  cookie_string: '',
  region: 'cn',
  model_name: 'jimeng',
  high_priority: false
})

const taskRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' }
  ],
  prompt: [
    { required: true, message: '请输入提示词', trigger: 'blur' },
    { min: 5, message: '提示词至少需要5个字符', trigger: 'blur' }
  ],
  cookie_string: [
    { required: true, message: '请输入Cookie字符串', trigger: 'blur' }
  ]
}

// 计算属性
const filteredTasks = computed(() => {
  let tasks = tasksStore.tasks

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.prompt.toLowerCase().includes(query)
    )
  }

  return tasks
})

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTasks.value.slice(start, end)
})

// 方法
const fetchTasks = async () => {
  const params = {
    page: currentPage.value,
    pageSize: pageSize.value
  }

  if (statusFilter.value) {
    params.status = statusFilter.value
  }

  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }

  if (searchQuery.value) {
    params.search = searchQuery.value
  }

  await tasksStore.fetchTasks(params)
}

const handleSearch = () => {
  currentPage.value = 1
  fetchTasks()
}

const handleFilter = () => {
  currentPage.value = 1
  fetchTasks()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchTasks()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  fetchTasks()
}

const submitTask = async () => {
  if (!taskFormRef.value) return

  try {
    const valid = await taskFormRef.value.validate()
    if (!valid) return

    creating.value = true

    await tasksStore.createTask(taskForm)

    showCreateDialog.value = false
    resetForm()
    fetchTasks()

    ElMessage.success('任务创建成功！')
  } catch (error) {
    console.error('创建任务失败:', error)
  } finally {
    creating.value = false
  }
}

const resetForm = () => {
  if (taskFormRef.value) {
    taskFormRef.value.resetFields()
  }
  Object.assign(taskForm, {
    title: '',
    prompt: '',
    negative_prompt: '',
    cookie_string: '',
    region: 'cn',
    model_name: 'jimeng',
    high_priority: false
  })
}

const handleTaskAction = async (command, task) => {
  switch (command) {
    case 'view':
      router.push(`/tasks?id=${task.id}`)
      break
    case 'retry':
      try {
        await ElMessageBox.confirm('确定要重新执行这个任务吗？', '确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await tasksStore.updateTask(task.id, { status: 'pending' })
        ElMessage.success('任务已重新开始')
        fetchTasks()
      } catch {
        // 用户取消
      }
      break
    case 'download':
      downloadImage(task.image_url, task.title)
      break
    case 'delete':
      try {
        await ElMessageBox.confirm('确定要删除这个任务吗？此操作不可恢复。', '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await tasksStore.deleteTask(task.id)
        fetchTasks()
      } catch {
        // 用户取消
      }
      break
  }
}

const previewImage = (imageUrl) => {
  previewImageUrl.value = imageUrl
  showImagePreview.value = true
}

const downloadCurrentImage = () => {
  // 查找当前预览图片对应的任务
  const currentTask = paginatedTasks.value.find(task => task.image_url === previewImageUrl.value)
  const taskTitle = currentTask ? currentTask.title : ''
  downloadImage(previewImageUrl.value, taskTitle)
}

const downloadImage = async (imageUrl, taskTitle = '') => {
  try {
    // 生成文件名
    const sanitizeFilename = (filename) => {
      return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50)
    }

    const filename = taskTitle
      ? `${sanitizeFilename(taskTitle)}-${Date.now()}.jpg`
      : `jimeng-image-${Date.now()}.jpg`

    // 尝试使用fetch下载，这样可以处理跨域问题
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 清理对象URL
      setTimeout(() => window.URL.revokeObjectURL(url), 100)

      ElMessage.success('图片下载成功！')

    } catch (fetchError) {
      console.warn('Fetch下载失败，尝试直接下载:', fetchError)

      // 如果fetch失败，回退到直接链接下载
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = filename
      link.target = '_blank' // 在新标签页打开，作为备选方案
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      ElMessage.info('图片已在新标签页打开，请手动保存')
    }

  } catch (error) {
    console.error('下载图片失败:', error)
    ElMessage.error('下载失败，请尝试右键图片另存为')
  }
}

const formatTime = (time) => {
  return dayjs(time).fromNow()
}

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

const getTaskProgress = (task) => {
  // 模拟进度计算
  if (task.status === 'pending') return 0
  if (task.status === 'processing') {
    const elapsed = Date.now() - new Date(task.created_at).getTime()
    return Math.min(Math.floor((elapsed / 120000) * 100), 95)
  }
  return 100
}

const getTaskProgressStatus = (task) => {
  if (task.status === 'failed') return 'exception'
  if (task.status === 'completed') return 'success'
  return undefined
}

const getTaskProgressText = (task) => {
  if (task.status === 'pending') return '等待开始处理'
  if (task.status === 'processing') return '正在生成图片，请耐心等待...'
  if (task.status === 'completed') return '生成完成'
  if (task.status === 'failed') return '生成失败'
  return ''
}

// 监听路由参数变化
watch(() => route.query.id, async (taskId) => {
  if (taskId) {
    // 如果有任务ID参数，可以显示任务详情
    console.log('查看任务详情:', taskId)
  }
})

// 实时更新功能
const {
  isActive: realTimeActive,
  lastUpdate,
  errorCount,
  connectionStatus,
  startPolling,
  stopPolling,
  triggerUpdate,
  fullRefreshTasks
} = useRealTimeUpdates({
  interval: 10000, // 增加到10秒间隔
  autoStart: true,
  onTaskUpdate: (task, event) => {
    console.log('任务更新事件:', event, task)
    // 可以在这里添加特殊处理逻辑
  },
  onProgress: (taskId, progress) => {
    console.log('任务进度更新:', taskId, progress)
    // 可以在这里更新进度显示
  },
  onError: (error) => {
    console.error('实时更新错误:', error)
  }
})

// 实时更新控制方法
const stopRealTimeUpdates = () => {
  stopPolling()
  ElMessage.info('已切换到手动模式，点击"手动刷新"按钮更新任务列表')
}

const startRealTimeUpdates = () => {
  startPolling()
  ElMessage.success('已开启智能更新模式')
}

const refreshTasks = async () => {
  try {
    await fullRefreshTasks()
    ElMessage.success('任务列表已更新')
  } catch (error) {
    ElMessage.error('刷新失败，请稍后重试')
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.tasks-page {
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

.filters-section {
  margin: 24px;
}

.filters-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-bar {
  display: flex;
  gap: 12px;
}

.search-bar .el-input {
  max-width: 400px;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tasks-section {
  margin: 0 24px;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tasks-header h3 {
  margin: 0;
  color: #333;
}

.tasks-stats {
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.realtime-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.realtime-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.status-indicator {
  font-size: 12px;
}

.status-indicator.active {
  color: #67c23a;
  animation: pulse 2s infinite;
}

.status-indicator.inactive {
  color: #f56c6c;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.status-text {
  font-weight: 500;
}

.last-update {
  color: #bbb;
}

.loading-state {
  padding: 20px 0;
}

.empty-state {
  padding: 60px 0;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.task-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.task-card.processing {
  border-left: 4px solid #e6a23c;
}

.task-status {
  position: absolute;
  top: 20px;
  right: 20px;
}

.status-icon {
  font-size: 20px;
}

.status-icon.pending { color: #909399; }
.status-icon.processing { color: #e6a23c; animation: spin 2s linear infinite; }
.status-icon.completed { color: #67c23a; }
.status-icon.failed { color: #f56c6c; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.task-content {
  padding-right: 30px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.task-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
  line-height: 1.4;
  flex: 1;
}

.task-prompt {
  margin-bottom: 12px;
}

.task-prompt p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.negative-prompt {
  padding: 8px 12px;
  background-color: #fef0f0;
  border-radius: 4px;
  margin-top: 8px;
}

.negative-prompt small {
  color: #f56c6c;
  font-size: 12px;
}

.task-image {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
}

.task-image img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s;
}

.task-image img:hover {
  transform: scale(1.02);
}

.error-message {
  margin: 12px 0;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.task-time {
  color: #999;
  font-size: 12px;
}

.task-model {
  color: #666;
  font-size: 12px;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.task-progress {
  margin-top: 16px;
}

.progress-text {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 12px;
  text-align: center;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.image-preview {
  text-align: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
}

.preview-footer {
  text-align: center;
  margin-top: 16px;
}

.danger {
  color: #f56c6c;
}

.dialog-footer {
  text-align: right;
}
</style>