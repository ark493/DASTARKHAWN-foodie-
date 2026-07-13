 const API_URL = "";
let currentMode = 'register';
let map = null, marker = null;

document.addEventListener('DOMContentLoaded', () => { addMenuRow(); });

function switchTab(mode) {
    currentMode = mode;
    const regTab = document.getElementById('regTab');
    const updTab = document.getElementById('updTab');
    const updateSection = document.getElementById('updateSection');
    const actionBtn = document.getElementById('actionBtn');

    if(mode === 'register') {
        regTab.classList.add('bg-orange-500'); updTab.classList.remove('bg-orange-500');
        updateSection.classList.add('hidden'); actionBtn.innerText = "Register Hotel";
    } else {
        updTab.classList.add('bg-orange-500'); regTab.classList.remove('bg-orange-500');
        updateSection.classList.remove('hidden'); actionBtn.innerText = "Update Hotel";
    }
}

async function checkHotelExists() {
    const val = document.getElementById('checkId').value;
    if(!val) return showToast("Enter ID or Phone", "warning");

    try {
        const res = await fetch(`${API_URL}/get_hotel_by_id/${val}`);
        const data = await res.json();
        if(res.ok) {
            document.getElementById('regName').value = data.name;
            document.getElementById('regOwner').value = data.owner;
            document.getElementById('regPhone').value = data.phone;
            document.getElementById('regLoc').value = data.location;
            showToast("Hotel Found! Update the details below.", "success");
        } else {
            showToast("Hotel Not Found", "error");
        }
    } catch(e) { showToast("Server Error", "error"); }
}

async function detectLocation() {
    const icon = document.getElementById('gpsIcon');
    icon.classList.add('fa-spin');
    
    if (!navigator.geolocation) {
        showToast("GPS not supported", "error");
        icon.classList.remove('fa-spin');
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        document.getElementById('regLoc').value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        
        const mapDiv = document.getElementById('mapPreview');
        mapDiv.classList.add('active');
        if(map) map.remove();
        map = L.map('mapPreview').setView([lat, lon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([lat, lon]).addTo(map);
        
        icon.classList.remove('fa-spin');
        showToast("Location Detected!", "success");
    }, (err) => {
        icon.classList.remove('fa-spin');
        showToast("Turn on GPS / Permissions", "error");
    });
}

async function handleAction() {
    const hotelData = {
        name: document.getElementById('regName').value,
        owner: document.getElementById('regOwner').value,
        category: document.getElementById('regCategory').value,
        phone: document.getElementById('regPhone').value,
        location: document.getElementById('regLoc').value,
        image: document.getElementById('imagePreview').src,
        rating: 5.0,
        menu: Array.from(document.querySelectorAll('#menuContainer > div')).map(row => ({
            dish: row.querySelector('.dish-name').value,
            price: row.querySelector('.dish-price').value
        }))
    };

    if(!hotelData.name || !hotelData.phone) return showToast("Fill basic details!", "warning");

    try {
        document.getElementById('hotel-loader').classList.remove('hidden');
        
        // Agar Update hai toh naye API par bhej sakte ho ya Registration wale ko hi modify kar sakte ho
        const res = await fetch(`${API_URL}/register_hotel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hotelData)
        });
        
        const result = await res.json();
        document.getElementById('hotel-loader').classList.add('hidden');

        if(res.ok) {
            document.getElementById('finalId').innerText = result.unique_id || "Updated";
            document.getElementById('dhabaToast').classList.add('active');
        }
    } catch(e) {
        document.getElementById('hotel-loader').classList.add('hidden');
        showToast("Connection Error", "error");
    }
}

// Support functions like addMenuRow, handlePreview, showToast... (keep yours)