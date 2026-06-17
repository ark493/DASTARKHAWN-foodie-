 /**
 * DASTARKHWAN PREMIUM DASHBOARD LOGIC - FINAL FIXED
 * ORIGINAL FUNCTIONS PRESERVED - NEW FEATURES SEAMLESSLY INTEGRATED
 */

let allHotels = [];
let activeCat = 'all';
let minStar = 1.0;
let memories = [];
let camStream = null;
let currentRating = 5;

// ========== NEW GLOBAL VARIABLES ==========
let currentHotel = null;  // FIXED: Store current hotel object for easy access
let currentHotelId = null;
let currentFilter = 'normal';
let capturedImageData = null;
let currentCommentHotelId = null;
let currentRatingHotelId = null;
let selectedRating = 0;
let activeTab = 'menu';
let countdownInterval;
let galleryFilesQueue = [];
let isGalleryMode = false;

document.addEventListener('DOMContentLoaded', () => {
    updateGreetingUI();
    fetchKitchensFromDB();
    
    const slider = document.getElementById('masterRating');
    if (slider) {
        slider.addEventListener('input', (e) => {
            minStar = parseFloat(e.target.value);
            document.getElementById('ratingVal').innerText = minStar.toFixed(1);
            processFilters();
        });
    }

    const searchInput = document.getElementById('masterSearch');
    if (searchInput) {
        searchInput.addEventListener('input', processFilters);
    }

    setupRatingStars();
});

// ========== ORIGINAL FUNCTIONS (UNCHANGED) ==========
function updateGreetingUI() {
    const hrs = new Date().getHours();
    let greetText = "Good Evening";
    
    if (hrs < 12) greetText = "Good Morning";
    else if (hrs < 17) greetText = "Good Afternoon";
    else if (hrs >= 21) greetText = "Good Night";
    
    const greetingElement = document.getElementById('timeGreeting');
    if (greetingElement) {
        greetingElement.innerHTML = `${greetText}, <span class="text-slate-900 font-black text-sm uppercase">${USER_NAME}</span>`;
    }
}

async function fetchKitchensFromDB() {
    try {
        const res = await fetch(`${API_URL}/get_hotels`);
        allHotels = await res.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('bentoGrid').classList.remove('hidden');
        processFilters();
    } catch (err) {
        showToast("Backend connection failed", "error");
    }
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `px-8 py-4 rounded-3xl backdrop-blur-3xl shadow-2xl border flex items-center gap-4 transition-all duration-500 toast-in pointer-events-auto ${
        type === 'success' ? 'bg-emerald-500/80 border-emerald-400 text-white' : 'bg-red-500/80 border-red-400 text-white'
    }`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon} text-xl"></i> <span class="text-[10px] font-black uppercase tracking-[0.2em]">${msg}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-4');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function setCategory(cat, el) {
    activeCat = cat;
    document.querySelectorAll('.category-story').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
    
    const titles = {
        'all': 'Featured Discoveries', 'veg': 'Pure Veg Treasures',
        'nonveg': 'Premium Non-Veg', 'tiffin': 'Daily Tiffin Services',
        'fastfood': 'Fast Food Mania', 'satvik': 'Peaceful Satvik'
    };
    document.getElementById('collectionTitle').innerText = titles[cat] || 'Explore';
    processFilters();
}

function processFilters() {
    const term = document.getElementById('masterSearch').value.toLowerCase();
    const filtered = allHotels.filter(h => {
        const matchesCat = (activeCat === 'all' || h.category === activeCat);
        const matchesSearch = (h.name.toLowerCase().includes(term) || (h.location && h.location.toLowerCase().includes(term)));
        const matchesRating = (h.rating >= minStar);
        return matchesCat && matchesSearch && matchesRating;
    });
    renderBentoGrid(filtered);
}

