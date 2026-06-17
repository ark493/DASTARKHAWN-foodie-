document.addEventListener('DOMContentLoaded', () => {
    /* ══════════════════════════════════════════════
       MOCK DATABASE / STATE
    ══════════════════════════════════════════════ */
    const takenUsernames = ['karma123', 'admin', 'god', 'system'];
    // Elements
    const onboardingModal = document.getElementById('newUserModal');
    const mainContent = document.getElementById('main-content');
    const dbUsername = document.getElementById('displayUsername');
    const desktopModal = document.getElementById('desktop-post-modal');
    const modalCloseBtn = document.getElementById('post-modal-close-btn');
    const currentUser = localStorage.getItem('karma_user_email');
    const form = document.getElementById('new-user-form');
    let croppedAvatarBlob = null; // Store the final cropped image

    // Check if user is logged in
    if (!currentUser) {
        // If no user is logged in, prevent further execution of profile-specific logic
        console.warn("No user logged in. Some profile features may be disabled.");
        // Optionally, redirect or show a login prompt
        // window.location.href = 'Karma.html'; 
        // return; // Stop script execution
    }
    /* ══════════════════════════════════════════════
       INITIALIZATION (FETCH FROM DB)
    ══════════════════════════════════════════════ */
    // Get logged in email from Auth flow (which should be saved in localStorage by Karma.js)
    let userEmail = localStorage.getItem('karma_user_email');
    if (!userEmail) {
        // [DEV MODE] If no user is logged in, don't redirect yet so you can view the page!
        // window.location.href = 'Karma.html';
        // return;
        console.warn("No user logged in. Using fallback for UI testing.");
        userEmail = "test@example.com"; // Fallback just to allow the page to load without crashing
    }
    // Attempt to load profile from database
    fetch(`http://127.0.0.1:5000/api/profile?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
            if (data.ok && data.user) {
                // Determine if they are entirely new (no username set yet)
                if (!data.user.username) {
                    mainContent.classList.add('blurred');
                    setTimeout(() => onboardingModal.classList.add('show'), 150);
                } else {
                    // They already have a profile, populate the dashboard with DB values
                    applyToDashboard(data.user);
                }
                updateDashboardStats(data.user);
            }
        })
        .catch(err => console.error("Error fetching profile:", err));
    /* ══════════════════════════════════════════════
       REAL-TIME: USERNAME VALIDATION
    ══════════════════════════════════════════════ */
    const inputUsername = document.getElementById('new-username');
    const feedUsername = document.getElementById('new-username-feedback');
    let userTimeout;
    inputUsername.addEventListener('input', (e) => {
        clearTimeout(userTimeout);
        let val = e.target.value.toLowerCase().trim();
        // Remove spaces and invalid chars instantly
        val = val.replace(/[^a-z0-9_.]/g, '');
        e.target.value = val;
        feedUsername.classList.remove('show');
        if (val.length === 0) return;
        userTimeout = setTimeout(() => {
            if (val.length < 3) {
                showFeedback(feedUsername, '❌ Too short (min 3 chars)', false);
            } else if (takenUsernames.includes(val)) {
                showFeedback(feedUsername, `❌ @${val} is already taken`, false);
            } else {
                showFeedback(feedUsername, `✅ @${val} is available`, true);
            }
        }, 400); // 400ms debounce
    });
    /* ══════════════════════════════════════════════
       REAL-TIME: BIO CHARACTER COUNT
    ══════════════════════════════════════════════ */
    const inputBio = document.getElementById('new-bio');
    const countBio = document.getElementById('bio-count');
    inputBio.addEventListener('input', (e) => {
        countBio.textContent = `${e.target.value.length}/150`;
    });
    /* ══════════════════════════════════════════════
       REAL-TIME: PINCODE API LOCATION LOOKUP
    ══════════════════════════════════════════════ */
    const inputPincode = document.getElementById('new-pincode');
    const feedPincode = document.getElementById('new-pincode-feedback');
    const inputCity = document.getElementById('new-city');
    const inputState = document.getElementById('new-state');
    inputPincode.addEventListener('input', (e) => {
        // Only allow numbers
        let val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val;
        feedPincode.classList.remove('show');
        inputCity.value = '';
        inputState.value = '';
        if (val.length === 6) {
            feedPincode.innerHTML = '<span style="color:#aaa">Fetching location...</span>';
            feedPincode.classList.add('show');
            fetch(`https://api.postalpincode.in/pincode/${val}`)
                .then(res => res.json())
                .then(data => {
                    if (data[0].Status === 'Success') {
                        const postOffice = data[0].PostOffice[0];
                        inputCity.value = postOffice.District;
                        inputState.value = postOffice.State;
                        showFeedback(feedPincode, `✅ Verified`, true);
                    } else {
                        showFeedback(feedPincode, '❌ Invalid Indian Pincode', false);
                    }
                })
                .catch(() => {
                    showFeedback(feedPincode, '❌ Network error solving pincode', false);
                });
        }
    });
    function showFeedback(el, msg, isSuccess) {
        el.innerHTML = msg;
        el.className = `feedback show ${isSuccess ? 'available' : 'unavailable'}`;
    }
    /* ══════════════════════════════════════════════
       AVATAR UPLOAD & CROPPER.JS INTEGRATION
    ══════════════════════════════════════════════ */
    const avatarInput = document.getElementById('new-avatar-input');
    const avatarTrigger = document.getElementById('avatar-trigger');
    const obAvatarPreview = document.getElementById('ob-avatar-preview');
    const cropperModal = document.getElementById('cropper-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const btnCropCancel = document.getElementById('crop-cancel');
    const btnCropSave = document.getElementById('crop-save');
    let cropperInstance = null;
    // 1. Click ring -> opens file dialog
    avatarTrigger.addEventListener('click', () => {
        avatarInput.click();
    });
    // 2. File selected -> load into cropper modal
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                cropperModal.style.display = 'flex';
                // Initialize Cropper.js
                if (cropperInstance) cropperInstance.destroy();
                cropperInstance = new Cropper(imageToCrop, {
                    aspectRatio: 1, // perfect square -> circle
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.9,
                    restore: false,
                    guides: false,
                    center: false,
                    highlight: false,
                    cropBoxMovable: false,
                    cropBoxResizable: false,
                    toggleDragModeOnDblclick: false,
                });
            };
            reader.readAsDataURL(file);
        }
        // clear input so same file can be selected again
        e.target.value = '';
    });
    // 3. Cancel cropping
    btnCropCancel.addEventListener('click', () => {
        cropperModal.style.display = 'none';
        if (cropperInstance) cropperInstance.destroy();
        cropperInstance = null;
    });
    // 4. Save cropped image
    btnCropSave.addEventListener('click', () => {
        if (!cropperInstance) return;
        // Get cropped canvas
        const canvas = cropperInstance.getCroppedCanvas({
            width: 300,
            height: 300,
        });
        // Convert to blob and URL for preview
        canvas.toBlob((blob) => {
            croppedAvatarBlob = blob; // Store for form submission
            const url = URL.createObjectURL(blob);
            // Set preview in the modal
            obAvatarPreview.innerHTML = `<img src="${url}" alt="Avatar">`;
            obAvatarPreview.style.border = 'none'; // remove dashed border
            // Close cropper modal
            cropperModal.style.display = 'none';
            cropperInstance.destroy();
            cropperInstance = null;
        }, 'image/jpeg', 0.9);
    });
    /* ══════════════════════════════════════════════
       FORM SUBMISSION -> DASHBOARD UI UPDATE
    ══════════════════════════════════════════════ */
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // 1. Verify username isn't taken or too short
        const uname = inputUsername.value;
        if (uname.length < 3 || takenUsernames.includes(uname)) {
            // Shake username input or show error
            inputUsername.focus();
            return;
        }
        // 2. Gather Data (we need their email to update the DB)
        const formData = new FormData();
        formData.append('email', localStorage.getItem('karma_user_email'));
        formData.append('username', uname);
        formData.append('full_name', document.getElementById('new-fullname').value);
        formData.append('bio', inputBio.value);
        formData.append('occupation', document.getElementById('new-occupation').value || 'Member');
        formData.append('city', inputCity.value || 'Earth');
        formData.append('locality', inputCity.value || 'Earth');
        formData.append('state', inputState.value || '');
        if (croppedAvatarBlob) {
            formData.append('avatar', croppedAvatarBlob, 'avatar.jpg');
        }

        // Send to backend
        fetch('http://127.0.0.1:5000/api/profile/update', {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(response => {
                if (response.ok) {
                    // UI Transition - Hide Modal & Unblur Dashboard
                    onboardingModal.classList.remove('show');
                    setTimeout(() => {
                        onboardingModal.style.display = 'none';
                        mainContent.classList.remove('blurred');

                        // Reconstruct object for applyToDashboard
                        const appliedData = {
                            username: uname,
                            full_name: document.getElementById('new-fullname').value,
                            bio: inputBio.value,
                            role: document.getElementById('new-occupation').value || 'Member',
                            locality: inputCity.value || 'Earth',
                            state: inputState.value || '',
                            avatar_url: response.avatar_url // Use the server URL
                        };
                        applyToDashboard(appliedData);
                        showToast(uname);
                    }, 500);
                } else {
                    alert("Error saving profile: " + response.error);
                }
            })
            .catch(err => console.error("Error updating profile:", err));
    });
    function applyToDashboard(data) {
        document.getElementById('displayUsername').textContent = data.username;
        document.getElementById('displayFullName').textContent = data.full_name || data.fullname;
        document.getElementById('displayBio').textContent = data.bio;
        document.getElementById('displayRole').textContent = (data.role || data.occupation || 'NEW USER').toUpperCase();
        let loc = data.locality || data.city;
        if (data.state) loc += `, ${data.state}`;
        document.getElementById('displayLocality').textContent = loc;
        // Set Avatar if cropped (Frontend visual-only placeholder for now until Image DB logic)
        if (data.avatarBlob) {
            const url = URL.createObjectURL(data.avatarBlob);
            setAvatarImages(url);
        } else if (data.avatar_url) {
            setAvatarImages(data.avatar_url);
        }
    }
    function setAvatarImages(url) {
        const imgEl = document.getElementById('profileImage');
        imgEl.src = url;
        imgEl.style.display = 'block';
        document.getElementById('profilePicPlaceholder').style.display = 'none';
        const navEl = document.getElementById('navAvatar');
        navEl.src = url;
        navEl.style.display = 'block';
        document.getElementById('navAvatarPlaceholder').style.display = 'none';
    }
    function updateDashboardStats(data) {
        document.getElementById('stat-coins').textContent = data.karma_coins || 0;
        document.getElementById('stat-badges').textContent = data.badges || 0;
        document.getElementById('stat-donations').textContent = data.total_donations || 0;
        document.getElementById('stat-followers').textContent = data.followers || 0;
        document.getElementById('stat-following').textContent = data.following || 0;
    }
    function showToast(username) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        const titleEl = document.getElementById('toast-title');
        const userEl = document.getElementById('toast-username');
        if (titleEl) titleEl.textContent = 'Profile Loaded';
        if (userEl) userEl.textContent = `@${username}`;

        toast.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 400);
        }, 4000);
    }

    function showToastMessage(title, message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        const titleEl = document.getElementById('toast-title');
        const userEl = document.getElementById('toast-username');
        if (titleEl) titleEl.textContent = title;
        if (userEl) userEl.textContent = message;

        toast.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 400);
        }, 4000);
    }
    /* ══════════════════════════════════════════════
       EDIT PROFILE TOGGLE
    ══════════════════════════════════════════════ */
    const editProfileBtn = document.getElementById('editProfileBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const profileViewDiv = document.getElementById('profile-view');
    const settingsViewDiv = document.getElementById('settings-view');
    if (editProfileBtn && closeSettingsBtn) {
        editProfileBtn.addEventListener('click', () => {
            // Populate inputs with current data
            document.getElementById('edit-username').value = document.getElementById('displayUsername').textContent;
            document.getElementById('edit-fullname').value = document.getElementById('displayFullName').textContent;
            document.getElementById('edit-bio').value = document.getElementById('displayBio').textContent;
            document.getElementById('edit-occupation').value = document.getElementById('displayRole').textContent;
            document.getElementById('edit-locality').value = document.getElementById('displayLocality').textContent;
            profileViewDiv.style.display = 'none';
            settingsViewDiv.style.display = 'block';
        });
        closeSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            settingsViewDiv.style.display = 'none';
            profileViewDiv.style.display = 'block';
        });
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('email', localStorage.getItem('karma_user_email'));
            formData.append('username', document.getElementById('edit-username').value);
            formData.append('full_name', document.getElementById('edit-fullname').value);
            formData.append('bio', document.getElementById('edit-bio').value);
            formData.append('role', document.getElementById('edit-occupation').value);
            formData.append('locality', document.getElementById('edit-locality').value);

            // Note: If you add an avatar upload input to the edit settings form later, 
            // you'd append it here similar to the croppedAvatarBlob logic above.

            fetch('http://127.0.0.1:5000/api/profile/update', {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(response => {
                    if (response.ok) {
                        const appliedData = {
                            username: document.getElementById('edit-username').value,
                            full_name: document.getElementById('edit-fullname').value,
                            bio: document.getElementById('edit-bio').value,
                            role: document.getElementById('edit-occupation').value,
                            locality: document.getElementById('edit-locality').value
                        };
                        applyToDashboard(appliedData);
                        settingsViewDiv.style.display = 'none';
                        profileViewDiv.style.display = 'block';
                        showToast(appliedData.username);
                    } else {
                        alert("Error saving profile: " + response.error);
                    }
                })
                .catch(err => console.error("Error updating profile settings:", err));
        });
    }

    /* ══════════════════════════════════════════════
       MAIN NAVIGATION LOGIC (SPA)
    ══════════════════════════════════════════════ */
    const navHome = document.getElementById('nav-home');
    const navProfile = document.getElementById('nav-profile');
    const homeView = document.getElementById('home-view');

    if (navProfile) {
        navProfile.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navProfile.classList.add('active');

            // Switch views
            if (typeof homeView !== 'undefined' && homeView) {
                homeView.style.display = 'none';
            }
            if (typeof settingsViewDiv !== 'undefined' && settingsViewDiv) {
                settingsViewDiv.style.display = 'none';
            }
            if (typeof profileViewDiv !== 'undefined' && profileViewDiv) {
                profileViewDiv.style.display = 'block';
            }
        });
    }

    /* ══════════════════════════════════════════════
       TABS SWITCHING LOGIC
    ══════════════════════════════════════════════ */
    const tabs = document.querySelectorAll('.tab');
    const contentArea = document.getElementById('tab-content-area');
    const tabData = {
        deeds: `
            <div id="deeds-empty-header" style="padding: 60px 0 20px; text-align: center; animation: slideUp 0.3s ease;">
                <div style="width: 70px; height: 70px; border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h3 style="font-size: 22px; font-weight: 500; margin-bottom: 12px;">Share Your Karm</h3>
                <p style="color: #a8a8a8; font-size: 14px; margin-bottom: 24px;">Upload images or videos of your good deeds to inspire others.</p>
                <!-- Initial button visible when empty -->
                <button class="create-post-trigger btn-dark" id="deeds-empty-upload-btn" style="border-radius: 99px;">Upload Media</button>
            </div>
            
            <div style="position: relative; max-width:935px; margin: 20px auto 40px; min-height: 200px;">
                <div id="profile-deeds-feed">
                    <div class="feed-loading" style="text-align:center; color:#555; padding: 40px 0;">Loading your deeds...</div>
                </div>

                <!-- Floating Action Button (Shows when grid is active) -->
                <button class="create-post-trigger ig-fab-btn" id="deeds-fab-upload" style="display:none; position: absolute; bottom: -20px; right: 20px; z-index: 100; background: var(--accent-blue); color: #fff; border: none; border-radius: 50px; padding: 12px 24px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer; display:flex; align-items:center; gap:8px; transition: transform 0.2s, background 0.2s;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Post
                </button>
            </div>
        `,
        communities: `
            <div style="padding: 60px 0; text-align: center; animation: slideUp 0.3s ease;">
                <div style="font-size: 40px; margin-bottom: 16px;">🤝</div>
                <h3 style="font-size: 22px; font-weight: 500; margin-bottom: 12px;">Joined Communities</h3>
                <p style="color: #a8a8a8; font-size: 14px; margin-bottom: 24px; max-width: 400px; margin-inline: auto;">Active network:</p>
                <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
                    <span style="background: rgba(255,255,255,0.05); padding: 12px 24px; border-radius: 12px; width: 300px; text-align: left; display:flex; gap:15px; align-items:center;">
                        <span style="font-size:24px;">🌱</span> <span>Green Earth Initiative</span>
                    </span>
                    <span style="background: rgba(255,255,255,0.05); padding: 12px 24px; border-radius: 12px; width: 300px; text-align: left; display:flex; gap:15px; align-items:center;">
                        <span style="font-size:24px;">📚</span> <span>Local Education Drive</span>
                    </span>
                </div>
            </div>
        `,
        rooms: `
            <div style="padding: 60px 0; text-align: center; animation: slideUp 0.3s ease;">
                <div style="font-size: 40px; margin-bottom: 16px;">💬</div>
                <h3 style="font-size: 22px; font-weight: 500; margin-bottom: 12px;">Connected Audio Rooms</h3>
                <p style="color: #a8a8a8; font-size: 14px; margin-bottom: 24px;">Your frequent discussion hubs:</p>
                <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
                    <span style="background: rgba(255,255,255,0.05); padding: 12px 24px; border-radius: 12px; width: 300px; text-align: left; display:flex; gap:15px; align-items:center;">
                        <span style="width:10px; height:10px; background:#00ff88; border-radius:50%; box-shadow: 0 0 10px #00ff88;"></span>
                        <span>Volunteer Sync (Live)</span>
                    </span>
                </div>
            </div>
        `,
        awaaz: `
            <div style="padding: 60px 0; text-align: center; animation: slideUp 0.3s ease;" id="awaaz-empty-header">
                <div style="width: 70px; height: 70px; border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
                </div>
                <h3 style="font-size: 22px; font-weight: 500; margin-bottom: 12px;">Awaaz TV (Creator Hub)</h3>
                <p style="color: #a8a8a8; font-size: 14px; margin-bottom: 24px; max-width: 350px; margin-inline: auto;">Welcome to Creator Hub! Upload your first video to get started.</p>
                <button class="btn-dark create-post-trigger" id="awaaz-empty-upload-btn" data-category="awaaz" style="border-radius: 99px;">Upload Media</button>
            </div>
            
            <div style="position: relative; max-width:935px; margin: 20px auto 40px; min-height: 200px;">
                <div id="profile-awaaz-feed">
                    <div class="feed-loading" style="text-align:center; color:#555; padding: 40px 0; display:none;">Loading your Awaaz TV posts...</div>
                </div>

                <!-- Floating Action Button (Shows when grid is active) -->
                <button class="create-post-trigger ig-fab-btn" id="awaaz-fab-upload" data-category="awaaz" style="display:none; position: absolute; bottom: -20px; right: 20px; z-index: 100; background: var(--accent-red, #ff3040); color: #fff; border: none; border-radius: 50px; padding: 12px 24px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer; display:flex; align-items:center; gap:8px; transition: transform 0.2s, background 0.2s;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Upload Media
                </button>
            </div>
        `
    };
    if (contentArea) {
        contentArea.innerHTML = tabData.deeds;
        if (typeof fetchUserPosts === 'function') fetchUserPosts();

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                contentArea.innerHTML = tabData[tab.dataset.target];

                if (tab.dataset.target === 'deeds' && typeof fetchUserPosts === 'function') {
                    fetchUserPosts();
                } else if (tab.dataset.target === 'awaaz' && typeof fetchAwaazPosts === 'function') {
                    fetchAwaazPosts();
                }
            });
        });
    }

    /* ══════════════════════════════════════════════
       DESKTOP POST MODAL LOGIC (PORTED FROM HOME)
    ══════════════════════════════════════════════ */
    let allProfilePosts = []; // Will store combined posts for modal lookup

    window.openDesktopModal = function (postIdStr) {
        const postId = parseInt(postIdStr, 10);
        const post = allProfilePosts.find(p => p.post_id === postId);
        if (!post) return;

        // Push State for Back button support
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('post', postId);
        history.pushState({ modalOpen: true }, '', currentUrl);

        // Render Media Left
        const mediaContainer = document.getElementById('post-modal-media-container');
        if (post.media_url) {
            const urls = post.media_url.split(',');
            if (urls.length > 1) {
                // Render Carousel inside Modal
                mediaContainer.innerHTML = `
                    <div class="modal-media-carousel" style="width:100%; height:100%; display:flex; overflow-x:scroll; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none;" ondblclick="triggerDoubleTapLike(this, ${post.post_id}, true)">
                        ${urls.map(url => {
                    const ext = url.split('.').pop().toLowerCase();
                    if (['mp4', 'webm', 'ogg'].includes(ext)) {
                        return '<video src="http://127.0.0.1:5000' + url + '" style="flex:0 0 100%; width:100%; height:100%; object-fit:contain; scroll-snap-align:start;" autoplay muted loop playsinline controls></video>';
                    } else {
                        return '<img src="http://127.0.0.1:5000' + url + '" style="flex:0 0 100%; width:100%; height:100%; object-fit:contain; scroll-snap-align:start;" alt="Post">';
                    }
                }).join('')}
                    </div>
                    <div class="carousel-dots" style="position:absolute; bottom:12px; left:0; right:0; display:flex; justify-content:center; gap:6px; z-index:10; pointer-events:none;">
                        ${urls.map((_, i) => `<div class="dot" style="width:8px; height:8px; border-radius:50%; background:${i === 0 ? '#fff' : 'rgba(255,255,255,0.5)'}; transition:background 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.8);"></div>`).join('')}
                    </div>
                `;

                // Initialize Carousel Logic for Modal
                if (window.modalCarouselInterval) clearInterval(window.modalCarouselInterval);
                setTimeout(() => {
                    const carousel = mediaContainer.querySelector('.modal-media-carousel');
                    if (carousel) {
                        const dots = mediaContainer.querySelectorAll('.carousel-dots .dot');
                        const numItems = dots.length;
                        let currentIndex = 0;

                        let isScrolling = false;
                        carousel.addEventListener('scroll', () => {
                            if (!isScrolling) {
                                window.requestAnimationFrame(() => {
                                    const index = Math.round(carousel.scrollLeft / carousel.clientWidth);
                                    if (index !== currentIndex && index >= 0 && index < numItems) {
                                        if (dots[currentIndex]) dots[currentIndex].style.background = 'rgba(255,255,255,0.5)';
                                        currentIndex = index;
                                        if (dots[currentIndex]) dots[currentIndex].style.background = '#fff';
                                    }
                                    isScrolling = false;
                                });
                                isScrolling = true;
                            }
                        });

                        window.modalCarouselInterval = setInterval(() => {
                            currentIndex = (currentIndex + 1) % numItems;
                            carousel.scrollTo({ left: currentIndex * carousel.clientWidth, behavior: 'smooth' });
                        }, 3000);
                    }
                }, 50);
            } else {
                // Single Media
                const url = urls[0];
                const ext = url.split('.').pop().toLowerCase();
                if (['mp4', 'webm', 'ogg'].includes(ext)) {
                    mediaContainer.innerHTML = '<video src="http://127.0.0.1:5000' + url + '" autoplay controls loop playsinline style="width:100%; height:100%; object-fit:contain;" ondblclick="triggerDoubleTapLike(this, ' + post.post_id + ', true)"></video>';
                } else {
                    mediaContainer.innerHTML = '<img src="http://127.0.0.1:5000' + url + '" style="width:100%; height:100%; object-fit:contain;" ondblclick="triggerDoubleTapLike(this, ' + post.post_id + ', true)">';
                }
            }
        } else if (post.content) {
            mediaContainer.innerHTML = `<div style="padding:40px; text-align:center; font-size:24px;" ondblclick="triggerDoubleTapLike(this, ${post.post_id}, true)">${post.content}</div>`;
        }

        // Render Header Right
        const headerContainer = document.getElementById('post-modal-header');
        let avatarHtml = `<div class="modal-header-ph">${(post.author_username || '?').charAt(0).toUpperCase()}</div>`;
        if (post.author_avatar) avatarHtml = `<img src="http://127.0.0.1:5000${post.author_avatar}" class="modal-header-avatar">`;

        headerContainer.innerHTML = `
            ${avatarHtml}
            <div class="modal-header-info">
                <span class="modal-header-username">${post.author_username || 'anonymous'}</span>
                <span class="modal-header-location">${post.author_locality || ''}</span>
            </div>
        `;

        // Render Comments & Caption
        const commentsContainer = document.getElementById('post-modal-comments-list');
        commentsContainer.innerHTML = '';
        if (post.content && post.media_url) {
            commentsContainer.innerHTML += `
                <div class="modal-caption" style="margin-bottom:16px;">
                    ${avatarHtml}
                    <div style="flex:1;">
                        <span class="ig-caption-author">${post.author_username}</span> 
                        <span class="modal-comment-text">${post.content}</span>
                    </div>
                </div>
            `;
        }

        loadModalComments(post.post_id, commentsContainer);

        // Render Footer
        const likeBtn = document.getElementById('modal-like-btn');
        const likeCountEl = document.getElementById('modal-like-count');
        const postTime = document.getElementById('modal-post-time');

        const viewerLiked = post.viewer_liked || false;
        likeBtn.classList.toggle('liked', viewerLiked);
        likeBtn.dataset.postId = post.post_id;
        likeBtn.onclick = () => { handleModalLike(likeBtn, post.post_id) };
        const svg = likeBtn.querySelector('svg');
        svg.setAttribute('fill', viewerLiked ? 'var(--accent-red)' : 'none');
        svg.setAttribute('stroke', viewerLiked ? 'var(--accent-red)' : 'currentColor');

        const lc = post.like_count || 0;
        likeCountEl.textContent = `${lc.toLocaleString()} ${lc === 1 ? 'like' : 'likes'}`;

        const d = new Date(post.created_at + 'Z');
        const diffMins = Math.round((Date.now() - d) / 60000);
        postTime.textContent = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins} MINS AGO` : diffMins < 1440 ? `${Math.round(diffMins / 60)} HOURS AGO` : `${Math.round(diffMins / 1440)} DAYS AGO`;

        // Sticky Input
        const postCommentBtn = document.getElementById('modal-post-comment-btn');
        const commentInput = document.getElementById('modal-comment-input');
        commentInput.value = '';

        postCommentBtn.onclick = () => {
            if (!currentUser) { showToastMessage('Login required', 'Please sign in to comment'); return; }
            if (!commentInput.value.trim()) return;
            postCommentBtn.disabled = true;
            fetch('http://127.0.0.1:5000/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_id: post.post_id,
                    author_email: currentUser,
                    content: commentInput.value.trim()
                })
            }).then(r => r.json()).then(d => {
                postCommentBtn.disabled = false;
                if (d.ok) {
                    commentInput.value = '';
                    loadModalComments(post.post_id, commentsContainer);
                    post.comment_count = (post.comment_count || 0) + 1;
                }
            }).catch(() => postCommentBtn.disabled = false);
        };
        commentInput.onkeydown = (e) => { if (e.key === 'Enter') postCommentBtn.click(); };

        desktopModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.closeDesktopModal = function () {
        if (window.modalCarouselInterval) clearInterval(window.modalCarouselInterval);
        desktopModal.classList.remove('show');
        document.body.style.overflow = '';
        const mediaContainer = document.getElementById('post-modal-media-container');
        mediaContainer.innerHTML = ''; // Stop video playback

        // Clear history push state
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.delete('post');
        history.replaceState(null, '', currentUrl);
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDesktopModal);
    if (desktopModal) {
        desktopModal.addEventListener('click', (e) => {
            if (e.target === desktopModal) closeDesktopModal();
        });
    }

    // Load Comments Helper
    function loadModalComments(postId, container) {
        fetch(`http://127.0.0.1:5000/api/comments?post_id=${postId}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.comments.length > 0) {
                    const existingHeader = container.querySelector('.modal-caption');
                    const headerHtml = existingHeader ? existingHeader.outerHTML : '';

                    const commentsHtml = data.comments.map(c => {
                        let cav = `<div class="modal-comment-ph">${(c.author_username || '?').charAt(0).toUpperCase()}</div>`;
                        if (c.author_avatar) cav = `<img src="http://127.0.0.1:5000${c.author_avatar}" class="modal-comment-avatar">`;
                        const cd = new Date(c.created_at + 'Z');
                        const diffMins = Math.round((Date.now() - cd) / 60000);
                        const timeStr = diffMins < 1 ? 'now' : diffMins < 60 ? `${diffMins}m` : diffMins < 1440 ? `${Math.round(diffMins / 60)}h` : `${Math.round(diffMins / 1440)}d`;

                        return `
                            <div class="modal-comment">
                                ${cav}
                                <div class="modal-comment-body">
                                    <span class="ig-caption-author">${c.author_username}</span>
                                    <span class="modal-comment-text">${c.content}</span>
                                    <div class="modal-comment-meta">
                                        <span>${timeStr}</span>
                                        <button class="comment-reply-btn">Reply</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    container.innerHTML = headerHtml + commentsHtml;
                }
            });
    }

    // Like logic Helper
    function handleModalLike(btn, postId) {
        if (!currentUser) { showToastMessage('Login required', 'Please sign in to like'); return; }
        const isLiked = btn.classList.contains('liked');
        const url = isLiked ? 'http://127.0.0.1:5000/api/posts/unlike' : 'http://127.0.0.1:5000/api/posts/like';
        btn.classList.toggle('liked', !isLiked);
        const svg = btn.querySelector('svg');
        svg.setAttribute('fill', !isLiked ? 'var(--accent-red)' : 'none');
        svg.setAttribute('stroke', !isLiked ? 'var(--accent-red)' : 'currentColor');

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, user_email: currentUser })
        }).then(r => r.json()).then(d => {
            if (d.ok) {
                const countEl = document.getElementById('modal-like-count');
                const post = allProfilePosts.find(p => p.post_id === postId);
                if (post) {
                    post.viewer_liked = !isLiked;
                    post.like_count = d.like_count;
                    countEl.textContent = `${d.like_count.toLocaleString()} ${d.like_count === 1 ? 'like' : 'likes'}`;
                }
            } else {
                // Revert
                btn.classList.toggle('liked', isLiked);
                svg.setAttribute('fill', isLiked ? 'var(--accent-red)' : 'none');
                svg.setAttribute('stroke', isLiked ? 'var(--accent-red)' : 'currentColor');
            }
        });
    }

    function triggerDoubleTapLike(element, postId, isModal = false) {
        if (isModal) {
            const btn = document.getElementById('modal-like-btn');
            if (btn && !btn.classList.contains('liked')) {
                handleModalLike(btn, postId);
            }
        }

        // Awaaz TV Modern Like Effect (No big center heart)
        const container = element.parentElement;
        container.style.position = 'relative';

        // 1. Scale video 1.02x for 150ms
        const originalTransform = element.style.transform || 'scale(1)';
        element.style.transition = 'transform 0.15s ease-out';
        element.style.transform = 'scale(1.02)';
        setTimeout(() => {
            element.style.transform = originalTransform;
        }, 150);

        // 2. Soft radial ripple from center
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.top = '50%';
        ripple.style.left = '50%';
        ripple.style.width = '100px';
        ripple.style.height = '100px';
        ripple.style.background = 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)';
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0.5)';
        ripple.style.opacity = '1';
        ripple.style.pointerEvents = 'none';
        ripple.style.transition = 'all 0.4s ease-out';
        ripple.style.zIndex = '50';
        container.appendChild(ripple);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                ripple.style.transform = 'translate(-50%, -50%) scale(3)';
                ripple.style.opacity = '0';
                setTimeout(() => ripple.remove(), 400);
            });
        });

        // 3. Floating small Karma Coin particles
        for (let i = 0; i < 3; i++) {
            const particle = document.createElement('div');
            // A simple coin (yellow circle)
            particle.style.position = 'absolute';
            particle.style.width = '12px';
            particle.style.height = '12px';
            particle.style.background = '#FFD700'; // Coin color
            particle.style.borderRadius = '50%';
            particle.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';

            // Randomize start position slightly around center
            const startX = 50 + (Math.random() * 10 - 5);
            const startY = 50 + (Math.random() * 10 - 5);
            particle.style.left = startX + '%';
            particle.style.top = startY + '%';
            particle.style.transform = 'translate(-50%, -50%)';
            particle.style.opacity = '1';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '60';
            particle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)';

            container.appendChild(particle);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const moveY = - (40 + Math.random() * 40); // 40-80px up
                    const moveX = (Math.random() * 50 - 25); // -25 to 25px sideways
                    particle.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) scale(1.5)`;
                    particle.style.opacity = '0';
                    setTimeout(() => particle.remove(), 800);
                });
            });
        }
    }

    /* ══════════════════════════════════════════════
       IMAGE ZOOM on CLICK
    ══════════════════════════════════════════════ */
    const imgModal = document.getElementById('imageModal');
    const fullImg = document.getElementById('fullScreenImg');
    const profilePicWrapper = document.querySelector('.profile-pic-wrapper');
    const closeImgModal = document.querySelector('.close-image-modal');
    if (profilePicWrapper && imgModal) {
        profilePicWrapper.addEventListener('click', () => {
            const currentImg = document.getElementById('profileImage');
            if (currentImg && currentImg.src && currentImg.style.display !== 'none') {
                imgModal.style.display = 'block';
                fullImg.src = currentImg.src;
                document.body.style.overflow = 'hidden'; // stop background scrolling
            }
        });
        // Close when clicking X
        closeImgModal.addEventListener('click', () => {
            imgModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
        });
        // Close when clicking background
        imgModal.addEventListener('click', (e) => {
            if (e.target === imgModal) {
                imgModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
});

/* ══════════════════════════════════════════════
   GLOBAL FUNCTIONS FOR REAL FILE UPLOADS
══════════════════════════════════════════════ */
let pendingUploadFile = null;
let pendingUploadCategory = null;

// The Modal References
const igUploadModal = document.getElementById('ig-upload-modal');
const igImgPreview = document.getElementById('ig-image-preview');
const igVidPreview = document.getElementById('ig-video-preview');
const igCaptionInput = document.getElementById('ig-caption-input');
const igShareBtn = document.getElementById('ig-share-btn');
const igCancelBtn = document.getElementById('ig-cancel-btn');
const igLoading = document.getElementById('ig-loading-overlay');
const igPostAvatar = document.getElementById('ig-post-avatar');
const igPostUsername = document.getElementById('ig-post-username');

window.triggerMediaUpload = function (category) {
    const userEmail = localStorage.getItem('karma_user_email');
    if (!userEmail || userEmail === 'test@example.com') {
        alert("You must be logged in to upload media.");
        return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.style.display = 'none';

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        pendingUploadFile = file;
        pendingUploadCategory = category;

        // Reset the modal
        igCaptionInput.value = '';
        igLoading.style.display = 'none';
        igImgPreview.style.display = 'none';
        igVidPreview.style.display = 'none';

        // Set Author Info safely
        igPostUsername.textContent = document.getElementById('displayUsername')?.textContent || 'User';
        igPostAvatar.src = document.getElementById('profileImage')?.src || '';

        // Generate Preview URL
        const objectUrl = URL.createObjectURL(file);

        if (file.type.startsWith('image/')) {
            igImgPreview.src = objectUrl;
            igImgPreview.style.display = 'block';
        } else if (file.type.startsWith('video/')) {
            igVidPreview.src = objectUrl;
            igVidPreview.style.display = 'block';
        }

        // Show Modal
        igUploadModal.style.display = 'flex';
        // Allow rendering before animating opacity
        requestAnimationFrame(() => igUploadModal.classList.add('show'));
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
};

// Handle Cancel
igCancelBtn.addEventListener('click', () => {
    igUploadModal.classList.remove('show');
    setTimeout(() => igUploadModal.style.display = 'none', 300);
    pendingUploadFile = null;
});

// Handle Share
igShareBtn.addEventListener('click', () => {
    if (!pendingUploadFile) return;

    const userEmail = localStorage.getItem('karma_user_email');
    const caption = igCaptionInput.value.trim();

    const formData = new FormData();
    formData.append('email', userEmail);
    formData.append('category', pendingUploadCategory);
    formData.append('content', caption);
    formData.append('media_file', pendingUploadFile);

    // Show Loading state
    igLoading.style.display = 'flex';

    fetch('http://127.0.0.1:5000/api/posts', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            igLoading.style.display = 'none';

            if (data.ok) {
                // Success! Close modal and update coins
                igUploadModal.classList.remove('show');
                setTimeout(() => igUploadModal.style.display = 'none', 300);

                // Custom Toast
                const toastArgs = document.getElementById('displayUsername')?.textContent || 'Friend';
                showToastMessage('Post Shared!', `+10 Karma Coins for your contribution.`);

                if (data.new_coins !== undefined) {
                    const coinsEl = document.getElementById('stat-coins');
                    if (coinsEl) coinsEl.textContent = data.new_coins;
                }
            } else {
                alert("Upload failed: " + data.error);
            }
        })
        .catch(err => {
            igLoading.style.display = 'none';
            console.error("Upload error:", err);
            alert("Network error. Ensure karma_server.py is running!");
        });
});

// Helper for custom string toasts
function showToastMessage(title, subtitle) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-username').textContent = subtitle;
    toast.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.style.display = 'none', 400);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    /* ══════════════════════════════════════════════
       DESKTOP POST UPLOAD MODAL LOGIC
    ══════════════════════════════════════════════ */
    const createPostBtn = document.getElementById('createPostBtn');
    const uploadModal = document.getElementById('desktop-upload-modal');
    const uploadCloseBtn = document.getElementById('upload-modal-close-btn');
    const uploadBrowseBtn = document.getElementById('upload-browse-btn');
    const uploadFileInput = document.getElementById('upload-file-input');
    const uploadMediaArea = document.getElementById('upload-media-area');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadPreviewContainer = document.getElementById('upload-preview-container');
    const uploadPreviewWrapper = document.getElementById('upload-preview-wrapper');
    const uploadPublishBtn = document.getElementById('upload-publish-btn');
    const uploadCaption = document.getElementById('upload-caption');
    const uploadCharCount = document.getElementById('upload-char-count');
    const cropControls = document.getElementById('crop-controls');
    const uploadStatus = document.getElementById('upload-status');
    const uploadProgressFill = document.getElementById('upload-progress-fill');

    let uploadCropper = null;
    let selectedUploadFiles = [];
    let isVideoUpload = false;
    let isUploading = false;

    // Close Modal
    function closeUploadModal() {
        if (isUploading) return; // Prevent closing while uploading
        uploadModal.classList.remove('show');
        document.body.style.overflow = '';
        setTimeout(resetUploadModal, 300); // Wait for transition
    }

    if (uploadCloseBtn) uploadCloseBtn.addEventListener('click', closeUploadModal);

    // Close on background click
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeUploadModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uploadModal.classList.contains('show')) closeUploadModal();
    });

    // Caption Counter
    uploadCaption.addEventListener('input', () => {
        uploadCharCount.textContent = `${uploadCaption.value.length}/2200`;
    });

    // File Selection triggers
    uploadBrowseBtn.addEventListener('click', () => uploadFileInput.click());

    uploadFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleMediaSelection(e.target.files);
        }
    });

    // Open Modal via Event Delegation (button is dynamically rendered in DEEDS tab)
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.create-post-trigger');
        if (trigger) {
            const dName = document.getElementById('displayUsername').innerText;
            const previewImg = document.getElementById('profileImage').src;

            document.getElementById('upload-author-name').textContent = dName || 'user';
            const initialEl = document.getElementById('upload-author-initial');
            if (previewImg && previewImg !== window.location.href) {
                initialEl.outerHTML = `<img src="${previewImg}" class="modal-header-avatar" id="upload-author-initial">`;
            } else {
                initialEl.textContent = (dName || '?').charAt(0).toUpperCase();
            }

            resetUploadModal();

            // Store selected category from button
            const category = trigger.getAttribute('data-category') || 'deeds';
            uploadModal.setAttribute('data-current-category', category);

            uploadModal.classList.add('show');
            document.body.style.overflow = 'hidden';

            // Re-bind just in case
            const newInitialEl = document.getElementById('upload-author-initial');
            if (newInitialEl) newInitialEl.className = previewImg && previewImg !== window.location.href ? 'modal-header-avatar' : 'modal-header-ph';
        }
    });

    // Drag & Drop Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadMediaArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadMediaArea.addEventListener(eventName, () => uploadMediaArea.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadMediaArea.addEventListener(eventName, () => uploadMediaArea.classList.remove('drag-over'), false);
    });

    uploadMediaArea.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files && files.length > 0) handleMediaSelection(files);
    });

    // Handle Media Validation and Preview Rendering
    function handleMediaSelection(fileList) {
        let validFiles = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            if (!isImage && !isVideo) {
                alert(`Skipping ${file.name}: Unsupported format.`);
                continue;
            }

            const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`Skipping ${file.name}: File too large.`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        selectedUploadFiles = validFiles;
        uploadPlaceholder.style.display = 'none';
        uploadPreviewContainer.style.display = 'block';
        uploadPublishBtn.disabled = false;
        cropControls.style.display = 'none';
        uploadPreviewWrapper.innerHTML = '';

        if (uploadCropper) {
            uploadCropper.destroy();
            uploadCropper = null;
        }

        // Single File (Use Cropper for image, direct preview for video)
        if (validFiles.length === 1) {
            const file = validFiles[0];
            const url = URL.createObjectURL(file);
            const isVideo = file.type.startsWith('video/');

            if (isVideo) {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.style.maxWidth = '100%';
                video.style.maxHeight = '100%';
                uploadPreviewWrapper.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.src = url;
                img.id = 'upload-cropper-img';
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                img.style.display = 'block';
                uploadPreviewWrapper.appendChild(img);

                cropControls.style.display = 'flex';

                setTimeout(() => {
                    uploadCropper = new Cropper(img, {
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 1,
                        restore: false,
                        guides: true,
                        center: true,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false,
                    });
                }, 50);
            }
        } else {
            // Multiple Files (Grid Preview, Bypass Cropper)
            uploadPreviewWrapper.style.display = 'grid';
            uploadPreviewWrapper.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
            uploadPreviewWrapper.style.gridAutoRows = '150px';
            uploadPreviewWrapper.style.gap = '8px';
            uploadPreviewWrapper.style.padding = '16px';
            uploadPreviewWrapper.style.overflowY = 'auto';
            uploadPreviewWrapper.style.alignItems = 'start';
            uploadPreviewWrapper.style.alignContent = 'start';

            validFiles.forEach(file => {
                const url = URL.createObjectURL(file);
                const isVideo = file.type.startsWith('video/');
                const div = document.createElement('div');
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.position = 'relative';
                div.style.backgroundColor = '#262626';

                if (isVideo) {
                    div.innerHTML = `<video src="${url}" style="width:100%; height:100%; object-fit:cover;" muted></video><span style="position:absolute; top:4px; right:4px; font-size:12px; background:rgba(0,0,0,0.6); padding:2px 4px; border-radius:4px;">Video</span>`;
                } else {
                    div.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
                }
                uploadPreviewWrapper.appendChild(div);
            });
        }
    }

    // Cropper Aspect Ratio Controls
    document.getElementById('btn-aspect-1-1').addEventListener('click', () => uploadCropper && uploadCropper.setAspectRatio(1));
    document.getElementById('btn-aspect-4-5').addEventListener('click', () => uploadCropper && uploadCropper.setAspectRatio(4 / 5));
    document.getElementById('btn-aspect-16-9').addEventListener('click', () => uploadCropper && uploadCropper.setAspectRatio(16 / 9));

    // Reset Modal State
    function resetUploadModal() {
        selectedUploadFiles = [];
        if (uploadCropper) {
            uploadCropper.destroy();
            uploadCropper = null;
        }
        uploadFileInput.value = '';
        uploadCaption.value = '';
        uploadCharCount.textContent = '0/2200';
        uploadPreviewWrapper.innerHTML = '';
        uploadPreviewWrapper.style.display = 'flex'; // Reset to flex
        uploadPreviewWrapper.style.padding = '0';
        uploadPreviewContainer.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
        uploadPublishBtn.disabled = true;
        cropControls.style.display = 'none';
        uploadStatus.style.display = 'none';
        uploadProgressFill.style.width = '0%';
        isUploading = false;
    }

    // Publish Post
    uploadPublishBtn.addEventListener('click', () => {
        let userEmail = localStorage.getItem('karma_user_email');
        if (selectedUploadFiles.length === 0 || !userEmail) return;

        isUploading = true;
        uploadPublishBtn.disabled = true;
        uploadStatus.style.display = 'block';
        uploadProgressFill.style.width = '30%';
        document.getElementById('upload-status-text').textContent = 'Preparing media...';

        const formData = new FormData();
        formData.append('email', userEmail);

        const category = uploadModal.getAttribute('data-current-category') || 'deeds';
        formData.append('category', category); // Dynamic category based on tab

        formData.append('content', uploadCaption.value.trim());

        // Helper to perform the actual API fetch with progress tracking
        const performUpload = () => {
            document.getElementById('upload-status-text').textContent = 'Uploading to server...';
            // Start at 10%
            uploadProgressFill.style.width = '10%';

            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://127.0.0.1:5000/api/posts', true);

            // Track upload progress
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    // Map 0-100 to 10-90% of the progress bar visually
                    const visualPercent = 10 + (percentComplete * 0.8);
                    uploadProgressFill.style.width = `${visualPercent}%`;
                    document.getElementById('upload-status-text').textContent = `Uploading... ${Math.round(percentComplete)}%`;
                }
            };

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    let data;
                    try { data = JSON.parse(xhr.responseText); } catch (e) { data = { ok: false, error: 'Invalid server response' }; }

                    if (data.ok) {
                        uploadProgressFill.style.width = '100%';
                        document.getElementById('upload-status-text').textContent = 'Success! Post created.';
                        setTimeout(() => {
                            closeUploadModal();
                            // Refresh the feed immediately by clicking the active tab
                            const activeTab = document.querySelector('.profile-tabs .tab.active');
                            if (activeTab) activeTab.click();

                            if (typeof showToastMessage === 'function') {
                                showToastMessage('Published', 'Your post is now live!');
                            } else {
                                if (typeof showToast === 'function') showToast('Post Published');
                            }
                        }, 800);
                    } else {
                        handleError(data.error || 'Server error');
                    }
                } else {
                    handleError(`HTTP Error ${xhr.status}`);
                }
            };

            xhr.onerror = function () {
                handleError('Network error. Is the server running?');
            };

            function handleError(msg) {
                isUploading = false;
                uploadPublishBtn.disabled = false;
                uploadProgressFill.style.background = 'var(--accent-red)';
                document.getElementById('upload-status-text').textContent = 'Upload failed: ' + msg;
                document.getElementById('upload-status-text').style.color = 'var(--accent-red)';
            }

            xhr.send(formData);
        };

        if (uploadCropper) {
            // Single image with crop
            uploadCropper.getCroppedCanvas().toBlob((blob) => {
                formData.append('media_file', blob, 'upload.jpg');
                performUpload();
            }, 'image/jpeg', 0.9);
        } else {
            // Multiple files or single video
            selectedUploadFiles.forEach((file, index) => {
                formData.append('media_files', file, file.name);
            });
            performUpload();
        }
    });
});

