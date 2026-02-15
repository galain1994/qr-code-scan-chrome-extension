# 🧪 Testing Guide

[简体中文](TESTING.md) | English

## Overview

QR Code Scanner extension provides two test pages to verify functionality:

1. **test.html** - Uses online API to generate QR codes (requires network, may have CORS limitations)
2. **test-local.html** - Uses local JavaScript library to generate real QR codes (recommended)

## Quick Testing Steps

### 1. Install Extension

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the project folder `/Users/gala/Code/qr-code-scan-chrome-extension`
6. Extension icon will appear in browser toolbar

### 2. Open Test Page

**Recommended: use test-local.html** (no CORS issues):
```bash
# Method 1: Open directly in browser
open test-local.html
```

Or use test.html (online API generation):
```bash
open test.html
```

### 3. Scan with Extension

1. Ensure test page is fully loaded (QR code images are visible)
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Switch to Console tab to observe log output
4. Click the extension icon in browser toolbar
5. Click "Scan QR Codes" button in popup window
6. Observe:
   - Scanning logs in Console
   - Blue highlight boxes appearing on page
   - Status information in popup window

### 4. Verify Functionality

If scanning succeeds:
- ✅ QR codes are highlighted with blue borders
- ✅ Labels "QR Code 1", "QR Code 2", etc. appear above each QR code
- ✅ Hovering over highlight box turns border green
- ✅ Clicking highlight box opens corresponding URL

If scanning fails (shows "No QR codes found"):
- Check error details in Console
- Use test-local.html instead of test.html
- Refer to debugging section below

## 🔍 Debugging Guide

### View Detailed Logs

Open Chrome DevTools (F12), in Console you will see:

**Successful log example:**
```
✅ Real QR codes generated locally using QRCode.js
Found 6 images on page
Successfully decoded QR code: https://github.com
QR code found in image: https://github.com
Successfully decoded QR code: https://www.google.com
QR code found in image: https://www.google.com
...
```

**Failed logs may show:**
```
Found 6 images on page
CORS or canvas error: Failed to execute 'getImageData' on 'CanvasRenderingContext2D'
Both CORS and direct scan failed: ...
```

### Common Issues and Solutions

#### Issue 1: "No QR codes found on this page"

**Cause:** CORS cross-origin restrictions or images not loaded

**Solution:**
1. Use **test-local.html** test page (recommended)
2. Ensure images are fully loaded before scanning
3. Check Console for CORS errors

#### Issue 2: Canvas CORS Error

**Error message:**
```
CORS or canvas error: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': 
The canvas has been tainted by cross-origin data.
```

**Cause:** External images don't have correct CORS headers

**Solution:**
- Use test-local.html (completely avoids CORS issues)
- Or test on websites with CORS-enabled QR codes

#### Issue 3: Extension Cannot Inject Scripts

**Error message:**
```
Cannot access contents of url "chrome://...". Extension manifest must request permission...
```

**Cause:** Cannot use on special pages (chrome:// or chrome-extension://)

**Solution:**
- Only use extension on regular web pages (http://, https://, or file://)

#### Issue 4: jsQR is not defined

**Error message:**
```
jsQR is not defined
```

**Cause:** jsQR.js library not successfully injected

**Solution:**
1. Check permission configuration in manifest.json
2. Ensure jsQR.js file exists and is complete (~251KB)
3. Reload extension on extensions management page

## 🌐 Testing on Real Websites

You can test the extension on any website containing QR codes:

1. Visit web pages with QR codes, such as:
   - Payment pages
   - Share pages
   - Product packaging images
   - Social media QR codes

2. Click extension icon and scan

3. Note: Some websites' images may have CORS restrictions

## 📊 Expected Results

### On test-local.html:
- Should find 6 QR codes
- Each should correctly identify URL
- Clicking should navigate to corresponding website

### On test.html:
- If API supports CORS, should find 6 QR codes
- If CORS restricted, may find none or only some

## 🛠️ Advanced Debugging

### Check Extension Permissions

On `chrome://extensions/` page:
1. Find "QR Code Scanner" extension
2. Click "Details"
3. Confirm following permissions are enabled:
   - ✅ Read and change all your data on all websites
   - ✅ Read your browsing history

### Manual Script Injection Test

Run in Console:
```javascript
// Check if jsQR is loaded
typeof jsQR !== 'undefined' ? 'jsQR loaded' : 'jsQR NOT loaded'

// Manually trigger scan
chrome.runtime.sendMessage({msg: 'scanQRCodes'}, response => {
  console.log('Scan response:', response);
});
```

### Check Image Load Status

In test page Console:
```javascript
// Check all images' load status
document.querySelectorAll('img').forEach((img, i) => {
  console.log(`Image ${i}:`, {
    src: img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  });
});
```

## 📝 Reporting Issues

If you encounter problems, please provide:

1. Chrome version: `chrome://version/`
2. Test page used: test.html or test-local.html
3. Complete error logs from Console
4. Whether extension successfully injected (check if jsQR is defined)
5. Image load status

## ✅ Success Criteria

When extension works properly, you should be able to:

- ✅ Find all QR codes on test page (6 total)
- ✅ See blue highlight borders and labels
- ✅ Border turns green on hover
- ✅ Correct navigation after clicking
- ✅ See successful decoding logs in Console

Happy testing! 🎉
