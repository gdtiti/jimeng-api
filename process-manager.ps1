# 即梦AI项目进程管理器 PowerShell 脚本
# 使用方法: 在项目根目录下运行 .\process-manager.ps1

param(
    [string]$Action = "menu",
    [switch]$Force
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "即梦AI项目进程管理器"

# 项目路径
$ProjectPath = $PSScriptRoot

# 颜色设置
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

# 输出带颜色的文本
function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Colors[$Color]
}

# 显示标题
function Show-Header {
    param([string]$Title)
    Write-ColorText "╔══════════════════════════════════════════════════════════════╗" "Header"
    Write-ColorText "║ $($Title.PadRight(58)) ║" "Header"
    Write-ColorText "╚══════════════════════════════════════════════════════════════╝" "Header"
    Write-Host ""
}

# 检查进程状态
function Get-ProcessStatus {
    Show-Header "当前运行状态检查"

    Write-ColorText "📊 检查后端服务器进程..." "Info"
    $BackendProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*debug-server*" }
    if ($BackendProcesses) {
        Write-ColorText "✅ 后端调试服务器正在运行" "Success"
        Write-ColorText "   📍 端口: 4000" "Info"
        Write-ColorText "   🔄 PID: $($BackendProcesses.Id)" "Info"
    } else {
        Write-ColorText "❌ 后端调试服务器未运行" "Error"
    }

    Write-Host ""
    Write-ColorText "📊 检查前端开发服务器进程..." "Info"
    $FrontendProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*vite*" }
    if ($FrontendProcesses) {
        Write-ColorText "✅ 前端开发服务器正在运行 ($($FrontendProcesses.Count) 个进程)" "Success"
        foreach ($proc in $FrontendProcesses) {
            Write-ColorText "   🔄 PID: $($proc.Id) - $($proc.MainWindowTitle)" "Info"
        }
    } else {
        Write-ColorText "❌ 前端开发服务器未运行" "Error"
    }

    Write-Host ""
    Write-ColorText "📊 检查端口占用情况..." "Info"

    # 检查后端端口
    $BackendPort = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
    if ($BackendPort) {
        Write-ColorText "✅ 端口 4000 被占用 (PID: $($BackendPort.OwningProcess))" "Success"
    } else {
        Write-ColorText "❌ 端口 4000 空闲" "Warning"
    }

    # 检查前端端口
    Write-ColorText "🔍 检查前端端口 3000-3010:" "Info"
    for ($port = 3000; $port -le 3010; $port++) {
        $PortInfo = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($PortInfo) {
            Write-ColorText "✅ 端口 $port 被占用 (PID: $($PortInfo.OwningProcess))" "Success"
        } else {
            Write-ColorText "❌ 端口 $port 空闲" "Warning"
        }
    }
}

# 关闭所有项目进程
function Stop-AllProcesses {
    Show-Header "关闭所有项目进程"

    if (-not $Force) {
        Write-ColorText "⚠️  即将关闭所有项目相关进程，是否继续？" "Warning"
        Write-Host ""
        Write-ColorText "[Y] 是，关闭所有进程" "Info"
        Write-ColorText "[N] 否，返回主菜单" "Info"
        Write-Host ""
        $confirm = Read-Host "请选择 (Y/N)"
        if ($confirm -ne "Y") { return }
    }

    Write-Host ""
    Write-ColorText "🔄 正在关闭项目进程..." "Info"

    # 关闭后端服务器
    Write-ColorText "📡 关闭后端服务器..." "Info"
    $BackendProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*debug-server*" }
    if ($BackendProcesses) {
        $BackendProcesses | Stop-Process -Force
        Write-ColorText "   ✅ 已关闭 $($BackendProcesses.Count) 个后端进程" "Success"
    }

    # 关闭前端服务器
    Write-ColorText "🎨 关闭前端服务器..." "Info"
    $FrontendProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*vite*" }
    if ($FrontendProcesses) {
        $FrontendProcesses | Stop-Process -Force
        Write-ColorText "   ✅ 已关闭 $($FrontendProcesses.Count) 个前端进程" "Success"
    }

    # 关闭端口占用的Node进程
    Write-ColorText "🔧 清理端口占用..." "Info"
    for ($port = 3000; $port -le 3010; $port++) {
        $PortInfo = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($PortInfo) {
            try {
                $Process = Get-Process -Id $PortInfo.OwningProcess -ErrorAction SilentlyContinue
                if ($Process -and $Process.ProcessName -eq "node") {
                    $Process | Stop-Process -Force
                    Write-ColorText "   ✅ 已清理端口 $port 占用" "Success"
                }
            } catch {
                # 忽略无法访问的进程
            }
        }
    }

    # 关闭端口4000占用
    $BackendPort = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
    if ($BackendPort) {
        try {
            $Process = Get-Process -Id $BackendPort.OwningProcess -ErrorAction SilentlyContinue
            if ($Process -and $Process.ProcessName -eq "node") {
                $Process | Stop-Process -Force
                Write-ColorText "   ✅ 已清理端口4000占用" "Success"
            }
        } catch {
            # 忽略无法访问的进程
        }
    }

    # 等待进程完全关闭
    Start-Sleep -Seconds 2

    Write-Host ""
    Write-ColorText "✅ 所有项目进程已关闭" "Success"
}

