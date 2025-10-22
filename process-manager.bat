@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 设置项目路径
set "PROJECT_PATH=%~dp0"
set "PROJECT_PATH=%PROJECT_PATH:~0,-1%"

:: 设置颜色
color 0A

:: 显示标题
title 即梦AI项目进程管理器

:MAIN_MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                即梦AI项目进程管理器 v1.0                      ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  项目路径: %PROJECT_PATH%                                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 请选择操作:
echo.
echo [1] 查看当前运行状态
echo [2] 关闭所有项目进程
echo [3] 启动后端API服务器
echo [4] 启动前端开发服务器
echo [5] 重启所有服务
echo [6] 检查端口占用情况
echo [7] 清理僵尸进程
echo [8] 完整环境重置
echo [0] 退出
echo.
set /p choice=请输入选项 (0-8):

if "%choice%"=="1" goto CHECK_STATUS
if "%choice%"=="2" goto KILL_ALL
if "%choice%"=="3" goto START_BACKEND
if "%choice%"=="4" goto START_FRONTEND
if "%choice%"=="5" goto RESTART_ALL
if "%choice%"=="6" goto CHECK_PORTS
if "%choice%"=="7" goto CLEAN_ZOMBIES
if "%choice%"=="8" goto FULL_RESET
if "%choice%"=="0" goto EXIT
goto MAIN_MENU

:CHECK_STATUS
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    当前运行状态检查                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 📊 检查后端服务器进程...
tasklist /fi "imagename eq node.exe" /fi "windowtitle eq *debug-server*" /fo table | find "node.exe" >nul
if !errorlevel! equ 0 (
    echo ✅ 后端调试服务器正在运行
    echo 📍 端口: 4000
) else (
    echo ❌ 后端调试服务器未运行
)

echo.
echo 📊 检查前端开发服务器进程...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fi "windowtitle eq *vite*" /fo list ^| find "PID:"') do (
    set /a frontend_count+=1
)
if defined frontend_count (
    echo ✅ 前端开发服务器正在运行 (!frontend_count! 个进程)
) else (
    echo ❌ 前端开发服务器未运行
)

echo.
echo 📊 检查端口占用情况...
echo 🔍 检查端口 3000-3010:
for %%p in (3000,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010) do (
    netstat -ano | find ":%%p " | find "LISTENING" >nul
    if !errorlevel! equ 0 (
        for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING"') do (
            echo ✅ 端口 %%p 被占用 (PID: %%i)
        )
    ) else (
        echo ❌ 端口 %%p 空闲
    )
)

echo.
echo 📊 检查端口 4000:
netstat -ano | find ":4000 " | find "LISTENING" >nul
if !errorlevel! equ 0 (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":4000 " ^| find "LISTENING"') do (
        echo ✅ 端口 4000 被占用 (PID: %%i)
    )
) else (
    echo ❌ 端口 4000 空闲
)

echo.
pause
goto MAIN_MENU

:KILL_ALL
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    关闭所有项目进程                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo ⚠️  即将关闭所有项目相关进程，是否继续？
echo.
echo [Y] 是，关闭所有进程
echo [N] 否，返回主菜单
echo.
set /p confirm=请选择 (Y/N):
if /i not "%confirm%"=="Y" goto MAIN_MENU

echo.
echo 🔄 正在关闭项目进程...

:: 关闭后端服务器
echo 📡 关闭后端服务器...
taskkill /f /im node.exe /fi "windowtitle eq *debug-server*" >nul 2>&1
taskkill /f /im node.exe /c "npm start" >nul 2>&1

:: 关闭前端服务器
echo 🎨 关闭前端服务器...
taskkill /f /im node.exe /fi "windowtitle eq *vite*" >nul 2>&1
for /l %%i in (3000,1,3010) do (
    for /f "tokens=5" %%j in ('netstat -ano ^| find ":%%i " ^| find "LISTENING" 2^>nul') do (
        taskkill /f /pid %%j >nul 2>&1
    )
)

:: 关闭测试服务器
echo 🧪 关闭测试服务器...
taskkill /f /im node.exe /c "test-ui-server" >nul 2>&1

:: 等待进程完全关闭
timeout /t 3 /nobreak >nul

echo.
echo ✅ 所有项目进程已关闭
echo.
pause
goto MAIN_MENU

