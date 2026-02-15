// QR Code Scanner Page Script

(function() {
    'use strict';

    // Prevent multiple injections
    if (window.hasQRCodeScanner) {
        return;
    }
    window.hasQRCodeScanner = true;

    const qrCodeResults = [];
    let highlightOverlays = [];
    let qrCodeOverlays = []; // Separate array for QR code overlays (without dark overlay)
    let keyboardHandler = null;
    let toolbarElement = null;
    let updateTimer = null; // Timer for position updates

    // Check if Quagga library is available
    const hasBarcodeSupport = typeof Quagga !== 'undefined';
    if (hasBarcodeSupport) {
        console.debug('✅ Barcode support enabled (Quagga.js library detected)');
    } else {
        console.debug('ℹ️ QR code only mode (Quagga.js library not found)');
        console.debug('  To enable barcode support, see BARCODE_SETUP.md');
    }

    // i18n helper
    function i18n(key, substitutions) {
        return chrome.i18n.getMessage(key, substitutions);
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.msg === 'scanQRCodes') {
            // Wait for page to be fully loaded before scanning
            waitForPageFullyLoaded().then(() => {
                return scanPageForQRCodes();
            }).then(results => {
                if (results.length > 0) {
                    highlightQRCodes(results);
                    sendResponse({found: true, count: results.length});
                } else {
                    sendResponse({found: false, count: 0});
                }
            }).catch(error => {
                console.error('QR scanning error:', error);
                sendResponse({found: false, count: 0, error: error.message});
            });
            return true; // Keep the message channel open for async response
        } else if (request.msg === 'rescanQRCodes') {
            // Handle rescan request from toolbar
            rescanQRCodes();
            sendResponse({success: true});
            return true;
        }
    });

    /**
     * Wait for the page to be fully loaded including all resources
     */
    function waitForPageFullyLoaded() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                // Page is already loaded, wait more for async operations
                console.debug('⏳ Page already loaded, waiting for async content (canvas drawing, etc.)...');
                setTimeout(resolve, 3000); // Increased to 3s for canvas async operations
            } else {
                // Wait for load event
                console.debug('⏳ Waiting for page to fully load...');
                window.addEventListener('load', () => {
                    // Wait more after load for dynamic content, lazy-loaded images, and async canvas operations
                    console.debug('⏳ Page loaded, waiting for async operations...');
                    setTimeout(resolve, 3000);
                });
            }
        });
    }

    /**
     * Scan the entire page for QR codes in images and canvas elements
     */
    async function scanPageForQRCodes() {
        const results = [];

        // Clear previous results
        qrCodeResults.length = 0;
        removeAllHighlights();

        console.debug('🔍 Starting comprehensive page scan...');
        console.debug('📋 Step 1: Scanning individual images');

        // Scan all images
        const images = document.querySelectorAll('img');
        console.debug(`Found ${images.length} image(s) on page`);

        for (let img of images) {
            try {
                // Try QR code first
                const qrData = await scanImage(img);
                if (qrData) {
                    console.debug('QR code found in image:', qrData.data);
                    results.push({
                        element: img,
                        data: qrData.data,
                        location: qrData.location,
                        type: 'QR'
                    });
                    continue; // Skip barcode scanning if QR found
                }

                // Try barcode if Quagga is available
                if (hasBarcodeSupport) {
                    const barcodeData = await scanImageForBarcode(img);
                    if (barcodeData) {
                        console.debug('Barcode found in image:', barcodeData.text, 'Format:', barcodeData.format);
                        results.push({
                            element: img,
                            data: barcodeData.text,
                            location: null,
                            type: barcodeData.format
                        });
                    }
                }
            } catch (e) {
                console.warn('Error scanning image:', e);
            }
        }

        console.debug('📋 Step 2: Scanning canvas elements');

        // Scan all canvas elements
        const canvases = document.querySelectorAll('canvas');
        console.debug(`Found ${canvases.length} canvas element(s)`);
        for (let canvas of canvases) {
            try {
                const qrData = await scanCanvas(canvas);
                if (qrData) {
                    results.push({
                        element: canvas,
                        data: qrData.data,
                        location: qrData.location,
                        type: 'QR'
                    });
                }
            } catch (e) {
                // Skip canvases that can't be scanned
            }
        }

        console.debug('📋 Step 3: Scanning SVG elements');

        // Scan all SVG elements (for barcode support)
        const svgs = document.querySelectorAll('svg');
        console.debug(`Found ${svgs.length} SVG element(s)`);
        for (let svg of svgs) {
            try {
                // Try QR code first
                const qrData = await scanSVG(svg);
                if (qrData) {
                    console.debug('QR code found in SVG:', qrData.data);
                    results.push({
                        element: svg,
                        data: qrData.data,
                        location: qrData.location,
                        type: 'QR'
                    });
                    continue;
                }

                // Try barcode if Quagga is available
                if (hasBarcodeSupport) {
                    const barcodeData = await scanSVGForBarcode(svg);
                    if (barcodeData) {
                        console.debug('Barcode found in SVG:', barcodeData.text, 'Format:', barcodeData.format);
                        results.push({
                            element: svg,
                            data: barcodeData.text,
                            location: null,
                            type: barcodeData.format
                        });
                    }
                }
            } catch (e) {
                console.warn('Error scanning SVG:', e);
            }
        }

        console.debug(`✅ Scan complete! Found ${results.length} code(s)`);

        qrCodeResults.push(...results);
        return results;
    }

    /**
     * Scan an image element for QR codes
     *
     * 工作原理：
     * 1. 对于同域图片：直接读取像素数据
     * 2. 对于跨域图片：利用扩展权限通过 fetch 重新下载，绕过 CORS 限制
     * 3. 使用Canvas API读取图片的像素数据
     * 4. 使用jsQR库解析像素数据中的二维码
     *
     * CORS 解决方案：
     * - 同域图片：直接读取（无限制）
     * - 跨域图片：通过扩展的 fetch (无 CORS 限制) 重新下载图片
     */
    async function scanImage(img) {
        if (!img.complete || img.naturalWidth === 0) {
            console.debug('⏳ Image not loaded yet:', img.src);
            return null;
        }

        console.debug(`🔍 Scanning image: ${img.src.substring(0, 80)}...`);

        // 策略：先尝试直接扫描，失败后再通过 background worker
        // 这样可以处理：data:, blob:, 同域图片，以及部分跨域图片
        
        // 1. 首先尝试直接扫描（适用于 data:, blob:, 同域图片）
        let directResult = await scanImageDirect(img);
        if (directResult !== null) {
            return directResult; // 成功，直接返回
        }

        // 2. 直接扫描失败，检查是否需要通过 background worker
        // data: 和 blob: 协议如果直接扫描失败，说明图片有问题，不再重试
        if (img.src.startsWith('data:') || img.src.startsWith('blob:')) {
            console.debug('❌ data:/blob: URL scan failed');
            return null;
        }

        // 3. 对于 HTTP/HTTPS/file:// 等，尝试通过 background worker 下载
        console.debug('📥 Direct scan failed, trying background worker fetch...');
        
        // 判断是否是有效的可 fetch 的 URL
        try {
            new URL(img.src, window.location.href);
        } catch (e) {
            console.warn('⚠️ Invalid image URL:', img.src);
            return null;
        }

        return await scanImageWithFetch(img.src, img.naturalWidth || img.width, img.naturalHeight || img.height);
    }

    /**
     * 直接扫描图片（用于同域图片或已设置 CORS 的图片）
     */
    async function scanImageDirect(img) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            // 绘制图片到Canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 读取像素数据
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 使用jsQR解析二维码
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                console.debug('✅ Successfully decoded QR code:', code.data);
                return code;
            } else {
                console.debug('❌ No QR code found in this image');
                return null;
            }
        } catch (e) {
            // 捕获CORS错误和其他安全错误（包括 file:// 协议）
            if (e.name === 'SecurityError' || e.message.includes('tainted') || e.message.includes('cross-origin')) {
                return null; // 返回 null，让调用者尝试 background worker
            } else {
                console.error('❌ Canvas error:', e.message);
                return null;
            }
        }
    }

    /**
     * 使用扩展权限通过 background worker 下载跨域图片并扫描
     * Background worker 有完整的跨域权限，不受 CORS 限制
     */
    async function scanImageWithFetch(imageUrl, width, height) {
        try {
            console.debug('📥 Fetching cross-origin image via background worker:', imageUrl);

            // 通过 background worker 下载图片（绕过 CORS）
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { msg: 'fetchCrossOriginImage', url: imageUrl },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (!response.success) {
                console.error('❌ Background fetch failed:', response.error);
                // 为 file:// 协议提供友好提示
                if (imageUrl.startsWith('file://')) {
                    console.error('💡 Tip: For file:// URLs, please enable "Allow access to file URLs" in extension settings');
                    console.error('   Go to: chrome://extensions/ → QR Code Scanner → Details → Allow access to file URLs');
                }
                return null;
            }

            // 从 data URL 加载图片
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image from data URL'));
                img.src = response.dataUrl;
            });

            // 扫描下载的图片
            const canvas = document.createElement('canvas');
            canvas.width = img.width || width;
            canvas.height = img.height || height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                console.debug('✅ Successfully decoded QR code from fetched image:', code.data);
                return code;
            } else {
                console.debug('❌ No QR code found in fetched image');
                return null;
            }
        } catch (error) {
            console.error('❌ Error fetching and scanning image:', error.message);
            console.error('   Image URL:', imageUrl);
            console.error('   This might be due to network issues or invalid image URL');
            return null;
        }
    }

    /**
     * Scan an image for barcodes using Quagga.js library
     */
    async function scanImageForBarcode(img) {
        if (!hasBarcodeSupport) {
            return null;
        }

        if (!img.complete || img.naturalWidth === 0) {
            return null;
        }

        // 策略：先尝试直接扫描，失败后再通过 background worker
        
        // 1. 首先尝试直接扫描
        let directResult = await scanImageForBarcodeDirect(img);
        if (directResult !== null) {
            return directResult; // 成功，直接返回
        }

        // 2. 直接扫描失败，检查是否需要通过 background worker
        // data: 和 blob: 协议如果直接扫描失败，说明图片有问题，不再重试
        if (img.src.startsWith('data:') || img.src.startsWith('blob:')) {
            return null;
        }

        // 3. 对于 HTTP/HTTPS/file:// 等，尝试通过 background worker 下载
        console.debug('📥 Direct barcode scan failed, trying background worker...');
        
        try {
            new URL(img.src, window.location.href);
        } catch (e) {
            return null;
        }

        return await scanImageForBarcodeWithFetch(img.src, img.naturalWidth || img.width, img.naturalHeight || img.height);
    }

    /**
     * 直接扫描图片中的条形码（用于同域图片）
     */
    function scanImageForBarcodeDirect(img) {
        return new Promise((resolve, reject) => {
            try {
                // Create canvas with willReadFrequently to avoid performance warning
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;

                // Get context with willReadFrequently set to true first
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Get image data once to ensure context is properly initialized
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Use Quagga to decode barcode
                // Try with locate: false first (assumes barcode fills the image)
                Quagga.decodeSingle({
                    decoder: {
                        readers: [
                            'code_128_reader', // Code 128 (most common)
                            'ean_reader',      // EAN-13, EAN-8
                            'ean_8_reader',    // EAN-8
                            'upc_reader',      // UPC-A, UPC-E
                            'upc_e_reader',    // UPC-E
                            'i2of5_reader',    // Interleaved 2 of 5 (ITF)
                            'code_39_reader',  // Code 39
                            'code_93_reader',  // Code 93
                            'codabar_reader'   // Codabar
                        ],
                        multiple: false
                    },
                    locate: false,  // Assume barcode fills the image for better accuracy
                    src: canvas.toDataURL('image/png'),
                    numOfWorkers: 0,  // Use main thread for decodeSingle
                    locator: {
                        patchSize: 'large',    // Use larger patch size for better detection
                        halfSample: false      // Don't downsample for better accuracy
                    }
                }, function(result) {
                    if (result && result.codeResult) {
                        console.debug('✅ Barcode decoded:', result.codeResult.code, 'Format:', result.codeResult.format);
                        resolve({
                            text: result.codeResult.code,
                            format: result.codeResult.format.toUpperCase()
                        });
                    } else {
                        // Try again with locate: true if first attempt fails
                        console.debug('⚠️ First attempt failed, trying with locate: true');
                        Quagga.decodeSingle({
                            decoder: {
                                readers: [
                                    'code_128_reader',
                                    'ean_reader',
                                    'ean_8_reader',
                                    'upc_reader',
                                    'upc_e_reader',
                                    'i2of5_reader',
                                    'code_39_reader',
                                    'code_93_reader',
                                    'codabar_reader'
                                ],
                                multiple: false
                            },
                            locate: true,
                            src: canvas.toDataURL('image/png'),
                            numOfWorkers: 0,
                            locator: {
                                patchSize: 'large',
                                halfSample: false
                            }
                        }, function(result2) {
                            if (result2 && result2.codeResult) {
                                console.debug('✅ Barcode decoded (2nd attempt):', result2.codeResult.code);
                                resolve({
                                    text: result2.codeResult.code,
                                    format: result2.codeResult.format.toUpperCase()
                                });
                            } else {
                                console.debug('❌ No barcode found after 2 attempts');
                                resolve(null);
                            }
                        });
                    }
                });
            } catch (e) {
                if (e.name === 'SecurityError' || e.message.includes('tainted') || e.message.includes('cross-origin')) {
                    console.warn('⚠️ Canvas tainted during barcode scan (cross-origin or file:// protocol)');
                    resolve(null);
                } else {
                    console.warn('Barcode scanning error:', e);
                    resolve(null);
                }
            }
        });
    }

    /**
     * 通过 background worker 下载跨域图片并扫描条形码
     */
    async function scanImageForBarcodeWithFetch(imageUrl, width, height) {
        if (!hasBarcodeSupport) {
            return null;
        }

        try {
            console.debug('📥 Fetching cross-origin image for barcode scan:', imageUrl);

            // 通过 background worker 下载图片
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { msg: 'fetchCrossOriginImage', url: imageUrl },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (!response.success) {
                console.error('❌ Background fetch failed for barcode:', response.error);
                // 为 file:// 协议提供友好提示
                if (imageUrl.startsWith('file://')) {
                    console.error('💡 Tip: For file:// URLs, please enable "Allow access to file URLs" in extension settings');
                    console.error('   Go to: chrome://extensions/ → QR Code Scanner → Details → Allow access to file URLs');
                }
                return null;
            }

            // 从 data URL 加载图片
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image from data URL'));
                img.src = response.dataUrl;
            });

            // 扫描条形码
            return await scanImageForBarcodeDirect(img);
        } catch (error) {
            console.error('❌ Error fetching and scanning barcode image:', error.message);
            return null;
        }
    }

    /**
     * Scan a canvas element for QR codes
     */
    function scanCanvas(canvas) {
        return new Promise((resolve, reject) => {
            try {
                if (!canvas || canvas.width === 0 || canvas.height === 0) {
                    console.warn('⚠️ Canvas is invalid or has zero dimensions');
                    resolve(null);
                    return;
                }

                // Create a new canvas with proper willReadFrequently setting
                // This avoids performance warnings when scanning existing canvas elements
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

                if (!tempCtx) {
                    console.warn('⚠️ Failed to create temp canvas context');
                    resolve(null);
                    return;
                }

                // Copy the original canvas content to our temp canvas
                tempCtx.drawImage(canvas, 0, 0);

                // Check if canvas has any content (not blank)
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imageData.data;
                let hasContent = false;
                let nonTransparentPixels = 0;
                let coloredPixels = 0;

                // Check first 2000 pixels to see if canvas has any non-white content
                const pixelsToCheck = Math.min(2000, canvas.width * canvas.height);
                for (let i = 0; i < pixelsToCheck * 4; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (a > 0) {
                        nonTransparentPixels++;
                        // If we find any pixel that's not white, canvas has content
                        if (r < 250 || g < 250 || b < 250) {
                            coloredPixels++;
                            hasContent = true;
                        }
                    }
                }

                console.debug(`🔍 Canvas ${canvas.width}x${canvas.height}: ${nonTransparentPixels} non-transparent pixels, ${coloredPixels} colored pixels (checked ${pixelsToCheck} pixels)`);

                if (!hasContent) {
                    console.debug(`⏭️ Skipping empty/blank canvas`);
                    resolve(null);
                    return;
                }

                console.debug(`📷 Scanning canvas with content...`);

                // Now scan for QR code
                const code = jsQR(data, imageData.width, imageData.height);

                if (code) {
                    console.debug('✅ Found QR code in canvas:', code.data);
                } else {
                    console.debug('❌ No QR code found in canvas (has content but no recognizable QR pattern)');
                }

                resolve(code);
            } catch (e) {
                // Check if this is a CORS/tainted canvas error
                if (e.name === 'SecurityError' || e.message.includes('tainted')) {
                    console.error('🚫 Canvas is tainted by cross-origin image - cannot read pixel data');
                    console.error('   This happens when canvas draws a cross-origin image without proper CORS headers');
                    console.error('   Error:', e.message);
                } else {
                    console.error('❌ Error scanning canvas:', e);
                }
                resolve(null);
            }
        });
    }

    /**
     * Scan an SVG element for QR codes
     */
    function scanSVG(svg) {
        return new Promise((resolve, reject) => {
            try {
                // Get SVG dimensions
                const rect = svg.getBoundingClientRect();
                const width = rect.width || svg.width.baseVal.value || 300;
                const height = rect.height || svg.height.baseVal.value || 300;

                if (width === 0 || height === 0) {
                    resolve(null);
                    return;
                }

                // Convert SVG to image
                const svgData = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = function() {
                    try {
                        // Draw to canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(img, 0, 0, width, height);

                        // Scan for QR code
                        const imageData = ctx.getImageData(0, 0, width, height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);

                        URL.revokeObjectURL(url);
                        resolve(code);
                    } catch (e) {
                        console.warn('⚠️ Error scanning SVG:', e.message);
                        URL.revokeObjectURL(url);
                        resolve(null);
                    }
                };
                img.onerror = function(e) {
                    console.warn('⚠️ Failed to load SVG as image');
                    URL.revokeObjectURL(url);
                    resolve(null);
                };
                img.src = url;
            } catch (e) {
                console.warn('⚠️ Error converting SVG:', e.message);
                resolve(null);
            }
        });
    }

    /**
     * Scan an SVG element for barcodes
     */
    function scanSVGForBarcode(svg) {
        return new Promise((resolve, reject) => {
            if (!hasBarcodeSupport) {
                resolve(null);
                return;
            }

            try {
                // Get SVG dimensions
                const rect = svg.getBoundingClientRect();
                const width = rect.width || svg.width.baseVal.value || 300;
                const height = rect.height || svg.height.baseVal.value || 300;

                if (width === 0 || height === 0) {
                    resolve(null);
                    return;
                }

                // Convert SVG to image
                const svgData = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = function() {
                    try {
                        // Draw to canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(img, 0, 0, width, height);

                        // Get image data once to ensure context is properly initialized
                        const imageData = ctx.getImageData(0, 0, width, height);

                        // Scan for barcode using Quagga (SVG)
                        // Try with locate: false first
                        Quagga.decodeSingle({
                            decoder: {
                                readers: [
                                    'code_128_reader', // Code 128 (most common)
                                    'ean_reader',      // EAN-13, EAN-8
                                    'ean_8_reader',    // EAN-8
                                    'upc_reader',      // UPC-A, UPC-E
                                    'upc_e_reader',    // UPC-E
                                    'i2of5_reader',    // Interleaved 2 of 5 (ITF)
                                    'code_39_reader',  // Code 39
                                    'code_93_reader',  // Code 93
                                    'codabar_reader'   // Codabar
                                ],
                                multiple: false
                            },
                            locate: false,  // Assume barcode fills the SVG
                            src: canvas.toDataURL('image/png'),
                            numOfWorkers: 0,
                            locator: {
                                patchSize: 'large',
                                halfSample: false
                            }
                        }, function(result) {
                            if (result && result.codeResult) {
                                console.debug('✅ SVG Barcode decoded:', result.codeResult.code, 'Format:', result.codeResult.format);
                                URL.revokeObjectURL(url);
                                resolve({
                                    text: result.codeResult.code,
                                    format: result.codeResult.format.toUpperCase()
                                });
                            } else {
                                // Try again with locate: true
                                console.debug('⚠️ SVG first attempt failed, trying with locate: true');
                                Quagga.decodeSingle({
                                    decoder: {
                                        readers: [
                                            'code_128_reader',
                                            'ean_reader',
                                            'ean_8_reader',
                                            'upc_reader',
                                            'upc_e_reader',
                                            'i2of5_reader',
                                            'code_39_reader',
                                            'code_93_reader',
                                            'codabar_reader'
                                        ],
                                        multiple: false
                                    },
                                    locate: true,
                                    src: canvas.toDataURL('image/png'),
                                    numOfWorkers: 0,
                                    locator: {
                                        patchSize: 'large',
                                        halfSample: false
                                    }
                                }, function(result2) {
                                    URL.revokeObjectURL(url);
                                    if (result2 && result2.codeResult) {
                                        console.debug('✅ SVG Barcode decoded (2nd attempt):', result2.codeResult.code);
                                        resolve({
                                            text: result2.codeResult.code,
                                            format: result2.codeResult.format.toUpperCase()
                                        });
                                    } else {
                                        console.debug('❌ No SVG barcode found after 2 attempts');
                                        resolve(null);
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        URL.revokeObjectURL(url);
                        console.warn('Barcode scanning error in SVG:', e);
                        resolve(null);
                    }
                };
                img.onerror = function() {
                    URL.revokeObjectURL(url);
                    resolve(null);
                };
                img.src = url;
            } catch (e) {
                console.warn('Error converting SVG for barcode:', e);
                resolve(null);
            }
        });
    }

    /**
     * Highlight all found QR codes on the page
     */
    function highlightQRCodes(results) {
        removeAllHighlights();

        // Create dark overlay for the entire page
        const darkOverlay = document.createElement('div');
        darkOverlay.className = 'qr-scanner-dark-overlay';
        darkOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999998;
            pointer-events: auto;
            cursor: pointer;
        `;

        // Click overlay to close highlights
        darkOverlay.addEventListener('click', function() {
            removeAllHighlights();
        });

        document.body.appendChild(darkOverlay);
        highlightOverlays.push(darkOverlay);

        // Create floating toolbar
        createToolbar();

        results.forEach((result, index) => {
            let rect;

            // For screenshot results, calculate position from location data
            if (result.isScreenshot && result.location) {
                const loc = result.location;
                // Calculate bounding box from QR code corner positions
                const xs = [loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomLeftCorner.x, loc.bottomRightCorner.x];
                const ys = [loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomLeftCorner.y, loc.bottomRightCorner.y];
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                rect = {
                    left: minX,
                    top: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    right: maxX,
                    bottom: maxY
                };

                console.debug(`Highlighting ${result.type} #${index + 1} from screenshot:`, {
                    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                });
            } else if (result.location && result.element) {
                // For element-based results with location data (canvas, img, svg)
                // Calculate precise QR code position within the element
                if (!document.body.contains(result.element)) {
                    console.warn(`Element not in DOM:`, result.element);
                    qrCodeOverlays.push(null);
                    return;
                }

                const elementRect = result.element.getBoundingClientRect();
                const loc = result.location;

                // Calculate scale factors between element display size and scanned size
                // Important: Use the same dimensions that were used during scanning (naturalWidth/naturalHeight)
                let scannedWidth, scannedHeight;
                if (result.element.tagName === 'IMG') {
                    scannedWidth = result.element.naturalWidth || result.element.width;
                    scannedHeight = result.element.naturalHeight || result.element.height;
                } else if (result.element.tagName === 'CANVAS') {
                    scannedWidth = result.element.width;
                    scannedHeight = result.element.height;
                } else {
                    // For SVG or other elements
                    scannedWidth = elementRect.width;
                    scannedHeight = elementRect.height;
                }
                const scaleX = elementRect.width / scannedWidth;
                const scaleY = elementRect.height / scannedHeight;

                // Calculate bounding box from QR code corner positions
                const xs = [loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomLeftCorner.x, loc.bottomRightCorner.x];
                const ys = [loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomLeftCorner.y, loc.bottomRightCorner.y];
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                // Convert to page coordinates
                rect = {
                    left: elementRect.left + minX * scaleX,
                    top: elementRect.top + minY * scaleY,
                    width: (maxX - minX) * scaleX,
                    height: (maxY - minY) * scaleY,
                    right: elementRect.left + maxX * scaleX,
                    bottom: elementRect.top + maxY * scaleY
                };

                console.debug(`Highlighting ${result.type} #${index + 1} in ${result.element.tagName} with location:`, {
                    element: result.element.tagName,
                    elementRect: { left: elementRect.left, top: elementRect.top, width: elementRect.width, height: elementRect.height },
                    scannedSize: { width: scannedWidth, height: scannedHeight },
                    scale: { x: scaleX, y: scaleY },
                    qrLocationInScanned: { minX, minY, maxX, maxY },
                    qrRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                });
            } else {
                // For element-based results without location data, highlight entire element
                if (!document.body.contains(result.element)) {
                    console.warn(`Element not in DOM:`, result.element);
                    qrCodeOverlays.push(null);
                    return;
                }

                rect = result.element.getBoundingClientRect();

                console.debug(`Highlighting ${result.type} #${index + 1} (entire element):`, {
                    element: result.element.tagName,
                    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    inDOM: document.body.contains(result.element)
                });
            }

            // Skip invalid dimensions
            if (rect.width === 0 || rect.height === 0) {
                qrCodeOverlays.push(null);
                return;
            }

            // Create overlay container
            const overlay = document.createElement('div');
            overlay.className = 'qr-code-highlight';
            overlay.style.cssText = `
                position: fixed !important;
                left: ${rect.left}px !important;
                top: ${rect.top}px !important;
                width: ${rect.width}px !important;
                height: ${rect.height}px !important;
                border: 3px solid #4285f4 !important;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3), 0 0 20px rgba(66, 133, 244, 0.5) !important;
                z-index: 999999 !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                transition: all 0.2s ease !important;
                box-sizing: border-box !important;
            `;

            // Create label container
            const labelContainer = document.createElement('div');
            labelContainer.style.cssText = `
                position: absolute !important;
                top: -30px !important;
                left: 0 !important;
                display: flex !important;
                gap: 5px !important;
                align-items: center !important;
                z-index: 1 !important;
            `;

            // Create label
            const label = document.createElement('div');
            label.style.cssText = `
                background: #4285f4 !important;
                color: white !important;
                padding: 5px 10px !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                font-family: Arial, sans-serif !important;
                white-space: nowrap !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                cursor: pointer !important;
                user-select: none !important;
                margin: 0 !important;
            `;
            const codeType = result.type || 'QR';
            const labelText = codeType === 'QR'
                ? i18n('qrCodeType')
                : codeType;
            label.textContent = labelText;

            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.style.cssText = `
                background: #34a853 !important;
                color: white !important;
                border: none !important;
                padding: 5px 10px !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                font-family: Arial, sans-serif !important;
                cursor: pointer !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                user-select: none !important;
                transition: background 0.2s !important;
                margin: 0 !important;
            `;
            copyBtn.textContent = '📋 ' + i18n('copyButton');
            copyBtn.title = i18n('copyButton');

            // Copy button click handler
            copyBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering overlay click
                navigator.clipboard.writeText(result.data).then(() => {
                    // Show feedback
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✓ ' + i18n('copied');
                    copyBtn.style.background = '#1e8e3e';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.background = '#34a853';
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    copyBtn.textContent = '✗ ' + i18n('copyFailed');
                    copyBtn.style.background = '#d93025';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 ' + i18n('copyButton');
                        copyBtn.style.background = '#34a853';
                    }, 1500);
                });
            });

            // Copy button hover effect
            copyBtn.addEventListener('mouseenter', function() {
                this.style.background = '#2d8e47';
            });
            copyBtn.addEventListener('mouseleave', function() {
                if (this.textContent === '📋 ' + i18n('copyButton')) {
                    this.style.background = '#34a853';
                }
            });

            labelContainer.appendChild(label);
            labelContainer.appendChild(copyBtn);
            overlay.appendChild(labelContainer);

            // Add hover effect
            overlay.addEventListener('mouseenter', function() {
                this.style.borderColor = '#34a853';
                this.style.boxShadow = '0 0 0 2px rgba(52, 168, 83, 0.3), 0 0 25px rgba(52, 168, 83, 0.6)';
            });

            overlay.addEventListener('mouseleave', function() {
                this.style.borderColor = '#4285f4';
                this.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.3), 0 0 20px rgba(66, 133, 244, 0.5)';
            });

            // Add click handler - open URL or copy content
            overlay.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering the dark overlay click
                const data = result.data;
                if (data) {
                    // Check if it's a valid URL
                    const isURL = /^(https?:\/\/|www\.)/i.test(data) ||
                                 (data.includes('.') && !data.includes(' ') && data.split('.').length > 1);

                    if (isURL) {
                        // Open URL in new tab
                        const url = data.startsWith('http://') || data.startsWith('https://')
                            ? data
                            : 'http://' + data;
                        window.open(url, '_blank');
                    } else {
                        // Copy to clipboard for non-URI content
                        navigator.clipboard.writeText(data).then(() => {
                            // Show feedback
                            label.textContent = '✓ ' + i18n('copied');
                            label.style.background = '#34a853';
                            setTimeout(() => {
                                label.textContent = labelText;
                                label.style.background = '#4285f4';
                            }, 1500);
                        }).catch(err => {
                            console.error('Failed to copy:', err);
                            alert(i18n('qrCodeContent', [data]));
                        });
                    }
                    // Remove highlights after clicking
                    setTimeout(() => removeAllHighlights(), isURL ? 0 : 1600);
                }
            });

            document.body.appendChild(overlay);
            highlightOverlays.push(overlay);
            qrCodeOverlays.push(overlay); // Track QR code overlays separately
        });

        // Update overlay positions on scroll and resize
        // Use capture phase (true) to catch scroll events from all scrollable elements
        document.addEventListener('scroll', updateOverlayPositions, true);
        window.addEventListener('scroll', updateOverlayPositions);
        window.addEventListener('resize', updateOverlayPositions);

        // Add ESC key handler to close highlights
        keyboardHandler = function(e) {
            if (e.key === 'Escape') {
                removeAllHighlights();
            }
        };
        document.addEventListener('keydown', keyboardHandler);
    }

    /**
     * Update overlay positions when scrolling or resizing
     */
    function updateOverlayPositions() {
        // Use requestAnimationFrame for smooth updates
        if (updateTimer) {
            cancelAnimationFrame(updateTimer);
        }

        updateTimer = requestAnimationFrame(() => {
            qrCodeResults.forEach((result, index) => {
                if (qrCodeOverlays[index]) {
                    const overlay = qrCodeOverlays[index];
                    let rect;

                    // For screenshot results, positions are fixed relative to viewport at capture time
                    if (result.isScreenshot && result.location) {
                        // Screenshot positions don't change with scroll since they're from a static capture
                        // Just keep the original position
                        return;
                    } else if (result.location && result.element) {
                        // For element-based results with location data, recalculate precise position
                        if (!document.body.contains(result.element)) {
                            console.warn(`Element ${index} no longer in DOM`);
                            return;
                        }

                        const elementRect = result.element.getBoundingClientRect();
                        const loc = result.location;

                        // Calculate scale factors (same logic as highlightQRCodes)
                        let scannedWidth, scannedHeight;
                        if (result.element.tagName === 'IMG') {
                            scannedWidth = result.element.naturalWidth || result.element.width;
                            scannedHeight = result.element.naturalHeight || result.element.height;
                        } else if (result.element.tagName === 'CANVAS') {
                            scannedWidth = result.element.width;
                            scannedHeight = result.element.height;
                        } else {
                            // For SVG or other elements
                            scannedWidth = elementRect.width;
                            scannedHeight = elementRect.height;
                        }
                        const scaleX = elementRect.width / scannedWidth;
                        const scaleY = elementRect.height / scannedHeight;

                        // Calculate bounding box from QR code corner positions
                        const xs = [loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomLeftCorner.x, loc.bottomRightCorner.x];
                        const ys = [loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomLeftCorner.y, loc.bottomRightCorner.y];
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);

                        // Convert to page coordinates
                        rect = {
                            left: elementRect.left + minX * scaleX,
                            top: elementRect.top + minY * scaleY,
                            width: (maxX - minX) * scaleX,
                            height: (maxY - minY) * scaleY
                        };

                        overlay.style.left = rect.left + 'px';
                        overlay.style.top = rect.top + 'px';
                        overlay.style.width = rect.width + 'px';
                        overlay.style.height = rect.height + 'px';
                    } else {
                        // For element-based results without location data, update entire element position
                        if (!document.body.contains(result.element)) {
                            console.warn(`Element ${index} no longer in DOM`);
                            return;
                        }

                        rect = result.element.getBoundingClientRect();

                        // Validate rect values
                        if (rect.left === 0 && rect.top === 0 && rect.width === 0 && rect.height === 0) {
                            console.warn(`Element ${index} has zero rect, element:`, result.element.tagName);
                            return;
                        }

                        overlay.style.left = rect.left + 'px';
                        overlay.style.top = rect.top + 'px';
                        overlay.style.width = rect.width + 'px';
                        overlay.style.height = rect.height + 'px';
                    }
                }
            });
            updateTimer = null;
        });
    }

    /**
     * Remove all highlight overlays
     */
    function removeAllHighlights() {
        // Cancel any pending position updates
        if (updateTimer) {
            cancelAnimationFrame(updateTimer);
            updateTimer = null;
        }

        highlightOverlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        highlightOverlays = [];
        qrCodeOverlays = [];

        // Remove toolbar
        if (toolbarElement && toolbarElement.parentNode) {
            toolbarElement.parentNode.removeChild(toolbarElement);
            toolbarElement = null;
        }

        document.removeEventListener('scroll', updateOverlayPositions, true);
        window.removeEventListener('scroll', updateOverlayPositions);
        window.removeEventListener('resize', updateOverlayPositions);

        // Remove keyboard handler
        if (keyboardHandler) {
            document.removeEventListener('keydown', keyboardHandler);
            keyboardHandler = null;
        }
    }

    /**
     * Create floating toolbar with rescan and close buttons
     */
    function createToolbar() {
        // Remove existing toolbar if any
        if (toolbarElement && toolbarElement.parentNode) {
            toolbarElement.parentNode.removeChild(toolbarElement);
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'qr-scanner-toolbar';
        toolbar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 9999999;
            font-family: Arial, sans-serif;
        `;

        // Rescan button
        const rescanBtn = document.createElement('button');
        rescanBtn.style.cssText = `
            background: #4285f4;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        rescanBtn.innerHTML = '🔄 ' + i18n('rescanButton');
        rescanBtn.addEventListener('click', function() {
            rescanQRCodes();
        });
        rescanBtn.addEventListener('mouseenter', function() {
            this.style.background = '#3367d6';
        });
        rescanBtn.addEventListener('mouseleave', function() {
            this.style.background = '#4285f4';
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: #d93025;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        closeBtn.innerHTML = '✕ ' + i18n('closeButton');
        closeBtn.addEventListener('click', function() {
            removeAllHighlights();
        });
        closeBtn.addEventListener('mouseenter', function() {
            this.style.background = '#b71c1c';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.background = '#d93025';
        });

        toolbar.appendChild(rescanBtn);
        toolbar.appendChild(closeBtn);
        document.body.appendChild(toolbar);
        toolbarElement = toolbar;
    }

    /**
     * Rescan QR codes on the page
     */
    function rescanQRCodes() {
        removeAllHighlights();
        scanPageForQRCodes().then(results => {
            if (results.length > 0) {
                highlightQRCodes(results);
            } else {
                // Show a temporary message
                const message = document.createElement('div');
                message.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 20px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-family: Arial, sans-serif;
                    z-index: 9999999;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                `;
                message.textContent = i18n('notFound');
                document.body.appendChild(message);
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 2000);
            }
        }).catch(error => {
            console.error('Rescan error:', error);
        });
    }

})();