# 启动后端服务器
function Start-Backend {
    Show-Header "启动后端API服务器"

    # 检查端口4000是否被占用
    $BackendPort = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
    if ($BackendPort) {
        Write-ColorText "⚠️  端口4000已被占用，正在尝试关闭占用进程..." "Warning"
        try {
            $Process = Get-Process -Id $BackendPort.OwningProcess -ErrorAction SilentlyContinue
            if ($Process) {
                $Process | Stop-Process -Force
                Start-Sleep -Seconds 2
            }
        } catch {
            Write-ColorText "❌ 无法关闭占用进程，请手动处理" "Error"
            return
        }
    }

    Write-ColorText "🚀 启动后端调试服务器..." "Info"
    Set-Location $ProjectPath
    Start-Process "cmd.exe" -ArgumentList "/k", "node debug-server.cjs" -WindowStyle Normal

    Write-Host ""
    Write-ColorText "✅ 后端服务器已启动" "Success"
    Write-ColorText "📍 地址: http://localhost:4000" "Info"
    Write-ColorText "👑 账户: admin / admin123" "Info"
}

# 启动前端服务器
function Start-Frontend {
    Show-Header "启动前端开发服务器"

    # 查找可用端口
    $FrontendPort = 3010
    for ($port = 3010; $port -ge 3000; $port--) {
        $PortInfo = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if (-not $PortInfo) {
            $FrontendPort = $port
            break
        }
    }

    Write-ColorText "🎨 启动前端开发服务器..." "Info"
    Write-ColorText "📍 端口: $FrontendPort" "Info"

    Set-Location "$ProjectPath\ui"
    Start-Process "cmd.exe" -ArgumentList "/k", "npm run dev -- --port $FrontendPort" -WindowStyle Normal

    Write-Host ""
    Write-ColorText "✅ 前端服务器已启动" "Success"
    Write-ColorText "📍 地址: http://localhost:$FrontendPort" "Info"
}

# 重启所有服务
function Restart-Services {
    Show-Header "重启所有服务"

    if (-not $Force) {
        Write-ColorText "⚠️  即将重启所有服务，是否继续？" "Warning"
        Write-Host ""
        Write-ColorText "[Y] 是，重启所有服务" "Info"
        Write-ColorText "[N] 否，返回主菜单" "Info"
        Write-Host ""
        $confirm = Read-Host "请选择 (Y/N)"
        if ($confirm -ne "Y") { return }
    }

    Write-Host ""
    Write-ColorText "🔄 第一步: 关闭现有服务..." "Info"
    Stop-AllProcesses -Force

    Write-Host ""
    Write-ColorText "🔄 第二步: 启动后端服务器..." "Info"
    Start-Sleep -Seconds 2
    Start-Backend

    Write-Host ""
    Write-ColorText "🔄 第三步: 启动前端服务器..." "Info"
    Start-Sleep -Seconds 3
    Start-Frontend

    Write-Host ""
    Write-ColorText "✅ 所有服务已重启" "Success"
    Write-ColorText "📍 后端: http://localhost:4000" "Info"
    Write-ColorText "📍 前端: http://localhost:3010" "Info"
    Write-ColorText "👑 账户: admin / admin123" "Info"
}

# 清理僵尸进程
function Clean-ZombieProcesses {
    Show-Header "清理僵尸进程"

    Write-ColorText "🧹 正在清理项目相关的僵尸进程..." "Info"

    # 获取所有Node进程
    $NodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($NodeProcesses) {
        $CleanedCount = 0
        foreach ($Process in $NodeProcesses) {
            # 检查是否是项目相关进程
            if ($Process.MainWindowTitle -like "*jimeng*" -or
                $Process.MainWindowTitle -like "*debug*" -or
                $Process.MainWindowTitle -like "*vite*") {
                try {
                    $Process | Stop-Process -Force -ErrorAction SilentlyContinue
                    $CleanedCount++
                    Write-ColorText "   🗑️  清理进程 PID: $($Process.Id)" "Success"
                } catch {
                    # 忽略无法关闭的进程
                }
            }
        }

        if ($CleanedCount -gt 0) {
            Write-ColorText "✅ 已清理 $CleanedCount 个项目进程" "Success"
        } else {
            Write-ColorText "ℹ️  未发现需要清理的进程" "Info"
        }
    } else {
        Write-ColorText "ℹ️  未发现Node.js进程" "Info"
    }

    Write-Host ""
    Write-ColorText "✅ 僵尸进程清理完成" "Success"
}

