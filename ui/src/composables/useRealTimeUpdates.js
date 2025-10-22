import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { ElMessage } from 'element-plus'

export function useRealTimeUpdates(options = {}) {
  const {
    interval = 10000, // 增加轮询间隔到10秒
    autoStart = true,
    onTaskUpdate,
    onProgress,
    onError
  } = options

  const authStore = useAuthStore()
  const tasksStore = useTasksStore()

  const isActive = ref(false)
  const pollingInterval = ref(null)
  const lastUpdate = ref(null)
  const errorCount = ref(0)
  const maxErrors = 3
  const lastTaskStates = ref(new Map()) // 缓存任务状态
  const lastRefreshTime = ref(0) // 最后完整刷新时间
  const refreshCooldown = 30000 // 30秒内只允许一次完整刷新

  // 防抖函数
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // 节流函数
  function throttle(func, limit) {
    let inThrottle
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  // 开始轮询
  const startPolling = () => {
    if (isActive.value) return

    isActive.value = true
    errorCount.value = 0

    console.log('开始实时任务更新轮询 (间隔:', interval, 'ms)')

    // 立即执行一次
    pollForUpdates()

    // 设置定时轮询
    pollingInterval.value = setInterval(() => {
      pollForUpdates()
    }, interval)
  }

  // 停止轮询
  const stopPolling = () => {
    if (!isActive.value) return

    isActive.value = false

    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }

    console.log('停止实时任务更新轮询')
  }

  // 智能更新单个任务
  const updateSingleTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) return

      const data = await response.json()
      const updatedTask = data.task

      // 只更新这个任务，不刷新整个列表
      const taskIndex = tasksStore.tasks.findIndex(t => t.id === taskId)
      if (taskIndex !== -1) {
        // 检查状态是否真的变化了
        const currentTask = tasksStore.tasks[taskIndex]
        if (currentTask.status !== updatedTask.status ||
            currentTask.image_url !== updatedTask.image_url) {
          tasksStore.tasks[taskIndex] = updatedTask
          console.log(`智能更新任务 ${taskId}: ${currentTask.status} -> ${updatedTask.status}`)
        }
      }
    } catch (error) {
      console.error(`更新任务 ${taskId} 失败:`, error)
    }
  }

  // 完整刷新任务列表（带冷却时间）
  const fullRefreshTasks = debounce(async () => {
    const now = Date.now()
    if (now - lastRefreshTime.value < refreshCooldown) {
      console.log('刷新冷却中，跳过完整刷新')
      return
    }

    try {
      await tasksStore.fetchTasks({ pageSize: 20 })
      lastRefreshTime.value = now
      console.log('执行完整任务列表刷新')
    } catch (error) {
      console.error('完整刷新失败:', error)
    }
  }, 1000) // 1秒防抖

  // 轮询更新
  const pollForUpdates = async () => {
    try {
      if (!authStore.isAuthenticated) {
        stopPolling()
        return
      }

      // 获取当前活跃任务
      const activeTasks = await fetchActiveTasks()

      // 智能更新：只更新有变化的任务
      await smartTaskUpdate(activeTasks)

      // 更新最后检查时间
      lastUpdate.value = new Date()

      // 重置错误计数
      errorCount.value = 0

    } catch (error) {
      console.error('轮询更新失败:', error)
      errorCount.value++

      // 连续错误达到最大次数时停止轮询
      if (errorCount.value >= maxErrors) {
        stopPolling()
        ElMessage.error('实时更新连接失败，请刷新页面重试')
        onError?.(error)
      }
    }
  }

  // 智能任务更新
  const smartTaskUpdate = async (activeTasks) => {
    const currentTasks = tasksStore.tasks
    const currentTaskMap = new Map(currentTasks.map(task => [task.id, task]))

    // 检查新任务和状态变化
    const tasksNeedingUpdate = []

    for (const activeTask of activeTasks) {
      const currentTask = currentTaskMap.get(activeTask.id)
      const lastState = lastTaskStates.value.get(activeTask.id)

      if (!currentTask) {
        // 新任务
        console.log('发现新任务:', activeTask.id)
        tasksNeedingUpdate.push('new')
      } else if (currentTask.status !== activeTask.status) {
        // 状态变化
        console.log(`任务状态变化: ${activeTask.id} ${currentTask.status} -> ${activeTask.status}`)

        if (activeTask.status === 'completed') {
          ElMessage.success(`任务 "${activeTask.title}" 已完成`)
        } else if (activeTask.status === 'failed') {
          ElMessage.error(`任务 "${activeTask.title}" 失败`)
        }

        tasksNeedingUpdate.push('status_changed')
      }
    }

    // 检查已完成的任务
    const activeTaskIds = new Set(activeTasks.map(task => task.id))
    for (const currentTask of currentTasks) {
      if ((currentTask.status === 'pending' || currentTask.status === 'processing') &&
          !activeTaskIds.has(currentTask.id)) {
        console.log('检测到任务可能已完成:', currentTask.id)
        tasksNeedingUpdate.push('completed_or_failed')
        break
      }
    }

    // 只有在必要时才更新
    if (tasksNeedingUpdate.length > 0) {
      // 如果有多个任务需要更新，执行完整刷新
      if (tasksNeedingUpdate.length > 1) {
        await fullRefreshTasks()
      } else {
        // 单个任务更新，尝试智能更新
        const taskId = activeTasks[0]?.id
        if (taskId) {
          await updateSingleTask(taskId)
        }
      }
    }

    // 更新状态缓存
    for (const task of activeTasks) {
      lastTaskStates.value.set(task.id, {
        status: task.status,
        image_url: task.image_url,
        updated_at: task.updated_at
      })
    }
  }

  // 获取活跃任务
  const fetchActiveTasks = async () => {
    try {
      const response = await fetch('/api/tasks?status=pending,processing&pageSize=10', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error(`获取活跃任务失败: ${response.status}`)
      }

      const data = await response.json()
      return data.tasks || []

    } catch (error) {
      console.error('获取活跃任务失败:', error)
      return []
    }
  }

  // 检查任务进度（减少频率）
  const checkTaskProgress = throttle(async (activeTasks) => {
    for (const task of activeTasks) {
      if (task.status === 'processing') {
        try {
          const response = await fetch(`/api/tasks/${task.id}`, {
            headers: {
              'Authorization': `Bearer ${authStore.token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            if (data.progress && data.progress.length > 0) {
              const latestProgress = data.progress[0]
              onProgress?.(task.id, latestProgress)
            }
          }
        } catch (error) {
          console.error(`获取任务 ${task.id} 进度失败:`, error)
        }
      }
    }
  }, 5000) // 5秒节流

  // 手动触发更新
  const triggerUpdate = () => {
    pollForUpdates()
  }

  // 获取连接状态
  const getConnectionStatus = () => {
    if (!isActive.value) return 'disconnected'
    if (errorCount.value > 0) return 'error'
    return 'connected'
  }

  // 组件挂载时自动开始
  onMounted(() => {
    if (autoStart && authStore.isAuthenticated) {
      startPolling()
    }
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopPolling()
  })

  return {
    isActive,
    lastUpdate,
    errorCount,
    connectionStatus: getConnectionStatus(),
    startPolling,
    stopPolling,
    triggerUpdate,
    updateSingleTask,
    fullRefreshTasks
  }
}