/* ══════════════════════════════════════════════
   USER FEED LOGIC (FOR DEEDS TAB)
══════════════════════════════════════════════ */
let userProfilePosts = [];
let profileCarouselIntervals = [];

window.fetchUserPosts = function () {
    const feedContainer = document.getElementById('profile-deeds-feed');
    if (!feedContainer) return;

    let viewerEmail = localStorage.getItem('karma_user_email');
    if (!viewerEmail) return;

    feedContainer.innerHTML = `
                        < div class="feed-loading" style = "text-align:center; padding:40px 0;" >
            <div class="spinner"></div><p style="margin-top:10px; color:#a8a8a8;">Loading your deeds...</p>
        </div > `;

    const url = `http://127.0.0.1:5000/api/feed?viewer=${encodeURIComponent(viewerEmail)}&user=${encodeURIComponent(viewerEmail)}`;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                userProfilePosts = data.posts;
                renderUserPosts();
            } else {
                feedContainer.innerHTML = `<p style="text-align:center;padding:40px;color:#ff4d4d">Error: ${data.error}</p>`;
            }
        })
        .catch(() => {
            feedContainer.innerHTML = `<p style="text-align:center;padding:40px;color:#555">Server offline.</p>`;
        });
};

function renderUserPosts() {
    const feedContainer = document.getElementById('profile-deeds-feed');
    const emptyHeader = document.getElementById('deeds-empty-header');
    const fabButton = document.getElementById('deeds-fab-upload');
    const emptyButton = document.getElementById('deeds-empty-upload-btn');

    if (!feedContainer) return;

    feedContainer.innerHTML = '';

    profileCarouselIntervals.forEach(clearInterval);
    profileCarouselIntervals = [];

    // Convert feed container to grid if it has posts
    if (userProfilePosts.length > 0) {
        feedContainer.style.display = 'grid';
        feedContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        feedContainer.style.gap = '16px';
        if (emptyHeader) emptyHeader.style.display = 'none';
        if (emptyButton) emptyButton.style.display = 'none';
        if (fabButton) fabButton.style.display = 'flex';
    } else {
        feedContainer.style.display = 'block';
        if (emptyHeader) emptyHeader.style.display = 'block';
        if (emptyButton) emptyButton.style.display = 'inline-block';
        if (fabButton) fabButton.style.display = 'none';
        return; // Empty state header & upload btn naturally show
    }

    userProfilePosts.forEach(post => {
        const item = document.createElement('div');
        item.style.position = 'relative';
        item.style.aspectRatio = '1 / 1';
        item.style.minHeight = '0';
        item.style.minWidth = '0';
        item.style.backgroundColor = '#262626';
        item.style.overflow = 'hidden';
        item.style.cursor = 'pointer';
        item.style.animation = 'slideUp 0.3s ease forwards';

        // Render media or text fallback
        if (post.media_url) {
            const urls = post.media_url.split(',');

            if (urls.length > 1) {
                // Render Carousel
                item.innerHTML = `
                    <div class="deeds-media-carousel" style="width:100%; height:100%; display:flex; overflow-x:hidden; pointer-events:none;">
                        ${urls.map(url => {
                    const mapExt = url.split('.').pop().toLowerCase();
                    if (['mp4', 'webm', 'ogg'].includes(mapExt)) {
                        return `<video src="http://127.0.0.1:5000${url}" style="position:absolute; top:0; left:0; flex:0 0 100%; width:100%; height:100%; object-fit:cover; scroll-snap-align:start;" muted loop playsinline></video>`;
                    } else {
                        return `<img src="http://127.0.0.1:5000${url}" style="position:absolute; top:0; left:0; flex:0 0 100%; width:100%; height:100%; object-fit:cover; scroll-snap-align:start;" alt="Post">`;
                    }
                }).join('')}
                    </div>
                    <div style="position:absolute; top:8px; right:8px; z-index:10; pointer-events:none; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2" fill="none" stroke="#fff"/><rect x="7" y="3" width="14" height="18" fill="#fff" opacity="0.5"/><rect x="11" y="3" width="10" height="18" fill="#fff"/></svg>
                    </div>
                `;
            } else {
                // Render Single Media
                const url = urls[0];
                const ext = url.split('.').pop().toLowerCase();
                if (['mp4', 'webm', 'ogg'].includes(ext)) {
                    item.innerHTML = `
                        <video src="http://127.0.0.1:5000${url}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;" autoplay muted loop playsinline></video>
                        <div style="position:absolute; top:8px; right:8px;">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    `;
                } else {
                    item.innerHTML = `<img src="http://127.0.0.1:5000${url}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;" alt="Post">`;
                }
            }
        } else if (post.content) {
            item.innerHTML = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:16px; text-align:center; font-size:12px; color:#fff; word-break:break-word;">
                    ${post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
                </div>
            `;
        }

        // Add hover overlay (Likes + Comments)
        const likeCount = post.like_count || 0;
        const commentCount = post.comment_count || 0;

        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.gap = '20px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        overlay.style.color = '#fff';
        overlay.style.fontWeight = 'bold';

        overlay.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>${likeCount}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>${commentCount}</span>
            </div>
        `;

        item.appendChild(overlay);

        item.addEventListener('mouseenter', () => overlay.style.opacity = '1');
        item.addEventListener('mouseleave', () => overlay.style.opacity = '0');

        // Clicking a grid item (can route to comment modal if available)
        item.addEventListener('click', () => {
            if (typeof openDesktopModal === 'function') {
                openDesktopModal(post.post_id);
            } else if (typeof openCommentFeature === 'function') {
                openCommentFeature(post.post_id);
            }
        });

        feedContainer.appendChild(item);
    });

    // Initialize Auto-Slide for Grid Carousels
    document.querySelectorAll('.deeds-media-carousel').forEach(carousel => {
        const numItems = carousel.children.length;
        if (numItems > 1) {
            let currentIndex = 0;
            const intervalId = setInterval(() => {
                currentIndex = (currentIndex + 1) % numItems;
                carousel.scrollTo({ left: currentIndex * carousel.clientWidth, behavior: 'smooth' });
            }, 2500); // 2.5 seconds per slide for quick profile preview
            profileCarouselIntervals.push(intervalId);
        }
    });
}

/* ══════════════════════════════════════════════
   USER FEED LOGIC (FOR AWAAZ TAB)
══════════════════════════════════════════════ */
let userAwaazPosts = [];

window.fetchAwaazPosts = function () {
    const feedContainer = document.getElementById('profile-awaaz-feed');
    if (!feedContainer) return;

    let viewerEmail = localStorage.getItem('karma_user_email');
    if (!viewerEmail) return;

    feedContainer.style.display = 'block';
    feedContainer.innerHTML = `
        <div class="feed-loading" style="text-align:center; padding:40px 0;">
            <div class="spinner"></div><p style="margin-top:10px; color:#a8a8a8;">Loading Awaaz TV posts...</p>
        </div>`;

    const url = `http://127.0.0.1:5000/api/feed?viewer=${encodeURIComponent(viewerEmail)}&user=${encodeURIComponent(viewerEmail)}`;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                // Filter for awaaz posts ONLY
                userAwaazPosts = data.posts.filter(p => p.category === 'awaaz');
                // Update combined array
                allProfilePosts = [...userProfilePosts, ...userAwaazPosts];
                renderAwaazPosts();
            } else {
                feedContainer.innerHTML = `<p style="text-align:center;padding:40px;color:#ff4d4d">Error: ${data.error}</p>`;
            }
        })
        .catch(() => {
            feedContainer.innerHTML = `<p style="text-align:center;padding:40px;color:#555">Server offline.</p>`;
        });
};

