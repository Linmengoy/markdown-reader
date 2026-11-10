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

echo "==> 生成图标（从 assets/logo.jpg）"
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS ./node_modules/.bin/electron make-icon.js

echo "==> 第一步：打包目录版"
node_modules/.bin/electron-builder --win --x64 --dir 2>&1 | grep -Ev "^\s*$" | tail -4

# 兜底：若 afterPack 阶段 rcedit 未成功（文件刚生成被占用/杀软扫描），在此补写。
# 必须确保成功：图标/版本写不进去，exe 会显示成通用程序图标，且不易察觉。
RC="$LOCALAPPDATA/electron-builder/Cache/winCodeSign/winCodeSign-2.6.0/rcedit-x64.exe"
TARGET="$ROOT/dist/win-unpacked/$EXE_NAME"
if [ -f "$RC" ] && [ -f "$TARGET" ]; then
  for i in 1 2 3 4 5 6 7 8; do
    if "$RC" "$TARGET" \
        --set-version-string FileDescription "Markdown 小说阅读器" \
        --set-version-string ProductName "Markdown小说阅读器" \
        --set-version-string CompanyName "local" \
        --set-icon build/icon.ico >/dev/null 2>&1; then
      echo "==> 图标已写入 exe（第 $i 次）"
      break
    fi
    sleep 2
    if [ "$i" = "8" ]; then echo "!!! rcedit 连续失败：exe 图标/版本未写入，勿直接发布"; exit 1; fi
  done
fi

echo "==> 第二步：封装单文件 exe"
# 关键：portable 会把程序解压到 %TEMP%\<unpackDirName>，目录已存在时直接复用、
# 不覆盖旧文件 —— 换了版本却还跑旧代码。所以解压目录名带上版本号，升级即换新目录。
VERSION=$(node -p "require('./package.json').version")
UNPACK_DIR="MDNovelReader-$VERSION"
echo "    解压目录：%TEMP%\\$UNPACK_DIR"
# 构建机上把同名解压目录删掉，否则自测时会命中上一次解压的旧文件
rm -rf "$LOCALAPPDATA/Temp/$UNPACK_DIR" 2>/dev/null || true
node_modules/.bin/electron-builder --win portable --x64 \
  --prepackaged "$ROOT/dist/win-unpacked" \
  -c.portable.unpackDirName="$UNPACK_DIR" 2>&1 | tail -3

echo "==> 复制到项目根目录"
cp "$ROOT/dist/$EXE_NAME" "$ROOT/$EXE_NAME" 2>/dev/null || echo "    (根目录 exe 正被占用，关掉程序后手动复制 dist/ 里的那份)"

echo "==> 完成"
ls -lh "$ROOT/$EXE_NAME"