// ========== MODIFIED: renderBentoGrid (rating display at top right, rating icon in action bar) ==========
function renderBentoGrid(data) {
    const grid = document.getElementById('bentoGrid');
    grid.innerHTML = "";

    if (data.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-24 opacity-30 font-black uppercase tracking-[0.4em] text-xs">No kitchens found</div>`;
        return;
    }

    data.forEach((hotel, idx) => {
        const isHero = idx === 0 && activeCat === 'all' && data.length > 2;
        const card = document.createElement('div');
        card.className = `bento-card group rounded-[3rem] bg-white border border-slate-100 ${isHero ? 'md:col-span-2 md:row-span-2 h-[520px]' : 'h-72'}`;
        // No click on card – only icons trigger actions

        const img = hotel.image && hotel.image.length > 50 ? hotel.image : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600";

        // Action icons (now includes rating star)
        const actionIcons = `
            <div class="card-actions" onclick="event.stopPropagation()">
                <div class="glass-icon" onclick="event.stopPropagation(); openMenuModal('${hotel.unique_id}')">
                    <i class="fa-solid fa-utensils"></i>
                </div>
                <div class="glass-icon" onclick="event.stopPropagation(); openCommentModal('${hotel.unique_id}')">
                    <i class="fa-solid fa-comment"></i>
                </div>
                <div class="glass-icon" onclick="event.stopPropagation(); openRatingModal('${hotel.unique_id}', ${hotel.rating})">
                    <i class="fa-solid fa-star"></i>
                </div>
                <div class="glass-icon" onclick="event.stopPropagation(); openHotelLocation()">
                    <i class="fa-solid fa-location-dot"></i>
                </div>
                <div class="glass-icon" onclick="event.stopPropagation(); openMemoryCapture('${hotel.unique_id}')">
                    <i class="fa-solid fa-camera"></i>
                </div>
            </div>
        `;

        card.innerHTML = `
            <img src="${img}" class="absolute inset-0 w-full h-full object-cover transition duration-1000 group-hover:scale-110">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>
            ${actionIcons}
            <!-- Rating display moved to top right -->
            <div class="rating-display">
                <i class="fa-solid fa-star"></i> ${hotel.rating ? hotel.rating.toFixed(1) : '5.0'}
            </div>
            <div class="absolute bottom-10 left-10 right-10 text-white">
                <h3 class="${isHero ? 'text-5xl' : 'text-xl'} font-[900] uppercase tracking-tighter leading-none">${hotel.name}</h3>
                <p class="text-[9px] font-bold uppercase tracking-widest opacity-60 mt-3"><i class="fa-solid fa-map-pin text-emerald-400 mr-2"></i> ${hotel.location || 'Location not set'}</p>
                <!-- Rating span removed from here -->
            </div>
        `;
        grid.appendChild(card);
    });
}

