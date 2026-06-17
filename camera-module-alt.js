/**
 * ALTERNATIVE CAMERA MODULE USING WEBCAM.JS
 * More reliable than getUserMedia on some devices
 * Optional - use if native camera doesn't work
 * 
 * SETUP:
 * 1. Add to hun2.html before closing body tag:
 *    <script src="https://cdnjs.cloudflare.com/ajax/libs/webcamjs/25/webcam.min.js"></script>
 *    <script src="camera-module-alt.js"></script>
 * 
 * 2. Replace the openCamera() function in hun2.js with this version
 */

// Webcam.js configuration
Webcam.set({
    width: 1280,
    height: 720,
    image_format: 'jpeg',
    jpeg_quality: 90,
    dest_width: 1280,
    dest_height: 720
});

let altCameraActive = false;

// ========== ALTERNATIVE: openCamera using Webcam.js ==========
async function openCamera() {
    if(memories.length >= 3) return showToast("Limit 3 memories per visit", "error");
    
    document.getElementById('camPrompt').classList.add('hidden');
    const v = document.getElementById('vFeed');
    v.classList.remove('hidden');
    document.getElementById('camUI').classList.remove('hidden');
    document.getElementById('filterBar').classList.remove('hidden');
    
    // Hide right panel
    const overlay = document.getElementById('overlay');
    const rightPanel = overlay.querySelector('.overflow-y-auto.bg-white');
    if(rightPanel) {
        rightPanel.style.visibility = 'hidden';
        rightPanel.style.display = 'none !important';
        rightPanel.style.width = '0';
        rightPanel.style.height = '0';
    }
    
    try {
        // Try native getUserMedia first
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: false 
        });
        v.srcObject = stream;
        v.play().catch(e => console.log("Native camera working"));
        window.camStream = stream;
    } catch(err) {
        console.log("Native camera failed, trying Webcam.js...");
        try {
            // Fallback to Webcam.js
            Webcam.attach('#vFeed');
            altCameraActive = true;
            showToast("Camera ready (alternative mode)");
        } catch(e) {
            showToast("Camera unavailable. Please check permissions.", "error");
            resetCam();
        }
    }
}

// ========== ALTERNATIVE: stopCamera for Webcam.js ==========
function stopCameraAlt() {
    if(window.camStream) { 
        window.camStream.getTracks().forEach(t => t.stop()); 
        window.camStream = null; 
    }
    
    if(altCameraActive) {
        try {
            Webcam.reset();
            altCameraActive = false;
        } catch(e) {
            console.log("Webcam cleanup:", e);
        }
    }
    
    const v = document.getElementById('vFeed');
    v.srcObject = null;
    
    // Show right panel again
    const overlay = document.getElementById('overlay');
    const rightPanel = overlay.querySelector('.overflow-y-auto.bg-white');
    if(rightPanel) {
        rightPanel.style.visibility = 'visible';
        rightPanel.style.display = '';
        rightPanel.style.width = '';
        rightPanel.style.height = '';
    }
    
    document.getElementById('camPrompt').classList.remove('hidden');
    document.getElementById('vFeed').classList.add('hidden');
    document.getElementById('camUI').classList.add('hidden');
    document.getElementById('filterBar').classList.add('hidden');
    document.getElementById('captionOverlay').style.display = 'none';
}

// ========== ALTERNATIVE: capturePhoto for Webcam.js ==========
function capturePhotoAlt() {
    if(altCameraActive) {
        // Using Webcam.js
        Webcam.snap(function(data_uri) {
            window.capturedImageData = data_uri;
            document.getElementById('camUI').classList.add('hidden');
            document.getElementById('filterBar').classList.add('hidden');
            document.getElementById('captionOverlay').style.display = 'flex';
            showToast("Photo captured!");
        });
    } else {
        // Using native getUserMedia (original function)
        const v = document.getElementById('vFeed');
        const c = document.getElementById('capCanvas');
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        ctx.filter = v.style.filter;
        ctx.drawImage(v, 0, 0, c.width, c.height);
        window.capturedImageData = c.toDataURL('image/jpeg');
        document.getElementById('camUI').classList.add('hidden');
        document.getElementById('filterBar').classList.add('hidden');
        document.getElementById('captionOverlay').style.display = 'flex';
    }
}

// ========== FILTERS still work with both methods ==========
function setFilter(filter) {
    currentFilter = filter;
    const v = document.getElementById('vFeed');
    
    if(altCameraActive) {
        // Webcam.js uses CSS filters on the video element
        v.style.filter = '';
    }
    
    switch(filter) {
        case 'vintage':
            v.style.filter = 'sepia(0.8) contrast(1.1)';
            break;
        case 'mono':
            v.style.filter = 'grayscale(1)';
            break;
        case 'warm':
            v.style.filter = 'brightness(1.1) saturate(1.4) hue-rotate(-15deg)';
            break;
        default:
            v.style.filter = 'none';
    }
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}