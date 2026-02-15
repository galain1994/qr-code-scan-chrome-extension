# 发布到 Chrome Web Store 指南

## 准备工作

### 1. 安装 terser（JavaScript 压缩工具）

```bash
npm install -g terser
```

如果没有安装 npm，可以：
- macOS: `brew install node`
- 或访问 https://nodejs.org/ 下载安装

### 2. 检查版本号

确保 `manifest.json` 中的 `version` 字段是正确的版本号。

## 构建发布包

### 方法 1: 使用构建脚本（推荐）

```bash
# 给脚本添加执行权限
chmod +x build.sh

# 运行构建脚本
./build.sh
```

这将会：
- ✅ 创建 `dist/` 目录并复制所有必需文件
- ✅ 压缩 JavaScript 文件（popup.js, page.js, background.js）
- ✅ 创建 ZIP 文件（例如：qr-code-scanner-v1.1.0.zip）

### 方法 2: 手动打包

如果不想压缩 JS 文件，可以手动创建 ZIP：

```bash
# 创建临时目录
mkdir -p dist

# 复制必需文件
cp manifest.json popup.html popup.js page.js background.js dist/
cp jsQR.js quagga.min.js dist/
cp icon*.png dist/
cp LICENSE dist/
cp -r _locales dist/

# 创建 ZIP
cd dist && zip -r ../qr-code-scanner.zip ./* && cd ..
```

## 必需文件清单

✅ **必须包含的文件：**
- `manifest.json` - 扩展配置
- `popup.html` - 弹窗界面
- `popup.js` - 弹窗逻辑
- `page.js` - 内容脚本（核心扫描功能）
- `background.js` - 后台服务工作脚本
- `jsQR.js` - QR 码识别库
- `quagga.min.js` - 条形码识别库
- `icon.png`, `icon16.png`, `icon48.png`, `icon128.png` - 图标文件
- `_locales/en/messages.json` - 英文国际化
- `_locales/zh_CN/messages.json` - 中文国际化
- `LICENSE` - 许可证

❌ **不需要包含的文件：**
- `README.md`, `README.zh-CN.md` - 说明文档
- `TESTING.md`, `TESTING.en.md` - 测试文档
- `test-*.html` - 测试页面
- `*.JPG`, `*.PNG` - 赞助二维码图片
- `.git/`, `.gitignore` - Git 相关
- `build.sh`, `PUBLISH.md` - 构建脚本和文档

## 上传到 Chrome Web Store

### 1. 注册开发者账号

访问 [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole)

- 首次注册需要支付 $5 一次性注册费
- 使用 Google 账号登录

### 2. 创建新项目

1. 点击 **"新商品"** 按钮
2. 上传生成的 ZIP 文件（例如：`qr-code-scanner-v1.1.0.zip`）
3. 等待上传完成

### 3. 填写商店信息

#### 基本信息
- **名称**: QR Code Scanner
- **简短描述**: Scan QR codes and barcodes on any webpage with one click
- **详细描述**: 
```
Scan all QR codes and barcodes on any webpage instantly!

Features:
• Automatically detect all QR codes and barcodes on the page
• Support multiple formats: QR, EAN, UPC, Code128, ITF, Code39, etc.
• One-click to open URLs or copy content
• Smart highlighting with visual feedback
• Multi-language support (English, 简体中文)
• Privacy-focused: all processing happens locally

How to use:
1. Click the extension icon
2. Click "Scan QR Codes" button
3. Found codes will be highlighted
4. Click to open URLs or copy content

No data collection, completely free and open source!
```

#### 图标和截图
- **图标**: 使用 `icon128.png`（128x128）
- **截图**: 
  - 建议至少 3 张截图（1280x800 或 640x400）
  - 展示扫描前、扫描后、高亮效果
- **宣传图片**（可选）:
  - 小瓷砖: 440x280
  - 大瓷砖: 920x680
  - 侯爵: 1400x560

#### 分类和语言
- **类别**: 生产力 (Productivity)
- **语言**: 英语、简体中文

### 4. 隐私设置

#### 隐私实践
- ✅ 不收集用户数据
- ✅ 本地处理
- ✅ 无需注册/登录

#### 权限说明
需要在商店说明中解释权限用途：

**activeTab**: 读取当前标签页内容以扫描 QR 码和条形码
**scripting**: 注入扫描脚本到页面
**host_permissions (<all_urls>)**: 绕过 CORS 限制以扫描跨域图片

### 5. 提交审核

1. 检查所有信息填写完整
2. 点击 **"提交审核"**
3. 等待 Google 审核（通常 1-3 个工作日）

## 更新现有扩展

如果是更新版本：

1. 修改 `manifest.json` 中的 `version` 字段（必须递增）
2. 运行 `./build.sh` 重新构建
3. 在开发者控制台找到已有项目
4. 点击 **"上传新版本"**
5. 上传新的 ZIP 文件
6. 填写更新日志
7. 提交审核

## 版本号规范

遵循语义化版本 (Semantic Versioning):

- **主版本号 (Major)**: 重大功能变更 (1.0.0 → 2.0.0)
- **次版本号 (Minor)**: 新增功能 (1.0.0 → 1.1.0)
- **修订号 (Patch)**: Bug 修复 (1.0.0 → 1.0.1)

例如：
- 当前版本: `1.1.0`
- Bug 修复: `1.1.1`
- 新增功能: `1.2.0`
- 重大更新: `2.0.0`

## 审核注意事项

### 常见被拒原因
- ❌ 包含测试文件或开发文件
- ❌ 图标或截图不符合规范
- ❌ 权限说明不清楚
- ❌ 描述信息不完整或存在误导
- ❌ 存在恶意代码或追踪功能

### 确保通过审核
- ✅ 只包含必需文件
- ✅ 清楚说明所有权限用途
- ✅ 提供清晰的使用说明
- ✅ 确保功能正常工作
- ✅ 遵守 Google 政策和服务条款

## 文件大小优化

构建脚本会自动压缩所有 JavaScript 文件：

**压缩效果：**
- `jsQR.js`: 251KB → ~60KB (-76%)
- `page.js`: 大幅减小
- `popup.js`: 大幅减小
- `background.js`: 大幅减小

**总包大小：**
- 未优化: ~1.5 MB
- 构建后: ~300-400 KB

`quagga.min.js` (91KB) 已经是压缩版本，无需再次处理。

## 发布后

### 监控和维护
- 📊 定期检查用户评论和评分
- 🐛 及时修复 bug 并发布更新
- 📈 根据反馈改进功能
- 🔒 关注安全问题

### 推广
- 在 README.md 中添加 Chrome Web Store 徽章
- 在 GitHub 项目页添加安装链接
- 社交媒体分享

## 常见问题

### Q: 为什么要压缩 JS 文件？
A: 
- 减小包体积，加快下载速度
- 一定程度的代码保护
- 专业的发布规范

### Q: 可以不压缩直接发布吗？
A: 可以，但不推荐。压缩后体积更小，加载更快。

### Q: 审核要多久？
A: 首次发布通常 1-3 个工作日，更新版本可能更快。

### Q: 需要提供隐私政策吗？
A: 如果不收集用户数据可不提供，但建议在描述中说明。

## 相关链接

- [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole)
- [Chrome 扩展开发文档](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store 政策](https://developer.chrome.com/docs/webstore/program-policies/)
- [图标和图片规范](https://developer.chrome.com/docs/webstore/images/)

---

祝发布顺利！🎉
