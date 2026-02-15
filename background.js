// Background Service Worker for QR Code Scanner Extension
// Handles page screenshot capture and cross-origin image fetching

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.msg === 'captureVisibleTab') {
        console.log('📸 Background: Capturing visible tab...');

        // Capture the visible tab as an image
        chrome.tabs.captureVisibleTab(
            sender.tab.windowId,
            { format: 'png' },
            (dataUrl) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Background: Screenshot error:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else if (!dataUrl || dataUrl.length === 0) {
                    console.error('❌ Background: Screenshot is empty');
                    sendResponse({ success: false, error: 'Screenshot is empty' });
                } else {
                    console.log('✅ Background: Screenshot captured successfully');
                    console.log('📊 Background: DataUrl length:', dataUrl.length, 'characters');
                    console.log('📊 Background: DataUrl prefix:', dataUrl.substring(0, 50));
                    sendResponse({ success: true, dataUrl: dataUrl });
                }
            }
        );
        return true; // Keep message channel open for async response
    } else if (request.msg === 'fetchCrossOriginImage') {
        // Handle cross-origin image fetching
        console.log('📥 Background: Fetching cross-origin image:', request.url);

        fetch(request.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                // Convert blob to data URL
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log('✅ Background: Image fetched successfully');
                    sendResponse({ success: true, dataUrl: reader.result });
                };
                reader.onerror = () => {
                    console.error('❌ Background: Failed to read blob');
                    sendResponse({ success: false, error: 'Failed to read blob' });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('❌ Background: Fetch error:', error.message);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep message channel open for async response
    }
});