:START_BACKEND
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    启动后端API服务器                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 检查端口4000是否被占用
netstat -ano | find ":4000 " | find "LISTENING" >nul
if !errorlevel! equ 0 (
    echo ⚠️  端口4000已被占用，正在尝试关闭占用进程...
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":4000 " ^| find "LISTENING"') do (
        taskkill /f /pid %%i >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo 🚀 启动后端调试服务器...
cd /d "%PROJECT_PATH%"
start "Debug API Server" cmd /k "node debug-server.cjs"

echo.
echo ✅ 后端服务器已启动
echo 📍 地址: http://localhost:4000
echo 👑 账户: admin / admin123
echo.
pause
goto MAIN_MENU

:START_FRONTEND
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  启动前端开发服务器                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 查找可用端口
set "FRONTEND_PORT=3010"
for %%p in (3010,3009,3008,3007,3006,3005,3004,3003,3002,3001,3000) do (
    netstat -ano | find ":%%p " | find "LISTENING" >nul
    if !errorlevel! neq 0 (
        set "FRONTEND_PORT=%%p"
        goto PORT_FOUND
    )
)
:PORT_FOUND

echo 🎨 启动前端开发服务器...
echo 📍 端口: %FRONTEND_PORT%

cd /d "%PROJECT_PATH%\ui"
start "Frontend Dev Server" cmd /k "npm run dev -- --port %FRONTEND_PORT%"

echo.
echo ✅ 前端服务器已启动
echo 📍 地址: http://localhost:%FRONTEND_PORT%
echo.
pause
goto MAIN_MENU

:RESTART_ALL
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      重启所有服务                               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo ⚠️  即将重启所有服务，是否继续？
echo.
echo [Y] 是，重启所有服务
echo [N] 否，返回主菜单
echo.
set /p confirm=请选择 (Y/N):
if /i not "%confirm%"=="Y" goto MAIN_MENU

echo.
echo 🔄 第一步: 关闭现有服务...
call :KILL_ALL_SILENT

echo.
echo 🔄 第二步: 启动后端服务器...
cd /d "%PROJECT_PATH%"
start "Debug API Server" cmd /k "node debug-server.cjs"
timeout /t 2 /nobreak >nul

echo 🔄 第三步: 启动前端服务器...
cd /d "%PROJECT_PATH%\ui"
start "Frontend Dev Server" cmd /k "npm run dev -- --port 3010"

echo.
echo ✅ 所有服务已重启
echo 📍 后端: http://localhost:4000
echo 📍 前端: http://localhost:3010
echo 👑 账户: admin / admin123
echo.
pause
goto MAIN_MENU

:CHECK_PORTS
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    端口占用情况检查                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 📊 检查常用端口占用情况:
echo.

:: 检查后端端口
echo 🔍 后端服务端口:
netstat -ano | find ":4000 " | find "LISTENING" >nul
if !errorlevel! equ 0 (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":4000 " ^| find "LISTENING"') do (
        echo ✅ 端口 4000 - 被占用 (PID: %%i)
        tasklist /fi "PID eq %%i" /fo list | find "映像名称"
    )
) else (
    echo ❌ 端口 4000 - 空闲
)

echo.
echo 🔍 前端服务端口:
for %%p in (3000,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010) do (
    netstat -ano | find ":%%p " | find "LISTENING" >nul
    if !errorlevel! equ 0 (
        for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING"') do (
            echo ✅ 端口 %%p - 被占用 (PID: %%i)
            tasklist /fi "PID eq %%i" /fo list | find "映像名称"
        )
    ) else (
        echo ❌ 端口 %%p - 空闲
    )
)

echo.
pause
goto MAIN_MENU

:CLEAN_ZOMBIES
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      清理僵尸进程                               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 🧹 正在清理项目相关的僵尸进程...

:: 清理node进程
echo 🔄 清理Node.js进程...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo list ^| find "PID:"') do (
    :: 检查是否是项目相关进程
    tasklist /fi "PID eq %%i" /fo list | find /i "jimeng" >nul
    if !errorlevel! equ 0 (
        echo 🗑️  清理进程 PID: %%i
        taskkill /f /pid %%i >nul 2>&1
    )
)

:: 清理可能的残留端口占用
echo 🔄 清理端口占用...
for %%p in (3000,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,4000) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING" 2^>nul') do (
        tasklist /fi "PID eq %%i" /fo list | find /i "node.exe" >nul
        if !errorlevel! equ 0 (
            echo 🗑️  清理端口 %%p 占用 (PID: %%i)
            taskkill /f /pid %%i >nul 2>&1
        )
    )
)

echo.
echo ✅ 僵尸进程清理完成
echo.
pause
goto MAIN_MENU

:FULL_RESET
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      完整环境重置                               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo ⚠️  警告：这将关闭所有项目进程并清理相关资源！
echo.
echo [Y] 是，执行完整重置
echo [N] 否，返回主菜单
echo.
set /p confirm=请输入确认 (Y/N):
if /i not "%confirm%"=="Y" goto MAIN_MENU

echo.
echo 🔄 开始完整环境重置...

:: 第一步：关闭所有进程
echo 📡 步骤1: 关闭所有项目进程...
call :KILL_ALL_SILENT

:: 第二步：清理端口占用
echo 📡 步骤2: 清理端口占用...
for %%p in (3000,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,4000) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING" 2^>nul') do (
        taskkill /f /pid %%i >nul 2>&1
    )
)

:: 第三步：清理临时文件
echo 📡 步骤3: 清理临时文件...
if exist "%PROJECT_PATH%\node_modules\.cache" rmdir /s /q "%PROJECT_PATH%\node_modules\.cache" >nul 2>&1
if exist "%PROJECT_PATH%\ui\node_modules\.cache" rmdir /s /q "%PROJECT_PATH%\ui\node_modules\.cache" >nul 2>&1
if exist "%PROJECT_PATH%\ui\dist" rmdir /s /q "%PROJECT_PATH%\ui\dist" >nul 2>&1

echo.
echo ✅ 环境重置完成
echo 📝 下次启动时将使用干净的环境
echo.
pause
goto MAIN_MENU

:KILL_ALL_SILENT
:: 静默关闭所有进程（不显示输出）
taskkill /f /im node.exe /fi "windowtitle eq *debug-server*" >nul 2>&1
taskkill /f /im node.exe /fi "windowtitle eq *vite*" >nul 2>&1
taskkill /f /im node.exe /c "npm start" >nul 2>&1
taskkill /f /im node.exe /c "test-ui-server" >nul 2>&1
for /l %%i in (3000,1,3010) do (
    for /f "tokens=5" %%j in ('netstat -ano ^| find ":%%i " ^| find "LISTENING" 2^>nul') do (
        taskkill /f /pid %%j >nul 2>&1
    )
)
goto :eof

:EXIT
cls
echo.
echo 👋 感谢使用即梦AI项目进程管理器！
echo.
timeout /t 2 /nobreak >nul
exit /b 0