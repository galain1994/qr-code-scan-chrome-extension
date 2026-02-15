# 🧪 测试指南

简体中文 | [English](TESTING.en.md)

## 概述

QR Code Scanner 扩展提供了两个测试页面来验证功能：

1. **test.html** - 使用在线API生成的二维码（需要网络，可能有CORS限制）
2. **test-local.html** - 使用本地JavaScript库生成真实二维码（推荐使用）

## 快速测试步骤

### 1. 安装扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹 `/Users/gala/Code/qr-code-scan-chrome-extension`
6. 扩展图标会出现在浏览器工具栏

### 2. 打开测试页面

**推荐使用 test-local.html**（无CORS问题）：
```bash
# 方法1: 直接在浏览器中打开
open test-local.html

```

或者使用 test.html（在线API生成）：
```bash
open test.html
```

### 3. 使用扩展扫描

1. 确保测试页面已加载完成（看到二维码图片）
2. 打开浏览器开发者工具（F12 或 Cmd+Option+I）
3. 切换到 Console 标签页，观察日志输出
4. 点击浏览器工具栏上的扩展图标
5. 在弹出窗口中点击 "Scan QR Codes" 按钮
6. 观察：
   - Console 中的扫描日志
   - 页面上是否出现蓝色高亮框
   - 弹出窗口的状态信息

### 4. 验证功能

如果扫描成功：
- ✅ 二维码会被蓝色边框高亮
- ✅ 每个二维码上方显示"QR Code 1"、"QR Code 2"等标签
- ✅ 悬停在高亮框上，边框变为绿色
- ✅ 点击高亮框，跳转到对应URL

如果扫描失败（显示 "No QR codes found"）：
- 检查 Console 中的错误详情
- 使用 test-local.html 而不是 test.html
- 参考下面的调试部分

## 🔍 调试指南

### 查看详细日志

打开 Chrome 开发者工具（F12），在 Console 中你会看到：

**成功的日志示例：**
```
✅ Real QR codes generated locally using QRCode.js
Found 6 images on page
Successfully decoded QR code: https://github.com
QR code found in image: https://github.com
Successfully decoded QR code: https://www.google.com
QR code found in image: https://www.google.com
...
```

**失败的日志可能显示：**
```
Found 6 images on page
CORS or canvas error: Failed to execute 'getImageData' on 'CanvasRenderingContext2D'
Both CORS and direct scan failed: ...
```

### 常见问题及解决方案

#### 问题1: "No QR codes found on this page"

**原因：** CORS 跨域限制或图片未加载完成

**解决方案：**
1. 使用 **test-local.html** 测试页面（推荐）
2. 确保图片完全加载后再点击扫描
3. 检查 Console 中是否有 CORS 错误

#### 问题2: Canvas CORS 错误

**错误信息：**
```
CORS or canvas error: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': 
The canvas has been tainted by cross-origin data.
```

**原因：** 外部图片没有正确的 CORS 头

**解决方案：**
- 使用 test-local.html（完全避免 CORS 问题）
- 或者测试有 CORS 支持的网站上的二维码

#### 问题3: 扩展无法注入脚本

**错误信息：**
```
Cannot access contents of url "chrome://...". Extension manifest must request permission...
```

**原因：** 在特殊页面（chrome:// 或 chrome-extension://）上无法使用

**解决方案：**
- 只在普通网页（http:// 或 https:// 或 file://）上使用扩展

#### 问题4: jsQR 未定义

**错误信息：**
```
jsQR is not defined
```

**原因：** jsQR.js 库未成功注入

**解决方案：**
1. 检查 manifest.json 中的权限配置
2. 确保 jsQR.js 文件存在且完整（约 251KB）
3. 在扩展管理页面重新加载扩展

## 🌐 在真实网站上测试

你可以在任何包含二维码的网站上测试扩展：

1. 访问包含二维码的网页，例如：
   - 支付页面
   - 分享页面
   - 产品包装图片
   - 社交媒体二维码

2. 点击扩展图标并扫描

3. 注意：某些网站的图片可能有 CORS 限制

## 📊 预期结果

### 在 test-local.html 上：
- 应该找到 6 个二维码
- 每个都能正确识别 URL
- 点击后能跳转到对应网站

### 在 test.html 上：
- 如果 API 支持 CORS，应该找到 6 个二维码
- 如果有 CORS 限制，可能找不到或部分找不到

## 🛠️ 高级调试

### 检查扩展权限

在 `chrome://extensions/` 页面：
1. 找到 "QR Code Scanner" 扩展
2. 点击"详细信息"
3. 确认以下权限已启用：
   - ✅ 读取和更改您在所访问网站上的所有数据
   - ✅ 在活动标签页中读取浏览历史记录

### 手动测试脚本注入

在 Console 中运行：
```javascript
// 检查 jsQR 是否已加载
typeof jsQR !== 'undefined' ? 'jsQR loaded' : 'jsQR NOT loaded'

// 手动触发扫描
chrome.runtime.sendMessage({msg: 'scanQRCodes'}, response => {
  console.log('Scan response:', response);
});
```

### 检查图片加载状态

在测试页面的 Console 中：
```javascript
// 检查所有图片的加载状态
document.querySelectorAll('img').forEach((img, i) => {
  console.log(`Image ${i}:`, {
    src: img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  });
});
```

## 📝 报告问题

如果遇到问题，请提供以下信息：

1. Chrome 版本：`chrome://version/`
2. 使用的测试页面：test.html 还是 test-local.html
3. Console 中的完整错误日志
4. 扩展是否成功注入（检查 jsQR 是否已定义）
5. 图片加载状态

## ✅ 成功标准

扩展正常工作时，你应该能：

- ✅ 在测试页面上找到所有二维码（6个）
- ✅ 看到蓝色高亮边框和标签
- ✅ 悬停时边框变绿
- ✅ 点击后正确跳转
- ✅ 在 Console 中看到成功的解码日志

祝测试顺利！🎉
