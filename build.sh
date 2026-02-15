#!/bin/bash

# Chrome Extension Build Script
# 打包并压缩扩展用于发布到 Chrome Web Store

set -e

echo "🚀 开始构建 Chrome 扩展..."

# 创建构建目录
BUILD_DIR="dist"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$BUILD_DIR/_locales/en"
mkdir -p "$BUILD_DIR/_locales/zh_CN"

echo "📦 复制必需文件..."

# 复制核心文件
cp manifest.json "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp page.js "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp LICENSE "$BUILD_DIR/"

# 复制库文件
cp jsQR.js "$BUILD_DIR/"
cp quagga.min.js "$BUILD_DIR/"  # 已压缩，无需再次处理

# 复制图标
cp icon.png "$BUILD_DIR/"
cp icon16.png "$BUILD_DIR/"
cp icon48.png "$BUILD_DIR/"
cp icon128.png "$BUILD_DIR/"

# 复制国际化文件
cp _locales/en/messages.json "$BUILD_DIR/_locales/en/"
cp _locales/zh_CN/messages.json "$BUILD_DIR/_locales/zh_CN/"

echo "✅ 文件复制完成"

# 检查是否安装了 terser（用于 JS 压缩）
if command -v terser &> /dev/null; then
    echo "🗜️  压缩 JavaScript 文件..."
    
    # 压缩 popup.js
    terser "$BUILD_DIR/popup.js" -o "$BUILD_DIR/popup.js" --compress --mangle
    echo "  ✓ popup.js 已压缩"
    
    # 压缩 page.js
    terser "$BUILD_DIR/page.js" -o "$BUILD_DIR/page.js" --compress --mangle
    echo "  ✓ page.js 已压缩"
    
    # 压缩 background.js
    terser "$BUILD_DIR/background.js" -o "$BUILD_DIR/background.js" --compress --mangle
    echo "  ✓ background.js 已压缩"
    
    # 压缩 jsQR.js (251KB -> ~60KB)
    terser "$BUILD_DIR/jsQR.js" -o "$BUILD_DIR/jsQR.js" --compress --mangle
    echo "  ✓ jsQR.js 已压缩"
    
    echo "✅ JavaScript 压缩完成"
else
    echo "⚠️  未找到 terser，跳过 JS 压缩"
    echo "   安装方法: npm install -g terser"
fi

# 创建 ZIP 文件
ZIP_NAME="qr-code-scanner-v$(grep '"version"' manifest.json | sed 's/.*: "\(.*\)".*/\1/').zip"
echo "📦 创建发布包: $ZIP_NAME"

cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" ./* -q
cd ..

echo "✅ 构建完成！"
echo ""
echo "📦 发布包: $ZIP_NAME"
echo "📂 构建目录: $BUILD_DIR/"
echo ""
echo "🎉 可以上传到 Chrome Web Store 了！"
echo "   上传地址: https://chrome.google.com/webstore/devconsole"
