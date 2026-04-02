@echo off
set "NODE22=C:\Users\lucid\tools\node-v22.22.0-win-x64"
set "PATH=%NODE22%;C:\WINDOWS\system32;C:\WINDOWS;C:\Users\lucid\AppData\Local\Programs\Python\Python312"
set "NODE_ENV=production"
cd /d C:\Users\lucid\Desktop\kr8tiv-runtime-truth-contracts\web
echo Building Next.js...
echo NODE_ENV=%NODE_ENV%
node -v
npx next build
echo Build complete!