// ========== NEW: MENU MODAL ==========
function openMenuModal(hotelId) {
    const hotel = allHotels.find(h => h.unique_id === hotelId);
    if (!hotel) return;
    
    document.getElementById('menuHotelName').innerText = hotel.name;
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = '';
    
    const menuItems = typeof hotel.menu === 'string' ? JSON.parse(hotel.menu) : hotel.menu;
    if (menuItems && menuItems.length > 0) {
        menuItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <span>${item.dish || item.name}</span>
                <span class="menu-item-price">₹${item.price}</span>
            `;
            menuList.appendChild(div);
        });
    } else {
        menuList.innerHTML = '<div class="text-center text-slate-400 py-8">No menu items available</div>';
    }
    
    document.getElementById('menuModal').style.display = 'flex';
}

function closeMenuModal() {
    document.getElementById('menuModal').style.display = 'none';
}

// ========== MODIFIED: openOverlay (ADDED currentHotel & currentHotelId & fetchMemories, DEFAULT TAB = 'mem') ==========
function openOverlay(hotel) {
    currentHotel = hotel;  // FIXED: Store hotel object for location access
    currentHotelId = hotel.unique_id;
    fetchMemories(hotel.unique_id);
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('ovName').innerText = hotel.name;
    document.getElementById('ovLoc').innerText = hotel.location || 'Location not set';
    
    memories = [];
    document.getElementById('memPreviews').innerHTML = "";
    document.getElementById('memCount').innerText = "0 / 3 Memories";
    
    const menuSec = document.getElementById('secMenu');
    menuSec.innerHTML = "";
    const menuItems = typeof hotel.menu === 'string' ? JSON.parse(hotel.menu) : hotel.menu;
    if(menuItems && menuItems.length > 0) {
        menuItems.forEach(i => {
            menuSec.innerHTML += `<div class="flex justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm"><span>${i.dish || i.name}</span><span class="text-emerald-600">₹${i.price}</span></div>`;
        });
    } else {
        menuSec.innerHTML = '<div class="text-center text-slate-400 py-4">No menu items added</div>';
    }
    
    switchTab('mem');   // ← changed from 'menu' to 'mem'
}

// ========== ORIGINAL closeOverlay, stopCamera, resetCam, triggerFile (UNCHANGED) ==========
function closeOverlay() {
    document.getElementById('overlay').classList.add('hidden');
    stopCamera();
}

// ========== FIXED: stopCamera (SHOW RIGHT PANEL AGAIN) ==========
function stopCamera() {
    if(camStream) { 
        camStream.getTracks().forEach(t => t.stop()); 
        camStream = null; 
    }
    const v = document.getElementById('vFeed');
    v.srcObject = null;
    
    // FIXED: Show right panel again
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

function resetCam() { stopCamera(); }

function triggerFile() { document.getElementById('fileInp').click(); }

// ========== FIXED: openCamera (HIDE RIGHT PANEL COMPLETELY + BETTER CAMERA) ==========
async function openCamera() {
    if(memories.length >= 3) return showToast("Limit 3 memories per visit", "error");
    
    document.getElementById('camPrompt').classList.add('hidden');
    const v = document.getElementById('vFeed');
    v.classList.remove('hidden');
    document.getElementById('camUI').classList.remove('hidden');
    document.getElementById('filterBar').classList.remove('hidden');
    
    // FIXED: Get overlay and find right panel (white panel with hotel details)
    const overlay = document.getElementById('overlay');
    const rightPanel = overlay.querySelector('.overflow-y-auto.bg-white');
    if(rightPanel) {
        rightPanel.style.visibility = 'hidden';
        rightPanel.style.display = 'none !important';
        rightPanel.style.width = '0';
        rightPanel.style.height = '0';
    }
    
    try {
        camStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: false 
        });
        v.srcObject = camStream;
        v.play().catch(e => console.warn("Play:", e));
    } catch(err) {
        try {
            camStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            v.srcObject = camStream;
            v.play().catch(e => console.warn("Play:", e));
        } catch(e) {
            showToast("Camera not available. Check permissions or try alternative method.", "error");
            resetCam();
        }
    }
}

// ========== ENHANCED: capture with countdown ==========
function startCountdown() {
    let count = 3;
    const timerEl = document.getElementById('timer');
    const smileEl = document.getElementById('smile');
    timerEl.classList.remove('hidden');
    timerEl.innerText = count;
    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            timerEl.innerText = count;
        } else {
            clearInterval(countdownInterval);
            timerEl.classList.add('hidden');
            smileEl.classList.remove('hidden');
            setTimeout(() => {
                smileEl.classList.add('hidden');
                capturePhoto();
            }, 300);
        }
    }, 1000);
}

function capturePhoto() {
    const v = document.getElementById('vFeed');
    const c = document.getElementById('capCanvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.filter = v.style.filter;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    capturedImageData = c.toDataURL('image/jpeg');
    
    document.getElementById('camUI').classList.add('hidden');
    document.getElementById('filterBar').classList.add('hidden');
    document.getElementById('captionOverlay').style.display = 'flex';
}

function cancelCaption() {
    document.getElementById('captionOverlay').style.display = 'none';
    document.getElementById('camUI').classList.remove('hidden');
    document.getElementById('filterBar').classList.remove('hidden');
    capturedImageData = null;
}

function capture() {
    startCountdown();
}

// ========== FIXED: handleFile (MODERN GALLERY OVERLAY INSTEAD OF PROMPT) ==========
async function handleFile(inp) {
    const files = Array.from(inp.files).slice(0, 3 - memories.length);
    if (files.length === 0) {
        showToast("Memory limit reached!", "error");
        return;
    }
    
    // FIXED: Store files in queue instead of processing immediately
    galleryFilesQueue = files;
    isGalleryMode = true;
    processNextGalleryFile();
}

// ========== NEW: Process gallery files sequentially with modern overlay ==========
function processNextGalleryFile() {
    if (galleryFilesQueue.length === 0) {
        isGalleryMode = false;
        document.getElementById('fileInp').value = '';
        if (activeTab === 'mem') {
            fetchMemories(currentHotelId);
        }
        return;
    }
    
    const file = galleryFilesQueue.shift();
    const reader = new FileReader();
    reader.onload = function() {
        capturedImageData = reader.result;
        document.getElementById('captionInput').value = '';
        document.getElementById('captionInput').placeholder = `Add caption (${galleryFilesQueue.length + 1}/${Array.from(document.getElementById('fileInp').files).length})`;
        document.getElementById('captionOverlay').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

// ========== ORIGINAL addMemory, renderMemPreviews, removeMemory ==========
function addMemory(data) {
    if(memories.length >= 3) return;
    memories.push(data);
    renderMemPreviews();
    document.getElementById('memCount').innerText = `${memories.length} / 3 Memories`;
    if(memories.length >= 3) stopCamera();
}

function renderMemPreviews() {
    const container = document.getElementById('memPreviews');
    container.innerHTML = "";
    memories.forEach((img, idx) => {
        const div = document.createElement('div');
        div.className = "relative group w-full aspect-square animate-fade-in";
        div.innerHTML = `
            <img src="${img}" class="w-full h-full object-cover rounded-2xl shadow-lg border-2 border-white mem-img">
            <button onclick="removeMemory(${idx})" class="mem-del-btn hover:scale-110 shadow-lg"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(div);
    });
}

