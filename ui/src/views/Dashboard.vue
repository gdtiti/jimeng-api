<template>
  <div class="dashboard">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-left">
        <h1>即梦AI管理</h1>
      </div>
      <div class="nav-right">
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ authStore.user?.username }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="settings">系统设置</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 侧边导航和主要内容 -->
    <div class="main-content">
      <!-- 侧边导航 -->
      <div class="sidebar">
        <el-menu
          :default-active="$route.path"
          router
          class="sidebar-menu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><House /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><Picture /></el-icon>
            <span>任务管理</span>
          </el-menu-item>
          <el-menu-item index="/settings" v-if="authStore.user?.role === 'admin'">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 内容区域 -->
      <div class="content">
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ stats.total_tasks || 0 }}</h3>
                <p>总任务数</p>
              </div>
            </div>
          </el-card>

          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon completed">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ stats.completed_tasks || 0 }}</h3>
                <p>已完成</p>
              </div>
            </div>
          </el-card>

          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon processing">
                <el-icon><Loading /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ stats.processing_tasks || 0 }}</h3>
                <p>处理中</p>
              </div>
            </div>
          </el-card>

          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon failed">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <div class="stat-info">
                <h3>{{ stats.failed_tasks || 0 }}</h3>
                <p>失败</p>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 快速操作 -->
        <div class="quick-actions">
          <el-card>
            <template #header>
              <div class="card-header">
                <h3>快速操作</h3>
              </div>
            </template>
            <div class="actions-grid">
              <el-button
                type="primary"
                size="large"
                @click="createNewTask"
              >
                <el-icon><Plus /></el-icon>
                创建新任务
              </el-button>
              <el-button
                size="large"
                @click="$router.push('/tasks')"
              >
                <el-icon><List /></el-icon>
                查看所有任务
              </el-button>
            </div>
          </el-card>
        </div>

        <!-- 最近任务 -->
        <div class="recent-tasks">
          <el-card>
            <template #header>
              <div class="card-header">
                <h3>最近任务</h3>
                <el-button text @click="$router.push('/tasks')">
                  查看全部
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </template>
            <div v-if="recentTasks.length === 0" class="empty-state">
              <el-empty description="暂无任务">
                <el-button type="primary" @click="createNewTask">
                  创建第一个任务
                </el-button>
              </el-empty>
            </div>
            <div v-else class="tasks-list">
              <div
                v-for="task in recentTasks"
                :key="task.id"
                class="task-item"
                @click="viewTask(task.id)"
              >
                <div class="task-info">
                  <h4>{{ task.title }}</h4>
                  <p class="task-prompt">{{ task.prompt.substring(0, 100) }}...</p>
                  <div class="task-meta">
                    <el-tag
                      :type="getStatusType(task.status)"
                      size="small"
                    >
                      {{ getStatusText(task.status) }}
                    </el-tag>
                    <span class="task-time">
                      {{ formatTime(task.created_at) }}
                    </span>
                  </div>
                </div>
                <div class="task-image" v-if="task.image_url">
                  <img :src="task.image_url" :alt="task.title" />
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 趋势图表 -->
        <div class="trends-chart">
          <el-card>
            <template #header>
              <div class="card-header">
                <h3>7天任务趋势</h3>
              </div>
            </template>
            <div class="chart-container">
              <div class="chart-placeholder">
                <p>📊 任务趋势图表</p>
                <p class="chart-description">
                  最近7天任务创建和完成情况
                </p>
                <div class="trend-summary">
                  <div class="trend-item">
                    <span>今日任务:</span>
                    <strong>{{ stats.tasks_today || 0 }}</strong>
                  </div>
                  <div class="trend-item">
                    <span>本周任务:</span>
                    <strong>{{ stats.tasks_this_week || 0 }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 创建任务对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建新任务"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskRules"
        label-width="80px"
      >
        <el-form-item label="标题" prop="title">
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
            placeholder="请输入图片生成提示词"
            clearable
          />
        </el-form-item>

        <el-form-item label="负面提示词">
          <el-input
            v-model="taskForm.negative_prompt"
            type="textarea"
            :rows="2"
            placeholder="请输入负面提示词（可选）"
            clearable
          />
        </el-form-item>

        <el-form-item label="Cookie" prop="cookie_string">
          <el-input
            v-model="taskForm.cookie_string"
            type="textarea"
            :rows="3"
            placeholder="请输入即梦Cookie字符串"
            clearable
          />
        </el-form-item>

        <el-form-item label="地区">
          <el-select v-model="taskForm.region" placeholder="选择地区">
            <el-option label="国内" value="cn" />
            <el-option label="国际" value="us" />
          </el-select>
        </el-form-item>

        <el-form-item label="模型">
          <el-select v-model="taskForm.model_name" placeholder="选择模型">
            <el-option label="即梦" value="jimeng" />
            <el-option label="NanoBanana" value="nanobanana" />
          </el-select>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const router = useRouter()
const authStore = useAuthStore()
const tasksStore = useTasksStore()

// 数据
const stats = ref({})
const recentTasks = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)

