# QR Code Scanner - Chrome Extension

简体中文 | [English](README.md)

一个简单实用的Chrome浏览器扩展程序，可以扫描当前页面上的所有二维码，并提供便捷的导航功能。

## 功能特性

- 🔍 **自动检测**：扫描页面上所有可见的二维码和条形码图片
- 📋 **复制支持**：每个识别码左上角有复制按钮，方便快速复制内容
- 🔗 **智能操作**：点击URL会在新标签页打开，非URL内容会自动复制到剪贴板
- ✨ **高亮显示**：找到的码会被蓝色边框高亮标记，页面其余部分变暗
- 🔢 **多码支持**：支持多个二维码/条形码，带编号标签便于选择
- 🔄 **重新识别**：浮动工具栏带重新扫描按钮，无需重新打开弹窗即可检测新码
- 📱 **响应式设计**：高亮框会随页面滚动和窗口大小自动跟随调整
- 🌍 **国际化支持**：根据浏览器语言自动显示中文或英文界面
- 📊 **条形码支持**：可选的条形码扫描功能（EAN、UPC、Code128等）- 见 [BARCODE_SETUP.md](BARCODE_SETUP.md)
- ⌨️ **快捷操作**：点击暗色遮罩层或按ESC键可关闭高亮显示

## 安装方法

1. 下载或克隆本项目到本地
   ```bash
   git clone https://github.com/yourusername/qr-code-scan-chrome-extension.git
   ```

2. 打开Chrome浏览器，进入扩展程序管理页面
   - 在地址栏输入 `chrome://extensions/`
   - 或点击菜单 → 更多工具 → 扩展程序

3. 开启右上角的"开发者模式"

4. 点击"加载已解压的扩展程序"

5. 选择本项目的文件夹

6. 安装完成！扩展图标会出现在浏览器工具栏

## 使用方法

1. 访问任何包含二维码的网页

2. 点击浏览器工具栏上的QR Code Scanner扩展图标

3. 点击弹出窗口中的"扫描二维码"按钮

4. 扩展会自动扫描页面上的所有二维码（和条形码，如已启用）并高亮显示

5. 与识别的码进行交互：
   - 点击**复制按钮**（左上角）复制码内容
   - 点击**码区域**打开URL或复制非URL内容
   - 使用**重新扫描按钮**（右上角）检测新出现的码
   - 点击**关闭按钮**（右上角）或按**ESC键**退出

6. **条形码支持**（可选）：
   - 要启用条形码扫描，请查看 [BARCODE_SETUP.md](BARCODE_SETUP.md)
   - 支持 EAN-13、UPC、Code128 等多种格式

## 技术实现

### 核心技术栈
- **jsQR**：用于二维码识别的JavaScript库
- **Chrome Extension API**：实现浏览器扩展功能
- **HTML5 Canvas**：图像处理和二维码解析

### 项目结构
```
qr-code-scan-chrome-extension/
├── manifest.json          # 扩展配置文件
├── popup.html            # 弹出窗口界面
├── popup.js              # 弹出窗口逻辑
├── page.js               # 页面注入脚本（核心扫描逻辑）
├── jsQR.js               # 二维码识别库
├── icon.png              # 主图标
├── icon16.png            # 16x16图标
├── icon48.png            # 48x48图标
├── icon128.png           # 128x128图标
├── test.html             # 测试页面（外部API）
├── test-local.html       # 测试页面（本地生成）
├── HOW-IT-WORKS.md       # 工作原理详解
├── TESTING.en.md         # Testing guide (English)
├── TESTING.md            # 测试指南（中文）
├── LICENSE               # 许可证
├── README.md             # 说明文档（英文）
└── README.zh-CN.md       # 说明文档（中文）
```

### 工作原理

1. **注入脚本**：当用户点击扫描按钮时，扩展会将jsQR库和page.js脚本注入到当前页面

2. **图像扫描**：page.js遍历页面上的所有`<img>`和`<canvas>`元素

3. **Canvas处理**：将图像绘制到临时Canvas上，获取ImageData

4. **二维码识别**：使用jsQR库分析ImageData，提取二维码数据

5. **高亮显示**：在识别到的二维码位置创建带有蓝色边框的overlay元素，并添加暗色遮罩层

6. **交互处理**：为高亮框添加点击事件，在新标签页打开URL；支持ESC键和点击遮罩层关闭高亮

## 功能演示

### 扫描前
![扫描前](screenshots/before-scan.png)

### 扫描后
![扫描后](screenshots/after-scan.png)

## 浏览器兼容性

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ 其他基于Chromium的浏览器

## 开发说明

### 调试模式

在开发过程中，你可以：
- 打开Chrome开发者工具查看console日志
- 修改代码后，在扩展管理页面点击"重新加载"按钮
- 使用`chrome.runtime.lastError`捕获和调试错误

### 本地测试

1. 创建一个包含二维码的测试页面
2. 加载扩展并测试扫描功能
3. 检查高亮是否正确显示
4. 测试点击跳转功能

## 文档

- [README.md](README.md) - 主文档（英文）
- [README.zh-CN.md](README.zh-CN.md) - 主文档（中文）
- [TESTING.en.md](TESTING.en.md) - Testing guide (English)
- [TESTING.md](TESTING.md) - 测试指南（中文）
- [HOW-IT-WORKS.md](HOW-IT-WORKS.md) - 工作原理详解（中文）

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [jsQR](https://github.com/cozmo/jsQR) - 优秀的二维码识别库
- [Full Page Screen Capture](https://github.com/mrcoles/full-page-screen-capture-chrome-extension) - 项目结构参考

## 贡献

欢迎提交Issue和Pull Request！

## 更新日志

### v1.1.0 (2026-02-13)
- ✨ **新增**：每个识别码左上角添加复制按钮
- ✨ **新增**：智能点击操作 - 打开URL或复制非URL内容
- ✨ **新增**：浮动工具栏，带重新扫描和关闭按钮
- ✨ **新增**：国际化支持（中文、英文）
- 📊 **新增**：可选的条形码扫描支持（见 BARCODE_SETUP.md）
- 🐛 **修复**：改进高亮区域的滚动跟随功能
- 🔄 **优化**：复制操作的视觉反馈更友好

### v1.0.0 (2026-02-12)
- ✨ 初始版本发布
- 🔍 实现基础二维码扫描功能
- ✨ 支持多个二维码高亮显示
- 🌑 添加暗色遮罩层，突出显示二维码
- 🆕 在新标签页打开URL（不影响当前页面）
- ⌨️ 支持ESC键和点击遮罩层关闭高亮
- 📱 响应式设计，支持滚动和窗口调整

---

如有问题或建议，欢迎提Issue！

## 赞助支持

如果这个项目对你有帮助，欢迎请我喝杯咖啡 ☕

<div align="center">
  <img src="wx_qrcode.jpg" alt="微信赞赏" width="200" style="margin: 0 30px;" />
  <img src="alipay_qrcode.png" alt="支付宝赞赏" width="200" style="margin: 0 30px;" />
  <p><em>微信 / 支付宝</em></p>
</div>

感谢你的支持！❤️
