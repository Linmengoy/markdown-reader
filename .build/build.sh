#!/bin/bash
# 一键构建 Windows 单文件 exe
# 用法：在 .build 目录下执行 ./build.sh
set -e
cd "$(dirname "$0")"

export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

ROOT="$(cd .. && pwd)"
EXE_NAME="Markdown小说阅读器.exe"

echo "==> 同步前端页面"
cp "$ROOT/markdown-novel-reader.html" app/

echo "==> 生成图标"
node make-icon.js

echo "==> 第一步：打包目录版"
node_modules/.bin/electron-builder --win --x64 --dir 2>&1 | grep -Ev "^\s*$" | tail -4

# 兜底：若 afterPack 阶段 rcedit 未成功（文件被占用），在此补写一次
RC="$LOCALAPPDATA/electron-builder/Cache/winCodeSign/winCodeSign-2.6.0/rcedit-x64.exe"
TARGET="$ROOT/dist/win-unpacked/$EXE_NAME"
if [ -f "$RC" ] && [ -f "$TARGET" ]; then
  for i in 1 2 3; do
    if "$RC" "$TARGET" \
        --set-version-string FileDescription "Markdown 小说阅读器" \
        --set-version-string ProductName "Markdown小说阅读器" \
        --set-version-string CompanyName "local" \
        --set-icon build/icon.ico >/dev/null 2>&1; then
      echo "==> 图标已写入 exe"
      break
    fi
    sleep 2
  done
fi

echo "==> 第二步：封装单文件 exe"
node_modules/.bin/electron-builder --win portable --x64 --prepackaged "$ROOT/dist/win-unpacked" 2>&1 | tail -3

echo "==> 复制到项目根目录"
cp "$ROOT/dist/$EXE_NAME" "$ROOT/$EXE_NAME"

echo "==> 完成"
ls -lh "$ROOT/$EXE_NAME"
