# QR Code Scanner - Chrome Extension

[简体中文](README.zh-CN.md) | English

A simple and practical Chrome browser extension that scans all QR codes on the current page and provides convenient navigation.

## Features

- 🔍 **Auto Detection**: Scan all visible QR code images and barcodes on the page
- 📋 **Copy Support**: Copy button in the top-left corner of each code for easy copying
- 🔗 **Smart Actions**: Click to open URLs in new tabs, or auto-copy non-URL content to clipboard
- ✨ **Highlight Display**: Found codes are highlighted with blue borders, rest of the page is dimmed
- 🔢 **Multiple Codes**: Support multiple QR/barcodes with numbered labels for easy selection
- 🔄 **Rescan Function**: Floating toolbar with rescan button to detect new codes without reopening popup
- 📱 **Responsive Design**: Highlight boxes automatically follow page scroll and window resize
- 🌍 **i18n Support**: Multi-language support (English, Simplified Chinese) based on browser language
- 📊 **Barcode Support**: Optional barcode scanning support (EAN, UPC, Code128, etc.) - see [BARCODE_SETUP.md](BARCODE_SETUP.md)
- ⌨️ **Quick Close**: Close highlights by clicking the dark overlay or pressing ESC key

## Installation

1. Download or clone this project to your local machine
   ```bash
   git clone https://github.com/galain1994/qr-code-scan-chrome-extension.git
   ```

2. Open Chrome browser and navigate to the extensions page
   - Type `chrome://extensions/` in the address bar
   - Or click Menu → More Tools → Extensions

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked"

5. Select the project folder

6. Done! The extension icon will appear in your browser toolbar

## Usage

1. Visit any webpage containing QR codes

2. Click the QR Code Scanner extension icon in the browser toolbar

3. Click the "Scan QR Codes" button in the popup window

4. The extension will automatically scan all QR codes (and barcodes if enabled) on the page and highlight them

5. Interact with detected codes:
   - Click the **Copy button** (top-left) to copy the code content
   - Click the **code area** to open URLs in new tab or copy non-URL content
   - Use the **Rescan button** (top-right) to detect new codes
   - Click **Close button** (top-right) or press **ESC** to exit

6. **Barcode Support** (Optional):
   - To enable barcode scanning, see [BARCODE_SETUP.md](BARCODE_SETUP.md)
   - Supports EAN-13, UPC, Code128, and more formats

## Technical Implementation
ZXing** (Optional): JavaScript library for barcode recognition
- **Chrome Extension API**: Browser extension functionality including i18n
- **HTML5 Canvas**: Image processing and
- **jsQR**: JavaScript library for QR code recognition
- **Chrome Extension API**: Browser extension functionality
- **HTML5 Canvas**: Image processing and QR code parsing

### Project Structure
```
qr-code-scan-chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Popup window interface
├── popup.js              # Popup window logic
├── page.js               # Content script (core scanning logic)
├── zxing.js              # Barcode recognition library (optional)
├── _locales/             # i18n language files
│   ├── en/               # English
│   │   └── messages.json
│   └── zh_CN/            # Simplified Chinese
│       └── messages.json
├── BARCODE_SETUP.md      # Barcode setup guide
├── download-barcode-lib.sh # Script to download barcode library
├── jsQR.js               # QR code recognition library
├── icon.png              # Main icon
├── icon16.png            # 16x16 icon
├── icon48.png            # 48x48 icon
├── icon128.png           # 128x128 icon
├── test.html             # Test page (external API)
├── test-local.html       # Test page (local generation)
├── HOW-IT-WORKS.md       # Technical details
├── TESTING.en.md         # Testing guide (English)
├── TESTING.md            # Testing guide (Chinese)
├── LICENSE               # MIT License
├── README.md             # Documentation (English)
└── README.zh-CN.md       # Documentation (Chinese)
```

### How It Works

1. **Script Injection**: When the user clicks the scan button, the extension injects jsQR library and page.js script into the current page

2. **Image Scanning**: page.js traverses all `<img>` and `<canvas>` elements on the page

3. **Canvas Processing**: Draws images to a temporary canvas and obtains ImageData

4. **QR Code Recognition**: Uses jsQR library to analyze ImageData and extract QR code data

5. **Highlight Display**: Creates overlay elements with blue borders at the detected QR code positions, and adds a dark overlay layer

6. **Interaction Handling**: Adds click events to highlight boxes to open URLs in new tabs; supports ESC key and clicking overlay to close highlights

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Other Chromium-based browsers

## Development

### Debug Mode

During development, you can:
- Open Chrome DevTools to view console logs
- After modifying code, click "Reload" button on the extensions management page
- Use `chrome.runtime.lastError` to capture and debug errors

### Local Testing

1. Use the provided test pages:
   - `test-local.html` - Recommended, generates QR codes locally (no CORS issues)
   - `test.html` - Uses external API (may have CORS limitations)

2. Load the extension and test scanning functionality

3. Check if highlights display correctly

4. Test click-to-open functionality

5. See [TESTING.en.md](TESTING.en.md) for detailed testing guide

## Documentation

- [README.md](README.md) - Main documentation (English)
- [README.zh-CN.md](README.zh-CN.md) - 中文文档
- [TESTING.en.md](TESTING.en.md) - Testing guide (English)
- [TESTING.md](TESTING.md) - 测试指南（中文）
- [HOW-IT-WORKS.md](HOW-IT-WORKS.md) - Technical details and CORS explanation (Chinese)

## License

MIT License - See [LICENSE](LICENSE) file for details

## Acknowledgments

- [jsQR1.0 (2026-02-13)
- ✨ **NEW**: Copy button in top-left corner of each detected code
- ✨ **NEW**: Smart click actions - open URLs or copy non-URL content
- ✨ **NEW**: Floating toolbar with rescan and close buttons
- ✨ **NEW**: i18n internationalization support (English, Simplified Chinese)
- 📊 **NEW**: Optional barcode scanning support (see BARCODE_SETUP.md)
- 🐛 **FIX**: Improved scroll tracking for highlight overlays
- 🔄 **IMPROVED**: Better UX with visual feedback for copy actions

### v1.](https://github.com/cozmo/jsQR) - Excellent QR code recognition library
- [Full Page Screen Capture](https://github.com/mrcoles/full-page-screen-capture-chrome-extension) - Project structure reference

## Contributing

Issues and Pull Requests are welcome!

## Changelog

### v1.0.0 (2026-02-12)
- ✨ Initial release
- 🔍 Basic QR code scanning functionality
- ✨ Support for multiple QR code highlighting
- 🌑 Dark overlay layer to highlight QR codes
- 🆕 Open URLs in new tabs (without affecting current page)
- ⌨️ Support ESC key and clicking overlay to close highlights
- 📱 Responsive design with scroll and resize support

---

For questions or suggestions, feel free to open an Issue!

## Support

If this project helps you, consider buying me a coffee ☕

<div align="center">
  <img src="qr-code.png" alt="Sponsor" width="200" />
</div>

Thank you for your support! ❤️
