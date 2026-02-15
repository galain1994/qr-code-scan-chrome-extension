// Copyright (c) 2026 QR Code Scanner Chrome Extension

//
// Utility functions
//

function $(id) {
    return document.getElementById(id);
}

function show(id) {
    const wrap = $('wrap');
    const children = wrap.children;
    for (let i = 0; i < children.length; i++) {
        children[i].style.display = 'none';
    }
    $(id).style.display = 'block';
}

function i18n(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions);
}

//
// Event handlers
//

async function startScan() {
    show('scanning');

    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

        // Inject the jsQR library
        await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['jsQR.js']
        });

        // Try to inject Quagga library for barcode support (optional)
        try {
            await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                files: ['quagga.min.js']
            });
            console.log('Quagga.js library loaded - barcode support enabled');
        } catch (e) {
            console.log('Quagga.js library not found - QR codes only');
        }

        // Inject the page script
        await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['page.js']
        });

        // Send message to start scanning
        const response = await chrome.tabs.sendMessage(tab.id, {msg: 'scanQRCodes'});

        if (response && response.found) {
            const count = response.count;
            const message = count === 1
                ? i18n('foundOne')
                : i18n('foundMultiple', [count.toString()]);
            $('foundMessage').textContent = message;
            show('found');
        } else {
            show('not-found');
        }
    } catch (error) {
        console.error('Error during scan:', error);
        show('error');
    }
}

//
// Initialize
//

document.addEventListener('DOMContentLoaded', function() {
    // Set i18n text
    $('title').textContent = i18n('extName');
    $('scanBtn').textContent = i18n('scanButton');
    $('scanningMessage').textContent = i18n('scanning');
    $('notFoundMessage').textContent = i18n('notFound');
    $('retryBtn').textContent = i18n('retry');
    $('errorMessage').textContent = i18n('error');
    $('errorRetryBtn').textContent = i18n('retry');

    // Set event listeners
    $('scanBtn').addEventListener('click', startScan);
    $('retryBtn').addEventListener('click', startScan);
    $('errorRetryBtn').addEventListener('click', startScan);
});
