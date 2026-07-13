document.addEventListener('DOMContentLoaded', () => {

    const postsContainer = document.getElementById('posts-container');
    const followersStrip = document.getElementById('followers-strip');
    const followersWrapper = document.getElementById('followers-strip-wrapper');

    const currentUser = localStorage.getItem('karma_user_email') || '';
    let allPosts = [];
    let carouselIntervals = [];

    window.fetchFeed = fetchFeed;

    // ── 0. Init Sidebar Avatar ───────────────────────────────────────
    const navAvatarPlaceholder = document.getElementById('navAvatarPlaceholder');
    const navAvatar = document.getElementById('navAvatar');
    const storedAvatar = localStorage.getItem('karma_user_avatar');
    if (navAvatar && navAvatarPlaceholder && storedAvatar) {
        navAvatarPlaceholder.style.display = 'none';
        navAvatar.src = '' + storedAvatar;
        navAvatar.style.display = 'block';
    }

    // ── 1. Load Real Followers Strip ─────────────────────────────────
    window.loadRealFollowers = function () {
        if (currentUser && followersStrip) {
            fetch(`/api/followers?email=${encodeURIComponent(currentUser)}`)
                .then(r => r.json())
                .then(data => {
                    if (data.ok && data.followers.length > 0) {
                        followersWrapper.style.display = 'block';
                        followersStrip.innerHTML = data.followers.map(u => {
                            const initials = (u.username || '?').charAt(0).toUpperCase();
                            const statusNote = u.bio || u.locality || 'Karma member';
                            const avatarHtml = u.avatar
                                ? `<img src="${u.avatar}" alt="${u.username}" class="follower-avatar-img">`
                                : `<div class="follower-avatar-ph">${initials}</div>`;
                            return `<div class="follower-item">
                                <div class="follower-status-note">${statusNote}</div>
                                <div class="follower-avatar-wrap">${avatarHtml}</div>
                                <span class="follower-name">${u.username}</span>
                            </div>`;
                        }).join('');
                    } else {
                        followersWrapper.style.display = 'none';
                    }
                })
                .catch(() => { if (followersWrapper) followersWrapper.style.display = 'none'; });
        } else {
            if (followersWrapper) followersWrapper.style.display = 'none';
        }
    };
    loadRealFollowers();

    // ── 2. Fetch Posts from DB (with real counts) ────────────────────
    fetchFeed();

    function fetchFeed() {
        if (!postsContainer) return;
        postsContainer.innerHTML = `
            <div class="feed-loading">
                <div class="spinner"></div>
                <p>Loading the Karmic balance...</p>
            </div>`;

        const url = `/api/feed?viewer=${encodeURIComponent(currentUser)}`;
        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.ok) { allPosts = data.posts; renderPosts(); }
                else postsContainer.innerHTML = `<p style="text-align:center;padding:40px;color:#ff4d4d">Error: ${data.error}</p>`;
            })
            .catch(() => {
                postsContainer.innerHTML = `<p style="text-align:center;padding:40px;color:#555">Server offline. Restart karma_server.py!</p>`;
            });
    }

    // ── 3. Render Posts ──────────────────────────────────────────────
    function renderPosts() {
        postsContainer.innerHTML = '';
        carouselIntervals.forEach(clearInterval);
        carouselIntervals = [];

        if (allPosts.length === 0) {
            postsContainer.innerHTML = `<div style="text-align:center;color:#444;padding:60px 0"><p style="font-size:36px">🍃</p><p style="margin-top:12px;font-size:14px">No posts yet. Be the first to share your Karm!</p></div>`;
            return;
        }

        allPosts.forEach(post => {
            let avatarHtml = `<div class="post-avatar-placeholder">${(post.author_username || '?').charAt(0).toUpperCase()}</div>`;
            if (post.author_avatar) avatarHtml = `<img src="${post.author_avatar}" class="post-avatar" alt="">`;

            let mediaHtml = '';
            if (post.media_url) {
                const urls = post.media_url.split(',');
                if (urls.length > 1) {
                    // Render Carousel
                    mediaHtml = `
                        <div class="post-media-carousel" style="display:flex; overflow-x:scroll; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none;" ondblclick="triggerDoubleTapLike(this, ${post.post_id})">
                            ${urls.map(url => {
                        const ext = url.split('.').pop().toLowerCase();
                        if (['mp4', 'webm', 'ogg'].includes(ext)) {
                            return `<video src="${url}" style="flex:0 0 100%; width:100%; object-fit:contain; scroll-snap-align:start;" autoplay muted loop playsinline></video>`;
                        } else {
                            return `<img src="${url}" style="flex:0 0 100%; width:100%; object-fit:contain; scroll-snap-align:start;" alt="Post">`;
                        }
                    }).join('')}
                        </div>
                        <div style="position:absolute; top:12px; right:12px; z-index:10; pointer-events:none; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); padding:6px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" stroke="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2" fill="none" stroke="#fff"/>
                                <rect x="7" y="3" width="14" height="18" fill="#fff" opacity="0.5"/>
                                <rect x="11" y="3" width="10" height="18" fill="#fff"/>
                            </svg>
                        </div>
                        <div class="carousel-dots" style="position:absolute; bottom:12px; left:0; right:0; display:flex; justify-content:center; gap:6px; z-index:10; pointer-events:none;">
                            ${urls.map((_, i) => `<div class="dot" style="width:6px; height:6px; border-radius:50%; background:${i === 0 ? '#fff' : 'rgba(255,255,255,0.5)'}; transition:background 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.5);"></div>`).join('')}
                        </div>
                    `;
                } else {
                    // Single media
                    const url = urls[0];
                    const ext = url.split('.').pop().toLowerCase();
                    if (['mp4', 'webm', 'ogg'].includes(ext)) {
                        mediaHtml = `<div class="post-media" ondblclick="triggerDoubleTapLike(this, ${post.post_id})"><video src="${url}" autoplay muted loop playsinline></video></div>`;
                    } else {
                        mediaHtml = `<div class="post-media" ondblclick="triggerDoubleTapLike(this, ${post.post_id})"><img src="${url}" alt="Post"></div>`;
                    }
                }
            } else if (post.content) {
                mediaHtml = `<div class="post-text-body" ondblclick="triggerDoubleTapLike(this, ${post.post_id})">${post.content}</div>`;
            }

            const d = new Date(post.created_at + 'Z');
            const diffMins = Math.round((Date.now() - d) / 60000);
            const relativeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.round(diffMins / 60)}h ago` : `${Math.round(diffMins / 1440)}d ago`;
            const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const fullTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const timeStr = `${fullDate} · ${fullTime} · ${relativeStr}`;

            // Use REAL counts from DB
            const likeCount = post.like_count || 0;
            const commentCount = post.comment_count || 0;
            const viewerLiked = post.viewer_liked || false;
            const isSelf = currentUser === post.author_email;

            const card = document.createElement('div');
            card.className = 'post-card';
            card.dataset.postId = post.post_id;



            card.innerHTML = `
                <div class="ig-post-header">
                    <div class="ig-header-left">
                        ${avatarHtml}
                        <div class="post-meta-info">
                            <span class="ig-post-author">${post.author_username || 'anonymous'}</span>
                            <span class="ig-post-location">${post.author_locality || ''}${post.author_locality ? ' • ' : ''}${post.category === 'awaaz' ? 'Awaaz TV' : 'Deed'}</span>
                        </div>
                    </div>
                    <div class="ig-header-right-group">
                        ${!isSelf ? `<button class="btn-follow${viewerLiked ? '' : ''}" data-target="${post.author_email}" onclick="toggleFollow(this); event.stopPropagation();">Follow</button>` : ''}
                    </div>
                </div>

                ${mediaHtml}

                <div class="ig-post-footer">
                    <div class="ig-action-bar">
                        <div class="ig-actions-left">
                            <button class="action-btn inspire${viewerLiked ? ' liked' : ''}" onclick="handleAction(this,'inspire'); event.stopPropagation();" title="Inspire">
                                <svg viewBox="0 0 24 24" fill="${viewerLiked ? 'var(--accent-red)' : 'none'}" stroke="${viewerLiked ? 'var(--accent-red)' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            </button>
                            <button class="action-btn comment" onclick="openCommentFeature(${post.post_id}); event.stopPropagation();" title="Comment">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </button>
                            <button class="action-btn share" onclick="handleAction(this,'share'); event.stopPropagation();" title="Share">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        </div>
                        <div class="ig-actions-right">
                            <button class="action-btn bookmark" onclick="handleAction(this,'bookmark')" title="Save">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="ig-likes-count"><span class="like-number">${likeCount.toLocaleString()}</span> ${likeCount === 1 ? 'like' : 'likes'}</div>
                    ${post.content && post.media_url ? `<div class="ig-caption"><span class="ig-caption-author">${post.author_username}</span> ${post.content}</div>` : ''}
                    ${commentCount > 0 ? `<div class="ig-view-comments" onclick="openCommentFeature(${post.post_id}); event.stopPropagation();">View all ${commentCount} comments</div>` : ''}
                    <div class="ig-post-time">${timeStr}</div>
                </div>
            `;

            postsContainer.appendChild(card);
        });

        // Initialize Carousel Logic for home feed
        document.querySelectorAll('.post-card').forEach(card => {
            const carousel = card.querySelector('.post-media-carousel');
            if (carousel) {
                const dots = card.querySelectorAll('.carousel-dots .dot');
                const numItems = dots.length;
                let currentIndex = 0;

                // Manual Scroll Logic (Optimized)
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

                // Auto Scroll Logic
                const intervalId = setInterval(() => {
                    currentIndex = (currentIndex + 1) % numItems;
                    carousel.scrollTo({ left: currentIndex * carousel.clientWidth, behavior: 'smooth' });
                }, 3000); // 3 seconds per slide
                carouselIntervals.push(intervalId);
            }
        });

        // Handle URL direct linking to modal
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('post')) {
            setTimeout(() => {
                if (typeof openDesktopModal === 'function') openDesktopModal(urlParams.get('post'));
            }, 500);
        }
    }

    // ── 4. Real Like Toggle ──────────────────────────────────────────
    window.handleAction = function (btn, type) {

        if (type === 'inspire') {
            if (!currentUser) { showToast('Login required', 'Sign in to like posts'); return; }
            btn.disabled = true;
            const postId = btn.closest('.post-card').dataset.postId;
            const likeEl = btn.closest('.ig-post-footer').querySelector('.like-number');

            fetch('/api/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, email: currentUser })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.ok) {
                        const liked = data.liked;
                        btn.classList.toggle('liked', liked);
                        const svg = btn.querySelector('svg');
                        svg.setAttribute('fill', liked ? 'var(--accent-red)' : 'none');
                        svg.setAttribute('stroke', liked ? 'var(--accent-red)' : 'currentColor');
                        if (likeEl) {
                            likeEl.textContent = data.like_count.toLocaleString();
                            // Update suffix
                            likeEl.nextSibling.textContent = ` ${data.like_count === 1 ? 'like' : 'likes'}`;
                        }
                    }
                    btn.disabled = false;
                })
                .catch(() => { btn.disabled = false; });
            return;
        }

        if (type === 'bookmark') {
            btn.classList.toggle('saved');
            const svg = btn.querySelector('svg');
            const isSaved = btn.classList.contains('saved');
            svg.setAttribute('fill', isSaved ? 'currentColor' : 'none');
            return;
        }

        if (type === 'share') {
            const postIdStr = btn.closest('.post-card').dataset.postId;
            const url = window.location.origin + window.location.pathname + '?post=' + postIdStr;
            if (navigator.share) {
                navigator.share({
                    title: 'Karma Post',
                    url: url
                }).catch(console.error);
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    showToast('Shared ✓', 'Link copied to clipboard');
                }).catch(() => {
                    showToast('Error', 'Could not copy link');
                });
            }
            return;
        }

        // Comment — open modal instead of inline expand
        if (type === 'comment') {
            const postId = btn.closest('.post-card').dataset.postId;
            openDesktopModal(postId);
        }
    };


    // ── IG Routing & Modals ──────────────────────────────────────────
    window.openCommentFeature = function (postId) {
        const post = allPosts.find(p => p.post_id === postId);
        if (!post) return;

        let isVideo = false;
        if (post.media_url) {
            const ext = post.media_url.split('.').pop().toLowerCase();
            if (['mp4', 'webm', 'ogg'].includes(ext)) isVideo = true;
        }

        // If it's a video and we're on a wide screen, slide in the panel
        if (isVideo && window.innerWidth > 800) {
            openInlineCommentPanel(postId);
        } else {
            openDesktopModal(postId);
        }
    };

    const desktopModal = document.getElementById('desktop-post-modal');
    const modalCloseBtn = document.getElementById('post-modal-close-btn');

    // Inline comment panel els
    const inlinePanel = document.getElementById('inline-comment-panel');
    const inlineCloseBtn = document.getElementById('inline-comment-close-btn');
    const feedColumns = document.querySelectorAll('.feed-column');

    window.openInlineCommentPanel = function (postId) {
        if (!inlinePanel) return;
        const post = allPosts.find(p => p.post_id === postId);
        if (!post) return;

        // Shift feed left
        feedColumns.forEach(c => c.classList.add('shifted-left'));

        // Render comments
        const listEl = document.getElementById('inline-comment-list');
        listEl.innerHTML = '';
        if (post.content && post.media_url) {
            listEl.innerHTML += `
                <div class="modal-caption" style="margin-bottom:16px;">
                    <div class="modal-header-ph" style="width:32px;height:32px;min-width:32px;">${(post.author_username || '?').charAt(0).toUpperCase()}</div>
                    <div style="flex:1;">
                        <span class="ig-caption-author">${post.author_username}</span> 
                        <span class="modal-comment-text">${post.content}</span>
                    </div>
                </div>
            `;
        }
        loadModalComments(post.post_id, listEl);

        // Setup Sticky Input
        const postBtn = document.getElementById('inline-post-comment-btn');
        const inputEl = document.getElementById('inline-comment-input');
        inputEl.value = '';
        inputEl.focus();

        postBtn.onclick = () => {
            if (!currentUser) { showToast('Login required', 'Please sign in to comment'); return; }
            if (!inputEl.value.trim()) return;
            postBtn.disabled = true;
            fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: post.post_id, author_email: currentUser, content: inputEl.value.trim() })
            }).then(r => r.json()).then(d => {
                postBtn.disabled = false;
                if (d.ok) {
                    inputEl.value = '';
                    loadModalComments(post.post_id, listEl);
                    post.comment_count = (post.comment_count || 0) + 1;
                    const card = document.querySelector(`.post-card[data-post-id="${post.post_id}"]`);
                    if (card) {
                        const v = card.querySelector('.ig-view-comments');
                        if (v) v.textContent = `View all ${post.comment_count} comments`;
                    }
                }
            }).catch(() => postBtn.disabled = false);
        };
        inputEl.onkeydown = (e) => { if (e.key === 'Enter') postBtn.click(); };

        inlinePanel.classList.add('open');
    };

    window.closeInlineCommentPanel = function () {
        if (inlinePanel) inlinePanel.classList.remove('open');
        feedColumns.forEach(c => c.classList.remove('shifted-left'));
    };

    if (inlineCloseBtn) inlineCloseBtn.addEventListener('click', closeInlineCommentPanel);

    window.openDesktopModal = function (postIdStr) {
        const postId = parseInt(postIdStr, 10);
        const post = allPosts.find(p => p.post_id === postId);
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
                        return `<video src="${url}" style="flex:0 0 100%; width:100%; height:100%; object-fit:contain; scroll-snap-align:start;" autoplay muted loop playsinline controls></video>`;
                    } else {
                        return `<img src="${url}" style="flex:0 0 100%; width:100%; height:100%; object-fit:contain; scroll-snap-align:start;" alt="Post">`;
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
                    mediaContainer.innerHTML = `<video src="${url}" autoplay controls loop playsinline style="width:100%; height:100%; object-fit:contain;" ondblclick="triggerDoubleTapLike(this, ${post.post_id}, true)"></video>`;
                } else {
                    mediaContainer.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:contain;" ondblclick="triggerDoubleTapLike(this, ${post.post_id}, true)">`;
                }
            }
        } else if (post.content) {
            mediaContainer.innerHTML = `<div style="padding:40px; text-align:center; font-size:24px;" ondblclick="triggerDoubleTapLike(this, ${post.post_id}, true)">${post.content}</div>`;
        }

        // Render Header Right
        const headerContainer = document.getElementById('post-modal-header');
        let avatarHtml = `<div class="modal-header-ph">${(post.author_username || '?').charAt(0).toUpperCase()}</div>`;
        if (post.author_avatar) avatarHtml = `<img src="${post.author_avatar}" class="modal-header-avatar">`;

        headerContainer.innerHTML = `
            ${avatarHtml}
            <div class="modal-header-info">
                <span class="modal-header-username">${post.author_username || 'anonymous'}</span>
                <span class="modal-header-location">${post.author_locality || ''}</span>
            </div>
            ${post.author_email !== currentUser ? `<button class="btn-follow ig-caption-author" data-target="${post.author_email}" onclick="toggleFollow(this)" style="background:transparent; padding:0; height:auto; color:var(--accent-blue);">Follow</button>` : ''}
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
            if (!currentUser) { showToast('Login required', 'Please sign in to comment'); return; }
            if (!commentInput.value.trim()) return;
            postCommentBtn.disabled = true;
            fetch('/api/comments', {
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
                    const card = document.querySelector(`.post-card[data-post-id="${post.post_id}"]`);
                    if (card) {
                        const v = card.querySelector('.ig-view-comments');
                        if (v) v.textContent = `View all ${post.comment_count} comments`;
                    }
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

    // Close on ESC, or back button
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (desktopModal && desktopModal.classList.contains('show')) closeDesktopModal();
            if (inlinePanel && inlinePanel.classList.contains('open')) closeInlineCommentPanel();
        }
    });

    // Handle History Pop for Back Button
    window.addEventListener('popstate', (e) => {
        if (desktopModal && desktopModal.classList.contains('show')) {
            // Close modal when user presses back button
            closeDesktopModal();
        } else {
            // If going forward and URL has post id
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('post')) {
                openDesktopModal(urlParams.get('post'));
            }
        }
    });

    // ── Double Tap Like logic ───────────────────────────────────────
    window.triggerDoubleTapLike = function (mediaEl, postId, isModal = false) {
        if (!currentUser) { showToast('Login required', 'Sign in to like'); return; }

        const wrap = mediaEl.parentElement;
        if (wrap.querySelector('.double-tap-heart')) return;

        wrap.style.position = 'relative';
        const heart = document.createElement('div');
        heart.className = 'double-tap-heart heart-animate';
        heart.innerHTML = `<svg viewBox="0 0 24 24" width="80" height="80" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

        const ripple = document.createElement('div');
        ripple.className = 'heart-ripple ripple-animate';

        wrap.appendChild(ripple);
        wrap.appendChild(heart);

        setTimeout(() => {
            heart.remove();
            ripple.remove();
        }, 850);

        const post = allPosts.find(p => p.post_id === postId);
        if (post && !post.viewer_liked) {
            post.viewer_liked = true;
            post.like_count = (post.like_count || 0) + 1;

            const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
            if (card) {
                const btn = card.querySelector('.inspire');
                btn.classList.add('liked');
                btn.querySelector('svg').setAttribute('fill', 'var(--accent-red)');
                btn.querySelector('svg').setAttribute('stroke', 'var(--accent-red)');
                card.querySelector('.like-number').textContent = post.like_count.toLocaleString();
            }

            if (isModal) {
                const mBtn = document.getElementById('modal-like-btn');
                mBtn.classList.add('liked');
                mBtn.querySelector('svg').setAttribute('fill', 'var(--accent-red)');
                mBtn.querySelector('svg').setAttribute('stroke', 'var(--accent-red)');
                document.getElementById('modal-like-count').textContent = `${post.like_count.toLocaleString()} ${post.like_count === 1 ? 'like' : 'likes'}`;
            }

            fetch('/api/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, email: currentUser })
            }).catch(console.error);
        }
    };

    function handleModalLike(btn, postId) {
        if (!currentUser) return;
        btn.disabled = true;
        fetch('/api/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, email: currentUser })
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok) {
                    btn.classList.toggle('liked', data.liked);
                    const svg = btn.querySelector('svg');
                    svg.setAttribute('fill', data.liked ? 'var(--accent-red)' : 'none');
                    svg.setAttribute('stroke', data.liked ? 'var(--accent-red)' : 'currentColor');
                    document.getElementById('modal-like-count').textContent = `${data.like_count.toLocaleString()} ${data.like_count === 1 ? 'like' : 'likes'}`;

                    const post = allPosts.find(p => p.post_id === postId);
                    if (post) { post.viewer_liked = data.liked; post.like_count = data.like_count; }

                    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
                    if (card) {
                        const cBtn = card.querySelector('.inspire');
                        cBtn.classList.toggle('liked', data.liked);
                        cBtn.querySelector('svg').setAttribute('fill', data.liked ? 'var(--accent-red)' : 'none');
                        cBtn.querySelector('svg').setAttribute('stroke', data.liked ? 'var(--accent-red)' : 'currentColor');
                        card.querySelector('.like-number').textContent = data.like_count.toLocaleString();
                    }
                }
                btn.disabled = false;
            }).catch(() => btn.disabled = false);
    }

    function loadModalComments(postId, listEl) {
        fetch(`/api/comments?post_id=${postId}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok) {
                    const existingHeader = listEl.querySelector('.modal-caption') ? listEl.querySelector('.modal-caption').outerHTML : '';
                    if (data.comments.length === 0) {
                        listEl.innerHTML = existingHeader + '<p style="color:#666; font-size:13px; text-align:center; padding: 20px 0;">No comments...</p>';
                        return;
                    }
                    const cHtml = data.comments.map(c => {
                        const d = new Date(c.created_at + 'Z');
                        const diffMins = Math.round((Date.now() - d) / 60000);
                        const timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m` : diffMins < 1440 ? `${Math.round(diffMins / 60)}h` : `${Math.round(diffMins / 1440)}d`;
                        let aHtml = `<div class="modal-header-ph">${(c.username || '?').charAt(0).toUpperCase()}</div>`;
                        if (c.avatar) aHtml = `<img src="${c.avatar}" class="modal-header-avatar">`;
                        return `
                        <div class="modal-comment">
                            ${aHtml}
                            <div style="flex:1;">
                                <span class="ig-caption-author">${c.username || 'user'}</span> 
                                <span class="modal-comment-text">${c.content}</span>
                                <div class="modal-comment-time">${timeStr}</div>
                            </div>
                        </div>`;
                    }).join('');
                    listEl.innerHTML = existingHeader + cHtml;
                }
            }).catch(console.error);
    }

    // ── 5. Follow / Unfollow ─────────────────────────────────────────
    window.toggleFollow = function (btn) {
        if (!currentUser) { showToast('Login required', 'Please sign in to follow users'); return; }
        const targetEmail = btn.dataset.target;
        btn.disabled = true;

        fetch('/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ follower_email: currentUser, target_email: targetEmail })
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok) {
                    btn.textContent = data.following ? 'Following' : 'Follow';
                    btn.classList.toggle('following', data.following);
                }
                btn.disabled = false;
            })
            .catch(() => { btn.disabled = false; });
    };

    // ── 6. Load Comments from DB ─────────────────────────────────────
    function loadComments(postId, listEl) {
        listEl.innerHTML = '<p class="comment-loading">Loading…</p>';
        fetch(`/api/comments?post_id=${postId}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.comments.length > 0) {
                    listEl.innerHTML = data.comments.map(c =>
                        `<div class="comment-item">
                            <span class="comment-author">${c.username}</span>
                            <span class="comment-text">${c.content}</span>
                        </div>`
                    ).join('');
                } else {
                    listEl.innerHTML = '<p class="comment-empty">No comments yet. Be first!</p>';
                }
            })
            .catch(() => { listEl.innerHTML = ''; });
    }

    // ── 7. Post Comment to DB ────────────────────────────────────────
    window.postComment = function (btn) {
        if (!currentUser) { showToast('Login required', 'Please sign in to comment'); return; }
        const row = btn.parentElement;
        const input = row.querySelector('.comment-input');
        const content = input.value.trim();
        if (!content) return;

        const postCard = btn.closest('.post-card');
        const postId = postCard.dataset.postId;
        const listEl = postCard.querySelector('.comment-list');

        btn.disabled = true;
        fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, email: currentUser, content })
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok) {
                    input.value = '';
                    const empty = listEl.querySelector('.comment-empty, .comment-loading');
                    if (empty) empty.remove();

                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    commentEl.innerHTML = `<span class="comment-author">${data.username}</span><span class="comment-text">${data.content}</span>`;
                    listEl.appendChild(commentEl);

                    // Update the "View all X comments" counter
                    const viewCount = postCard.querySelector('.ig-view-comments');
                    if (viewCount) {
                        const current = parseInt(viewCount.textContent.match(/\d+/)?.[0] || 0);
                        viewCount.textContent = `View all ${current + 1} comments`;
                    }
                } else {
                    showToast('Error', data.error || 'Could not post comment');
                }
                btn.disabled = false;
            })
            .catch(() => { btn.disabled = false; });
    };

    // ── Helper: Toast ────────────────────────────────────────────────
    function showToast(title, sub) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        document.getElementById('toast-title').textContent = title;
        document.getElementById('toast-username').textContent = sub;
        toast.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 400);
        }, 2200);
    }
});