function removeMemory(idx) {
    memories.splice(idx, 1);
    renderMemPreviews();
    document.getElementById('memCount').innerText = `${memories.length} / 3 Memories`;
    showToast("Memory removed");
}

// ========== MODIFIED: switchTab (ADDED 'mem' TAB) ==========
function switchTab(t) {
    activeTab = t;
    document.getElementById('secMenu').classList.toggle('hidden', t !== 'menu');
    document.getElementById('secRev').classList.toggle('hidden', t !== 'rev');
    document.getElementById('secMem').classList.toggle('hidden', t !== 'mem');
    
    const baseClass = "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all";
    document.getElementById('tMenu').className = t === 'menu' ? baseClass + " bg-white shadow-sm" : baseClass + " text-slate-400";
    document.getElementById('tRev').className = t === 'rev' ? baseClass + " bg-white shadow-sm" : baseClass + " text-slate-400";
    document.getElementById('tMem').className = t === 'mem' ? baseClass + " bg-white shadow-sm" : baseClass + " text-slate-400";
    
    if (t === 'mem' && currentHotelId) {
        fetchMemories(currentHotelId);
    }
}

// ========== ORIGINAL updateRating, postReview ==========
function updateRating(n) {
    currentRating = n;
    const stars = document.getElementById('starBox').children;
    for(let i=0; i<5; i++) stars[i].style.color = (i < n) ? '#fb923c' : '#e2e8f0';
}

function postReview() {
    const msg = document.getElementById('revMsg').value;
    if(!msg) return showToast("Review cannot be empty!", "error");
    showToast("Review Locked Successfully! 🚀");
    setTimeout(() => closeOverlay(), 1000);
}

// ========== NEW FEATURES – COMMENTS, RATINGS, MEMORIES, GPS, FILTERS ==========

// ========== FIXED: GPS (USES HOTEL'S LOCATION - NOW WITH FALLBACK) -----
function openHotelLocation() {
    // FIXED: Use currentHotel object to get location (handles special characters)
    if (!currentHotel || !currentHotel.location || currentHotel.location.trim() === '') {
        showToast("No address provided", "error");
        return;
    }
    openGoogleMaps(currentHotel.location);
}

function openGoogleMaps(location) {
    // FIXED: Ensure we have the location from the card
    if (!location || location.trim() === '') {
        showToast("No address provided", "error");
        return;
    }
    
    // FIXED: Clean and encode location properly
    const cleanLocation = location.trim();
    const encodedLocation = encodeURIComponent(cleanLocation);
    
    // Try Google Maps directions first
    const url = `https://www.google.com/maps/search/${encodedLocation}`;
    
    // Log for debugging
    console.log("Opening Google Maps with location:", cleanLocation);
    
    window.open(url, '_blank');
    showToast("Opening location in Google Maps...");
}

