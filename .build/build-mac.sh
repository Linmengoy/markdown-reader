#!/bin/bash
# 在 macOS 上打包 .dmg / .zip
#   用法：cd .build && ./build-mac.sh          生成 dmg + zip（arm64 与 x64）
#         cd .build && ./build-mac.sh --dir    只生成 .app 目录，方便本地试跑
#
# 为什么必须在 macOS 上跑：dmg 依赖系统的 hdiutil，签名依赖 codesign，
# electron-builder 在 Windows / Linux 上做不出可用的 mac 安装包。
set -e
cd "$(dirname "$0")"

if [ "$(uname)" != "Darwin" ]; then
  echo "!! 只能在 macOS 上运行这个脚本（当前 $(uname)）"
  echo "   没有 Mac 的话，把仓库推到 GitHub，用 .github/workflows/build.yml 自动出包"
  exit 1
fi

ROOT="$(cd .. && pwd)"
OUT="$ROOT/dist-mac"

if [ ! -d node_modules/electron ]; then
  echo "!! 缺少依赖，先执行：npm ci"
  exit 1
fi

echo "==> 同步前端页面"
# app/ 是构建时生成的副本（被 .gitignore 排除），新克隆的仓库里没有这个目录
mkdir -p app
cp "$ROOT/markdown-novel-reader.html" app/

echo "==> 生成图标（ico + 1024px png，mac 用 png 转 icns）"
./node_modules/.bin/electron make-icon.js

echo "==> 打包 macOS"
if [ "$1" = "--dir" ]; then
  ./node_modules/.bin/electron-builder --mac --arm64 --dir -c.directories.output="$OUT"
  echo "==> 完成（目录版）：$OUT/mac-arm64/Markdown小说阅读器.app"
else
  ./node_modules/.bin/electron-builder --mac --arm64 --x64 -c.directories.output="$OUT"
  echo "==> 完成，产物在 $OUT"
  ls -lh "$OUT"/*.dmg "$OUT"/*.zip 2>/dev/null || true
fi