function renderAwaazPosts() {
    const feedContainer = document.getElementById('profile-awaaz-feed');
    const emptyHeader = document.getElementById('awaaz-empty-header');
    const fabButton = document.getElementById('awaaz-fab-upload');
    const emptyButton = document.getElementById('awaaz-empty-upload-btn');

    if (!feedContainer) return;

    feedContainer.innerHTML = '';

    // Convert feed container to grid if it has posts
    if (userAwaazPosts.length > 0) {
        feedContainer.style.display = 'grid';
        feedContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        feedContainer.style.gap = '16px';
        if (emptyHeader) emptyHeader.style.display = 'none';
        if (emptyButton) emptyButton.style.display = 'none';
        if (fabButton) fabButton.style.display = 'flex';
    } else {
        feedContainer.style.display = 'block';
        if (emptyHeader) emptyHeader.style.display = 'block';
        if (emptyButton) emptyButton.style.display = 'inline-block';
        if (fabButton) fabButton.style.display = 'none';
        return;
    }

    userAwaazPosts.forEach(post => {
        const item = document.createElement('div');
        item.style.position = 'relative';
        item.style.aspectRatio = '9 / 16';
        item.style.minHeight = '0';
        item.style.minWidth = '0';
        item.style.backgroundColor = '#262626';
        item.style.overflow = 'hidden';
        item.style.cursor = 'pointer';
        item.style.animation = 'slideUp 0.3s ease forwards';

        // Render media or text fallback (similar logic to deeds, but simplified for Awaaz/Video primary)
        if (post.media_url) {
            const urls = post.media_url.split(',');
            if (urls.length > 1) {
                item.innerHTML = `
                    <div class="deeds-media-carousel" style="width:100%; height:100%; display:flex; overflow-x:hidden; pointer-events:none;">
                        ${urls.map(url => {
                    const mapExt = url.split('.').pop().toLowerCase();
                    if (['mp4', 'webm', 'ogg'].includes(mapExt)) {
                        return '<video src="http://127.0.0.1:5000' + url + '" style="position:absolute; top:0; left:0; flex:0 0 100%; width:100%; height:100%; object-fit:cover; scroll-snap-align:start; background:#000;" muted loop playsinline></video>';
                    } else {
                        return '<img src="http://127.0.0.1:5000' + url + '" style="position:absolute; top:0; left:0; flex:0 0 100%; width:100%; height:100%; object-fit:cover; scroll-snap-align:start; background:#000;" alt="Post">';
                    }
                }).join('')}
                    </div>
                    <div style="position:absolute; top:8px; right:8px; z-index:10; pointer-events:none; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2" fill="none" stroke="#fff"/><rect x="7" y="3" width="14" height="18" fill="#fff" opacity="0.5"/><rect x="11" y="3" width="10" height="18" fill="#fff"/></svg>
                    </div>
                `;
            } else {
                const url = urls[0];
                const ext = url.split('.').pop().toLowerCase();
                if (['mp4', 'webm', 'ogg'].includes(ext)) {
                    item.innerHTML = `
                        <video src="http://127.0.0.1:5000${url}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; background:#000;" autoplay muted loop playsinline></video>
                        <div style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.5); border-radius:50%; padding:4px;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    `;
                } else {
                    item.innerHTML = `<img src="http://127.0.0.1:5000${url}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; background:#000;" alt="Post">`;
                }
            }
        } else if (post.content) {
            item.innerHTML = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:16px; text-align:center; font-size:12px; color:#fff; word-break:break-word;">
                    ${post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
                </div>
            `;
        } // End if(post.media_url)

        // Add hover overlay (Likes + Comments)
        const likeCount = post.like_count || 0;
        const commentCount = post.comment_count || 0;

        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.gap = '20px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        overlay.style.color = '#fff';
        overlay.style.fontWeight = 'bold';

        overlay.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>${likeCount}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>${commentCount}</span>
            </div>
        `;

        item.appendChild(overlay);

        item.addEventListener('mouseenter', () => overlay.style.opacity = '1');
        item.addEventListener('mouseleave', () => overlay.style.opacity = '0');

        // Clicking a grid item routes to comment modal
        item.addEventListener('click', () => {
            if (typeof openDesktopModal === 'function') {
                openDesktopModal(post.post_id);
            } else if (typeof openCommentFeature === 'function') {
                openCommentFeature(post.post_id);
            }
        });

        feedContainer.appendChild(item);
    }); // End forEach
}