# 完整环境重置
function Reset-Environment {
    Show-Header "完整环境重置"

    if (-not $Force) {
        Write-ColorText "⚠️  警告：这将关闭所有项目进程并清理相关资源！" "Error"
        Write-Host ""
        Write-ColorText "[Y] 是，执行完整重置" "Warning"
        Write-ColorText "[N] 否，返回主菜单" "Info"
        Write-Host ""
        $confirm = Read-Host "请输入确认 (Y/N)"
        if ($confirm -ne "Y") { return }
    }

    Write-Host ""
    Write-ColorText "🔄 开始完整环境重置..." "Info"

    # 第一步：关闭所有进程
    Write-ColorText "📡 步骤1: 关闭所有项目进程..." "Info"
    Stop-AllProcesses -Force

    # 第二步：清理端口占用
    Write-ColorText "📡 步骤2: 清理端口占用..." "Info"
    for ($port = 3000; $port -le 3010; $port++) {
        $PortInfo = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($PortInfo) {
            try {
                $Process = Get-Process -Id $PortInfo.OwningProcess -ErrorAction SilentlyContinue
                if ($Process -and $Process.ProcessName -eq "node") {
                    $Process | Stop-Process -Force -ErrorAction SilentlyContinue
                }
            } catch {
                # 忽略无法关闭的进程
            }
        }
    }

    # 第三步：清理临时文件
    Write-ColorText "📡 步骤3: 清理临时文件..." "Info"
    $PathsToClean = @(
        "$ProjectPath\node_modules\.cache",
        "$ProjectPath\ui\node_modules\.cache",
        "$ProjectPath\ui\dist"
    )

    foreach ($Path in $PathsToClean) {
        if (Test-Path $Path) {
            try {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction SilentlyContinue
                Write-ColorText "   🗑️  已清理: $Path" "Success"
            } catch {
                Write-ColorText "   ⚠️  无法清理: $Path" "Warning"
            }
        }
    }

    Write-Host ""
    Write-ColorText "✅ 环境重置完成" "Success"
    Write-ColorText "📝 下次启动时将使用干净的环境" "Info"
}

# 显示主菜单
function Show-Menu {
    Clear-Host
    Write-Host ""
    Show-Header "即梦AI项目进程管理器 v1.0"
    Write-ColorText "项目路径: $ProjectPath" "Info"
    Write-Host ""
    Write-ColorText "请选择操作:" "Header"
    Write-Host ""
    Write-ColorText "[1] 查看当前运行状态" "Info"
    Write-ColorText "[2] 关闭所有项目进程" "Info"
    Write-ColorText "[3] 启动后端API服务器" "Info"
    Write-ColorText "[4] 启动前端开发服务器" "Info"
    Write-ColorText "[5] 重启所有服务" "Info"
    Write-ColorText "[6] 清理僵尸进程" "Info"
    Write-ColorText "[7] 完整环境重置" "Info"
    Write-ColorText "[0] 退出" "Info"
    Write-Host ""

    $choice = Read-Host "请输入选项 (0-7)"

    switch ($choice) {
        "1" { Get-ProcessStatus }
        "2" { Stop-AllProcesses }
        "3" { Start-Backend }
        "4" { Start-Frontend }
        "5" { Restart-Services }
        "6" { Clean-ZombieProcesses }
        "7" { Reset-Environment }
        "0" {
            Clear-Host
            Write-Host ""
            Write-ColorText "👋 感谢使用即梦AI项目进程管理器！" "Success"
            exit 0
        }
        default {
            Write-ColorText "❌ 无效选项，请重新选择" "Error"
            Start-Sleep -Seconds 2
        }
    }

    if ($choice -ne "0") {
        Write-Host ""
        Write-ColorText "按任意键返回主菜单..." "Info"
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Show-Menu
    }
}

# 主逻辑
switch ($Action.ToLower()) {
    "status" { Get-ProcessStatus }
    "stop" { Stop-AllProcesses -Force:$Force }
    "start-backend" { Start-Backend }
    "start-frontend" { Start-Frontend }
    "restart" { Restart-Services -Force:$Force }
    "clean" { Clean-ZombieProcesses }
    "reset" { Reset-Environment -Force:$Force }
    "menu" { Show-Menu }
    default {
        Write-Host "用法: .\process-manager.ps1 [Action] [-Force]"
        Write-Host ""
        Write-Host "Actions:"
        Write-Host "  menu        - 显示交互式菜单 (默认)"
        Write-Host "  status      - 查看当前运行状态"
        Write-Host "  stop        - 关闭所有项目进程"
        Write-Host "  start-backend - 启动后端服务器"
        Write-Host "  start-frontend - 启动前端服务器"
        Write-Host "  restart     - 重启所有服务"
        Write-Host "  clean       - 清理僵尸进程"
        Write-Host "  reset       - 完整环境重置"
        Write-Host ""
        Write-Host "参数:"
        Write-Host "  -Force      - 跳过确认提示"
    }
}