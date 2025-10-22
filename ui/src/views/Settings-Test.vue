<template>
  <div class="settings-test-page">
    <h1>设置页面测试</h1>
    <p>如果你能看到这个页面，说明路由正常工作</p>

    <div class="test-section">
      <h2>API测试</h2>
      <button @click="testAPI">测试获取设置</button>
      <div v-if="apiResult" class="result">
        <h3>API结果:</h3>
        <pre>{{ JSON.stringify(apiResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>用户信息测试</h2>
      <button @click="testAuth">测试用户认证</button>
      <div v-if="userResult" class="result">
        <h3>用户信息:</h3>
        <pre>{{ JSON.stringify(userResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>设置表单测试</h2>
      <div class="form-group">
        <label>轮询间隔 (毫秒):</label>
        <input v-model="settings.polling_interval" type="number" />
      </div>
      <div class="form-group">
        <label>最大等待时间 (毫秒):</label>
        <input v-model="settings.max_wait_time" type="number" />
      </div>
      <button @click="saveSettings">保存设置</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const authStore = useAuthStore()

const apiResult = ref(null)
const userResult = ref(null)

const settings = reactive({
  polling_interval: 3000,
  max_wait_time: 400000,
  task_timeout: 600000,
  max_concurrent_tasks: 5
})

const testAPI = async () => {
  try {
    console.log('测试API调用...')
    const response = await api.get('/settings')
    console.log('API响应:', response)
    apiResult.value = response.data
    ElMessage.success('API测试成功')
  } catch (error) {
    console.error('API测试失败:', error)
    apiResult.value = { error: error.message }
    ElMessage.error('API测试失败')
  }
}

const testAuth = async () => {
  try {
    console.log('测试用户认证...')
    const response = await api.get('/auth/me')
    console.log('认证响应:', response)
    userResult.value = response.data
    ElMessage.success('认证测试成功')
  } catch (error) {
    console.error('认证测试失败:', error)
    userResult.value = { error: error.message }
    ElMessage.error('认证测试失败')
  }
}

const saveSettings = async () => {
  try {
    console.log('保存设置:', settings)
    await api.put('/settings', settings)
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败')
  }
}

onMounted(() => {
  console.log('Settings Test 组件已挂载')
  console.log('用户认证状态:', authStore.isAuthenticated)
  console.log('用户信息:', authStore.user)
  console.log('Token:', authStore.token ? '已设置' : '未设置')
})
</script>

<style scoped>
.settings-test-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.form-group {
  margin: 15px 0;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 200px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.result {
  margin-top: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

button {
  padding: 10px 20px;
  margin: 5px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #66b1ff;
}
</style>