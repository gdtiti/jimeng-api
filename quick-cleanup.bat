@echo off
chcp 65001 >nul
color 0C
title 快速清理进程

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    快速清理所有项目进程                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🔄 正在关闭所有项目进程...

:: 关闭所有node进程
taskkill /f /im node.exe >nul 2>&1

:: 清理端口占用
for %%p in (3000,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,4000) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING" 2^>nul') do (
        taskkill /f /pid %%i >nul 2>&1
    )
)

echo.
echo ✅ 所有项目进程已清理完成！
echo.
timeout /t 2 /nobreak >nul