// 表单数据
const taskFormRef = ref()
const taskForm = reactive({
  title: '',
  prompt: '',
  negative_prompt: '',
  cookie_string: '',
  region: 'cn',
  model_name: 'jimeng'
})

const taskRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' }
  ],
  prompt: [
    { required: true, message: '请输入提示词', trigger: 'blur' }
  ],
  cookie_string: [
    { required: true, message: '请输入Cookie字符串', trigger: 'blur' }
  ]
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const response = await fetch('/api/tasks/stats', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await response.json()
    stats.value = data.stats
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 获取最近任务
const fetchRecentTasks = async () => {
  try {
    await tasksStore.fetchTasks({ page: 1, pageSize: 5 })
    recentTasks.value = tasksStore.tasks
  } catch (error) {
    console.error('获取最近任务失败:', error)
  }
}

// 创建新任务
const createNewTask = () => {
  showCreateDialog.value = true
}

// 提交任务
const submitTask = async () => {
  if (!taskFormRef.value) return

  try {
    const valid = await taskFormRef.value.validate()
    if (!valid) return

    creating.value = true

    await tasksStore.createTask(taskForm)

    showCreateDialog.value = false
    resetForm()

    // 刷新数据
    await fetchStats()
    await fetchRecentTasks()

    ElMessage.success('任务创建成功，正在处理中...')
  } catch (error) {
    console.error('创建任务失败:', error)
  } finally {
    creating.value = false
  }
}

// 重置表单
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
    model_name: 'jimeng'
  })
}

// 查看任务详情
const viewTask = (taskId) => {
  router.push(`/tasks?id=${taskId}`)
}

// 格式化时间
const formatTime = (time) => {
  return dayjs(time).fromNow()
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

// 处理命令
const handleCommand = async (command) => {
  switch (command) {
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        authStore.logout()
        router.push('/login')
      } catch {
        // 用户取消
      }
      break
    case 'settings':
      router.push('/settings')
      break
    case 'profile':
      // TODO: 实现个人中心
      ElMessage.info('个人中心功能开发中')
      break
  }
}

// 页面加载时获取数据
onMounted(async () => {
  await Promise.all([
    fetchStats(),
    fetchRecentTasks()
  ])
})
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.top-nav {
  background: white;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-left h1 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.main-content {
  display: flex;
  height: calc(100vh - 64px);
}

.sidebar {
  width: 200px;
  background: white;
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
}

.sidebar-menu {
  border: none;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.total { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-icon.completed { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-icon.processing { background: linear-gradient(135deg, #fa709a, #fee140); }
.stat-icon.failed { background: linear-gradient(135deg, #ff6b6b, #ee5a52); }

.stat-info h3 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.stat-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.quick-actions {
  margin-bottom: 24px;
}

.actions-grid {
  display: flex;
  gap: 16px;
}

.recent-tasks {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #333;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.task-info {
  flex: 1;
}

.task-info h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
}

.task-prompt {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-time {
  color: #999;
  font-size: 12px;
}

.task-image {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}

.task-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.trends-chart {
  margin-bottom: 24px;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
}

.chart-placeholder p {
  margin: 8px 0;
  color: #666;
}

.chart-description {
  font-size: 14px;
  color: #999;
}

.trend-summary {
  display: flex;
  gap: 32px;
  margin-top: 20px;
  justify-content: center;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trend-item span {
  color: #666;
  font-size: 14px;
}

.trend-item strong {
  color: #333;
  font-size: 18px;
}

.dialog-footer {
  text-align: right;
}
</style>