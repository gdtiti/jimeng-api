import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const currentTask = ref(null)
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 获取任务列表
  const fetchTasks = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/tasks', {
        params: {
          page: pagination.value.page,
          pageSize: pagination.value.pageSize,
          ...params
        }
      })

      tasks.value = response.data.tasks
      pagination.value.total = response.data.pagination.total
      pagination.value.page = response.data.pagination.page
      pagination.value.pageSize = response.data.pagination.pageSize

      return response.data
    } catch (error) {
      ElMessage.error('获取任务列表失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建任务
  const createTask = async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData)
      const newTask = response.data.task

      // 添加到任务列表开头
      tasks.value.unshift(newTask)
      pagination.value.total += 1

      ElMessage.success('任务创建成功')
      return newTask
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建任务失败')
      throw error
    }
  }

  // 获取任务详情
  const fetchTask = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`)
      currentTask.value = response.data.task
      return response.data.task
    } catch (error) {
      ElMessage.error('获取任务详情失败')
      throw error
    }
  }

  // 更新任务状态
  const updateTask = async (taskId, updateData) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, updateData)
      const updatedTask = response.data

      // 更新任务列表中的对应任务
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      // 更新当前任务
      if (currentTask.value?.id === taskId) {
        currentTask.value = updatedTask
      }

      return updatedTask
    } catch (error) {
      ElMessage.error('更新任务失败')
      throw error
    }
  }

  // 删除任务
  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`)

      // 从任务列表中移除
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value.splice(index, 1)
        pagination.value.total -= 1
      }

      // 清除当前任务
      if (currentTask.value?.id === taskId) {
        currentTask.value = null
      }

      ElMessage.success('任务删除成功')
    } catch (error) {
      ElMessage.error('删除任务失败')
      throw error
    }
  }

  // 重试任务
  const retryTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/retry`)

      // 更新任务状态
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index !== -1) {
        tasks.value[index].status = 'pending'
        tasks.value[index].error_message = null
        tasks.value[index].image_url = null
        tasks.value[index].completed_at = null
      }

      ElMessage.success('任务重新开始')
    } catch (error) {
      ElMessage.error('重试任务失败')
      throw error
    }
  }

  // 搜索任务
  const searchTasks = async (searchQuery) => {
    return fetchTasks({ search: searchQuery })
  }

  // 设置分页
  const setPagination = (pageData) => {
    pagination.value = { ...pagination.value, ...pageData }
  }

  // 开始轮询任务状态
  const startPolling = async (taskId, callback) => {
    const pollInterval = 3000 // 默认3秒轮询

    const poll = async () => {
      try {
        const task = await fetchTask(taskId)
        callback(task)

        // 如果任务完成或失败，停止轮询
        if (['completed', 'failed'].includes(task.status)) {
          return
        }

        // 继续轮询
        setTimeout(poll, pollInterval)
      } catch (error) {
        console.error('轮询任务状态失败:', error)
        setTimeout(poll, pollInterval)
      }
    }

    setTimeout(poll, pollInterval)
  }

  return {
    tasks,
    currentTask,
    loading,
    pagination,
    fetchTasks,
    createTask,
    fetchTask,
    updateTask,
    deleteTask,
    retryTask,
    searchTasks,
    setPagination,
    startPolling
  }
})