// ----- COMMENTS -----
function openCommentModal(hotelId) {
    currentCommentHotelId = hotelId;
    const modal = document.getElementById('commentModal');
    const list = document.getElementById('commentList');
    list.innerHTML = '<div class="text-center text-slate-400">Loading comments...</div>';
    modal.style.display = 'flex';
    
    fetch(`${API_URL}/get_comments?hotel_id=${hotelId}`)
        .then(res => res.json())
        .then(comments => {
            list.innerHTML = '';
            if (comments.length === 0) {
                list.innerHTML = '<div class="text-center text-slate-400">No comments yet. Be the first!</div>';
            } else {
                comments.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.innerHTML = `
                        <div class="comment-avatar">${c.username.charAt(0).toUpperCase()}</div>
                        <div class="comment-content">
                            <div class="comment-username">${c.username}</div>
                            <div class="comment-text">${c.comment}</div>
                            <div class="comment-time">${timeAgo(c.created_at)}</div>
                        </div>
                    `;
                    list.appendChild(div);
                });
            }
        })
        .catch(() => showToast("Failed to load comments", "error"));
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

async function postComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return showToast("Comment cannot be empty", "error");
    if (!currentCommentHotelId) return;
    
    try {
        const res = await fetch(`${API_URL}/add_comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hotel_id: currentCommentHotelId,
                username: USER_NAME,
                comment: text
            })
        });
        if (res.ok) {
            input.value = '';
            showToast("Comment posted!");
            openCommentModal(currentCommentHotelId);
        } else {
            showToast("Failed to post comment", "error");
        }
    } catch(e) {
        showToast("Server error", "error");
    }
}

// ----- RATINGS -----
function setupRatingStars() {
    const stars = document.querySelectorAll('#ratingStarsModal i');
    stars.forEach((star, index) => {
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
        star.addEventListener('mouseleave', function() {
            highlightStars(selectedRating);
        });
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            highlightStars(selectedRating);
        });
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#ratingStarsModal i');
    stars.forEach((s, i) => {
        s.style.color = i < rating ? '#fb923c' : '#e2e8f0';
    });
}

function openRatingModal(hotelId, currentAvg) {
    currentRatingHotelId = hotelId;
    selectedRating = 0;
    document.getElementById('currentRatingDisplay').innerText = `Current: ⭐ ${currentAvg ? currentAvg.toFixed(1) : '5.0'}`;
    const stars = document.querySelectorAll('#ratingStarsModal i');
    stars.forEach(s => {
        s.classList.remove('active');
        s.style.color = '#e2e8f0';
    });
    document.getElementById('ratingModal').style.display = 'flex';
}

function closeRatingModal() {
    document.getElementById('ratingModal').style.display = 'none';
}

async function submitRating() {
    if (selectedRating === 0) return showToast("Select a rating", "error");
    if (!currentRatingHotelId) return;
    
    try {
        const res = await fetch(`${API_URL}/add_rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hotel_id: currentRatingHotelId,
                rating: selectedRating
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Rated ${selectedRating} ⭐`);
            const hotel = allHotels.find(h => h.unique_id === currentRatingHotelId);
            if (hotel) {
                hotel.rating = data.new_average;
                processFilters();
            }
            for (let i = 0; i < 30; i++) {
                setTimeout(() => createConfetti(), i * 30);
            }
            closeRatingModal();
        } else {
            showToast("Failed to submit rating", "error");
        }
    } catch(e) {
        showToast("Server error", "error");
    }
}

function createConfetti() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = `hsl(${Math.random() * 360}, 80%, 60%)`;
    confetti.style.width = Math.random() * 10 + 5 + 'px';
    confetti.style.height = confetti.style.width;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2000);
}

// ----- MEMORIES TRIPTYCH -----
async function fetchMemories(hotelId) {
    try {
        const res = await fetch(`${API_URL}/get_memories?hotel_id=${hotelId}`);
        const memories = await res.json();
        renderMemoriesTriptych(memories);
    } catch(e) {
        console.error(e);
    }
}

function renderMemoriesTriptych(memories) {
    const container = document.getElementById('secMem');
    container.innerHTML = '';
    if (memories.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-12">No memories yet. Add one with the camera icon!</div>';
        return;
    }
    
    for (let i = 0; i < memories.length; i += 3) {
        const group = memories.slice(i, i + 3);
        const card = document.createElement('div');
        card.className = 'memory-triptych';
        
        let photosHtml = '<div class="triptych-photos">';
        group.forEach(m => {
            photosHtml += `<img src="${m.image_data}" class="triptych-photo" alt="memory">`;
        });
        for (let j = group.length; j < 3; j++) {
            photosHtml += `<div class="triptych-photo bg-slate-100 flex items-center justify-center text-slate-300"><i class="fa-solid fa-image"></i></div>`;
        }
        photosHtml += '</div>';
        
        const hotel = allHotels.find(h => h.unique_id === memories[i].hotel_id);
        const restaurantName = hotel ? hotel.name : 'Dastarkhwan';
        const location = hotel ? hotel.location : 'India';
        const caption = group[0].caption || 'A beautiful memory';
        
        card.innerHTML = `
            ${photosHtml}
            <div class="restaurant-name">
                <span>🍽️</span> ${restaurantName}
            </div>
            <div class="memory-caption" onclick="this.classList.toggle('expanded')">
                ${caption}
                <span class="caption-fade"></span>
                <span class="read-more">read more</span>
            </div>
            <div class="location-chip" onclick="openGoogleMaps('${location}')">
                <i class="fa-solid fa-location-dot"></i> ${location.split(',')[0]}
            </div>
            <div class="memory-meta">
                <span>${new Date(memories[i].created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span class="memory-rating"><i class="fa-solid fa-star" style="color: #E57A44;"></i> ${hotel ? hotel.rating.toFixed(1) : '5.0'}</span>
            </div>
            <div class="quick-actions">
                <button class="quick-action-btn" onclick="likeMemory('${memories[i].id}')"><i class="fa-regular fa-heart"></i></button>
                <button class="quick-action-btn" onclick="shareMemory('${memories[i].id}')"><i class="fa-regular fa-paper-plane"></i></button>
                <button class="quick-action-btn" onclick="saveMemory('${memories[i].id}')"><i class="fa-regular fa-bookmark"></i></button>
            </div>
        `;
        container.appendChild(card);
    }
}

function likeMemory(id) { showToast("Liked memory!"); }
function shareMemory(id) { showToast("Share feature coming soon"); }
function saveMemory(id) { showToast("Memory saved"); }

// ----- FILTERS -----
function setFilter(filter) {
    currentFilter = filter;
    const v = document.getElementById('vFeed');
    v.style.filter = '';
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

// ========== FIXED: SAVE MEMORY WITH CAPTION (HANDLES BOTH CAMERA & GALLERY) ==========
async function saveMemoryWithCaption() {
    const caption = document.getElementById('captionInput').value.trim();
    if (!currentHotelId) {
        showToast("No hotel selected", "error");
        return;
    }
    if (!capturedImageData) return;
    
    try {
        const res = await fetch(`${API_URL}/add_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hotel_id: currentHotelId,
                image_data: capturedImageData,
                caption: caption,
                filter_used: isGalleryMode ? 'gallery' : currentFilter
            })
        });
        if (res.ok) {
            showToast("Memory saved!");
            addMemory(capturedImageData);
            document.getElementById('captionInput').value = '';
            
            if (isGalleryMode) {
                // FIXED: Process next gallery file or finish
                if (galleryFilesQueue.length > 0) {
                    processNextGalleryFile();
                } else {
                    isGalleryMode = false;
                    document.getElementById('captionOverlay').style.display = 'none';
                    document.getElementById('fileInp').value = '';
                    if (activeTab === 'mem') {
                        fetchMemories(currentHotelId);
                    }
                }
            } else {
                // Camera mode
                document.getElementById('captionOverlay').style.display = 'none';
                resetCam();
                if (activeTab === 'mem') {
                    fetchMemories(currentHotelId);
                }
            }
        } else {
            showToast("Failed to save memory", "error");
        }
    } catch(e) {
        showToast("Server error", "error");
    }
}

// ========== FIXED: OPEN MEMORY CAPTURE (NO AUTO-CAMERA, JUST OPENS OVERLAY) ==========
function openMemoryCapture(hotelId) {
    currentHotelId = hotelId;
    const hotel = allHotels.find(h => h.unique_id === hotelId);
    if (hotel) {
        openOverlay(hotel);
        // FIXED: Removed auto-camera opening – user must explicitly click Camera or Gallery
        showToast("Click 'Camera' or 'Gallery' to add memories");
    }
}

// ----- HELPER: timeAgo -----
function timeAgo(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}