@echo off
REM Force Node 22 by removing Node 24 from PATH entirely
set "NODE22=C:\Users\lucid\tools\node-v22.22.0-win-x64"
set "PATH=%NODE22%;C:\WINDOWS\system32;C:\WINDOWS;C:\Users\lucid\AppData\Local\Programs\Python\Python312"
cd /d C:\Users\lucid\Desktop\kr8tiv-runtime-truth-contracts
node --version
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm install
