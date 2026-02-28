import { initializeApp }                                           from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }                            from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, onValue, off, increment, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ── Firebase config ────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain:        "zo-tinder.firebaseapp.com",
    databaseURL:       "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "zo-tinder",
    storageBucket:     "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId:             "1:866061631708:web:f2c70a3989032095803419"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";
const ROLE_RANK = { owner: 4, admin: 3, mod: 2, member: 1 };

// ── State ──────────────────────────────────────────────────────────────────
let myUID       = null;
let myData      = {};
let myRank      = 1;
let allChats    = {};   // chatID → chat data
let usersCache  = {};   // uid → user data
let activeConvoTarget = null; // current open options sheet target

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function openOverlay(id)  { document.getElementById(id)?.classList.add('open');    }
function closeOverlay(id) { document.getElementById(id)?.classList.remove('open'); }

function getChatID(uidA, uidB) {
    return [uidA, uidB].sort().join('_');
}

function getOtherUID(chatID) {
    return chatID.split('_').find(uid => uid !== myUID);
}

// ── Frame class mapping ────────────────────────────────────────────────────
function getFrameClass(uid, userData) {
    const role = (uid === OWNER_UID) ? 'owner' : (userData?.role || 'member');
    if (role === 'owner') return 'cf-owner';
    if (role === 'admin') return 'cf-admin';
    if (role === 'mod')   return 'cf-mod';
    const equipped = userData?.equippedFrame || '';
    if (equipped) return equipped.replace('frame-', 'cf-');
    return 'cf-none';
}

// ── Fetch user (with cache) ────────────────────────────────────────────────
async function fetchUser(uid) {
    if (usersCache[uid]) return usersCache[uid];
    const snap = await get(ref(db, `users/${uid}`));
    const data = snap.exists() ? snap.val() : {};
    usersCache[uid] = data;
    return data;
}

// ── Format time ────────────────────────────────────────────────────────────
function formatTime(timestamp) {
    if (!timestamp) return '';
    const now  = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1)   return 'Now';
    if (mins < 60)  return `${mins}m`;
    if (hrs  < 24)  return `${hrs}h`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(timestamp).getDay()];
    return new Date(timestamp).toLocaleDateString();
}

// ── Tick HTML ──────────────────────────────────────────────────────────────
function getTickHTML(status) {
    if (status === 'read')      return `<span class="msg-ticks read">✓✓</span>`;
    if (status === 'delivered') return `<span class="msg-ticks delivered">✓✓</span>`;
    return `<span class="msg-ticks sent">✓</span>`;
}

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    myUID = user.uid;
    myData = await fetchUser(myUID);
    const myRole = (myUID === OWNER_UID) ? 'owner' : (myData.role || 'member');
    myRank = ROLE_RANK[myRole] || 1;

    // Start listening to chats
    listenToChats();
    listenToRequests();
    setupSearch();
    setupOptionsSheet();
    setupAvatarPopup();
    setupSettings();
});

// ── LISTEN TO CHATS ────────────────────────────────────────────────────────
function listenToChats() {
    const chatsRef = ref(db, 'chats');

    onValue(chatsRef, async (snap) => {
        if (!snap.exists()) {
            showEmptyChats();
            return;
        }

        const all = snap.val();
        const myChats = [];

        for (const chatID in all) {
            const chat = all[chatID];

            // Must be a participant
            if (!chat.participants?.[myUID]) continue;

            // Skip if I deleted this chat
            if (chat.meta?.[myUID]?.deleted) continue;

            // Skip requests (handled separately)
            if (chat.isRequest && chat.requestTo === myUID) continue;

            myChats.push({ chatID, ...chat });
        }

        // Sort by lastTime descending
        myChats.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

        // Separate pinned and normal
        const pinned = myChats.filter(c => c.meta?.[myUID]?.pinned);
        const normal = myChats.filter(c => !c.meta?.[myUID]?.pinned);

        allChats = {};
        myChats.forEach(c => { allChats[c.chatID] = c; });

        await renderChats(pinned, normal);
    });
}

// ── RENDER CHATS ───────────────────────────────────────────────────────────
async function renderChats(pinned, normal) {
    const pinnedSection = document.getElementById('pinnedSection');
    const pinnedList    = document.getElementById('pinnedList');
    const chatsList     = document.getElementById('chatsList');
    const chatsEmpty    = document.getElementById('chatsEmpty');

    if (!pinnedList || !chatsList) return;

    // Pinned section
    if (pinned.length > 0) {
        pinnedSection.style.display = 'block';
        pinnedList.innerHTML = '';
        for (const chat of pinned) {
            const row = await buildChatRow(chat, true);
            pinnedList.appendChild(row);
        }
    } else {
        pinnedSection.style.display = 'none';
        pinnedList.innerHTML = '';
    }

    // Normal chats
    chatsList.innerHTML = '';
    if (normal.length === 0 && pinned.length === 0) {
        chatsEmpty.style.display = 'flex';
        return;
    }

    chatsEmpty.style.display = 'none';
    for (const chat of normal) {
        const row = await buildChatRow(chat, false);
        chatsList.appendChild(row);
    }
}

// ── BUILD CHAT ROW ─────────────────────────────────────────────────────────
async function buildChatRow(chat, isPinned) {
    const otherUID  = getOtherUID(chat.chatID);
    const otherData = await fetchUser(otherUID);

    const frameClass = getFrameClass(otherUID, otherData);
    const role       = (otherUID === OWNER_UID) ? 'owner' : (otherData.role || 'member');
    const unread     = chat.meta?.[myUID]?.unreadCount || 0;
    const iSentLast  = chat.lastFrom === myUID;
    const isOnline   = otherData.isOnline || false;

    // Staff badge
    let staffBadgeHTML = '';
    if (role === 'owner') staffBadgeHTML = `<span class="staff-badge owner">👑 Owner</span>`;
    else if (role === 'admin') staffBadgeHTML = `<span class="staff-badge admin">⚙️ Admin</span>`;
    else if (role === 'mod')   staffBadgeHTML = `<span class="staff-badge mod">🛡️ Mod</span>`;

    // Online / last seen
    let onlineHTML = '';
    if (isOnline) {
        onlineHTML = `<div class="convo-online-text show">🟢 Online</div>`;
    } else if (otherData.lastSeen) {
        onlineHTML = `<div class="convo-lastseen show">Last seen ${formatTime(otherData.lastSeen)}</div>`;
    }

    // Last message preview
    let previewText = chat.lastMessage || '';
    if (chat.lastMessageType === 'image') previewText = '📷 Photo';

    // Right side — ticks or unread badge
    let rightHTML = '';
    if (iSentLast) {
        rightHTML = getTickHTML(chat.lastStatus || 'sent');
    } else if (unread > 0) {
        rightHTML = `<div class="unread-badge show">${unread}</div>`;
    }

    // Avatar
    const avatarHTML = otherData.photoURL
        ? `<img class="convo-img" src="${esc(otherData.photoURL)}" alt="avatar" style="display:block;">`
        : `<div class="convo-img">${esc(otherData.username?.[0] || '?')}</div>`;

    // Build row
    const row = document.createElement('div');
    row.className = `convo-row${unread > 0 && !iSentLast ? ' unread' : ''}${isPinned ? ' pinned' : ''}`;
    row.dataset.chatid = chat.chatID;
    row.dataset.uid    = otherUID;
    row.dataset.name   = (otherData.username || '').toLowerCase();

    row.innerHTML = `
        <div class="convo-avatar ${frameClass}" data-uid="${otherUID}">
            ${avatarHTML}
            <div class="convo-frame"></div>
        </div>
        <div class="convo-info">
            <div class="convo-top">
                <div class="convo-name">
                    ${esc(otherData.username || 'User')}
                    ${staffBadgeHTML}
                    ${isPinned ? '<span class="pin-icon">📌</span>' : ''}
                </div>
                <div class="convo-time">${formatTime(chat.lastTime)}</div>
            </div>
            ${onlineHTML}
            <div class="convo-preview">
                <span class="convo-preview-text">${esc(previewText)}</span>
                <div style="display:flex;align-items:center;gap:4px;">
                    ${rightHTML}
                </div>
            </div>
        </div>
        <button class="convo-more" data-chatid="${chat.chatID}" data-uid="${otherUID}">⋮</button>
    `;

    // Tap row → go to chat
    row.addEventListener('click', (e) => {
        if (e.target.closest('.convo-more') || e.target.closest('.convo-avatar')) return;
        window.location.href = `chat.html?uid=${otherUID}`;
    });

    // Tap avatar → open popup
    row.querySelector('.convo-avatar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openAvatarPopup(otherUID, otherData);
    });

    // Tap 3-dot → open options
    row.querySelector('.convo-more')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openConvoOptions(chat.chatID, otherUID, otherData.username || 'User', isPinned);
    });

    // Divider
    const wrapper = document.createElement('div');
    wrapper.appendChild(row);
    const divider = document.createElement('div');
    divider.className = 'convo-divider';
    wrapper.appendChild(divider);

    return wrapper;
}

function showEmptyChats() {
    document.getElementById('chatsList').innerHTML = '';
    document.getElementById('pinnedSection').style.display = 'none';
    document.getElementById('chatsEmpty').style.display = 'flex';
}

// ── SEARCH ─────────────────────────────────────────────────────────────────
function setupSearch() {
    const input = document.getElementById('searchInput');
    input?.addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        document.querySelectorAll('.convo-row').forEach(row => {
            const name = row.dataset.name || '';
            row.parentElement.style.display = (!q || name.includes(q)) ? '' : 'none';
        });
    });
}

// ── CONVO OPTIONS SHEET ────────────────────────────────────────────────────
function setupOptionsSheet() {
    // Close on backdrop tap
    document.getElementById('convoOptionsOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'convoOptionsOverlay') closeOverlay('convoOptionsOverlay');
    });
}

function openConvoOptions(chatID, otherUID, name, isPinned) {
    activeConvoTarget = { chatID, otherUID, isPinned };

    document.getElementById('convoOptionsName').textContent = name;
    document.getElementById('optionPinLabel').textContent = isPinned ? 'Unpin Chat' : 'Pin Chat';
    document.querySelector('#optionPin .opt-icon').textContent = isPinned ? '📌' : '📌';

    // Pin/Unpin
    const pinBtn = document.getElementById('optionPin');
    pinBtn.onclick = () => togglePin(chatID, isPinned);

    // Delete
    const delBtn = document.getElementById('optionDelete');
    delBtn.onclick = () => deleteChat(chatID);

    openOverlay('convoOptionsOverlay');
}

async function togglePin(chatID, isPinned) {
    closeOverlay('convoOptionsOverlay');
    try {
        await update(ref(db, `chats/${chatID}/meta/${myUID}`), {
            pinned: !isPinned
        });
        showToast(isPinned ? '📌 Unpinned' : '📌 Chat pinned');
    } catch (e) {
        console.error('pin error:', e);
        showToast('❌ Failed');
    }
}

async function deleteChat(chatID) {
    closeOverlay('convoOptionsOverlay');
    try {
        await update(ref(db, `chats/${chatID}/meta/${myUID}`), {
            deleted: true
        });
        showToast('🗑️ Chat deleted');
    } catch (e) {
        console.error('delete error:', e);
        showToast('❌ Failed to delete');
    }
}

// ── REQUESTS ───────────────────────────────────────────────────────────────
function listenToRequests() {
    const chatsRef = ref(db, 'chats');

    onValue(chatsRef, async (snap) => {
        if (!snap.exists()) {
            updateRequestsBadge(0);
            showEmptyRequests();
            return;
        }

        const all = snap.val();
        const requests = [];

        for (const chatID in all) {
            const chat = all[chatID];
            if (!chat.isRequest) continue;
            if (chat.requestTo !== myUID) continue;
            if (chat.meta?.[myUID]?.deleted) continue;
            requests.push({ chatID, ...chat });
        }

        requests.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
        updateRequestsBadge(requests.length);
        await renderRequests(requests);
    });
}

function updateRequestsBadge(count) {
    const badge = document.getElementById('requestsCount');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

async function renderRequests(requests) {
    const list  = document.getElementById('requestsList');
    const empty = document.getElementById('requestsEmpty');
    if (!list) return;

    if (requests.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = '';

    for (const req of requests) {
        const otherUID  = getOtherUID(req.chatID);
        const otherData = await fetchUser(otherUID);
        const role      = (otherUID === OWNER_UID) ? 'owner' : (otherData.role || 'member');

        let staffBadgeHTML = '';
        if (role === 'owner') staffBadgeHTML = `<span class="staff-badge owner">👑</span>`;
        else if (role === 'admin') staffBadgeHTML = `<span class="staff-badge admin">⚙️</span>`;
        else if (role === 'mod')   staffBadgeHTML = `<span class="staff-badge mod">🛡️</span>`;

        const avatarHTML = otherData.photoURL
            ? `<img class="convo-img" src="${esc(otherData.photoURL)}" style="width:48px;height:48px;">`
            : `<div class="convo-img" style="width:48px;height:48px;">${esc(otherData.username?.[0] || '?')}</div>`;

        let previewText = req.lastMessage || '';
        if (req.lastMessageType === 'image') previewText = '📷 Photo';

        const row = document.createElement('div');
        row.className = 'request-row';
        row.innerHTML = `
            <div class="request-top">
                <div class="convo-avatar ${getFrameClass(otherUID, otherData)}" style="width:48px;height:48px;">
                    ${avatarHTML}
                    <div class="convo-frame"></div>
                </div>
                <div class="request-info">
                    <div class="request-name">
                        ${esc(otherData.username || 'User')}
                        ${staffBadgeHTML}
                    </div>
                    <div class="request-preview">${esc(previewText)}</div>
                </div>
                <div style="font-size:11px;color:#333;font-weight:700;flex-shrink:0;">${formatTime(req.lastTime)}</div>
            </div>
            <div class="request-actions">
                <button class="req-btn accept"  data-chatid="${req.chatID}">✓ Accept</button>
                <button class="req-btn decline" data-chatid="${req.chatID}">✕ Decline</button>
            </div>
        `;

        // Accept
        row.querySelector('.req-btn.accept')?.addEventListener('click', async () => {
            try {
                await update(ref(db, `chats/${req.chatID}`), { isRequest: false });
                showToast('✅ Request accepted');
            } catch (e) {
                showToast('❌ Failed');
            }
        });

        // Decline — delete permanently, sender never knows
        row.querySelector('.req-btn.decline')?.addEventListener('click', async () => {
            try {
                await remove(ref(db, `chats/${req.chatID}`));
                showToast('Request removed');
            } catch (e) {
                showToast('❌ Failed');
            }
        });

        list.appendChild(row);
    }
}

function showEmptyRequests() {
    const list  = document.getElementById('requestsList');
    const empty = document.getElementById('requestsEmpty');
    if (list)  list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
}

// ── AVATAR POPUP ───────────────────────────────────────────────────────────
function setupAvatarPopup() {
    document.getElementById('avatarPopupClose')?.addEventListener('click', () => {
        closeOverlay('avatarPopup');
    });
    document.getElementById('avatarPopup')?.addEventListener('click', (e) => {
        if (e.target.id === 'avatarPopup') closeOverlay('avatarPopup');
    });
}

async function openAvatarPopup(otherUID, otherData) {
    const popup = document.getElementById('avatarPopup');
    if (!popup) return;

    // Avatar
    const imgEl = document.getElementById('popupAvatarImg');
    if (imgEl) {
        if (otherData.photoURL) {
            imgEl.innerHTML = `<img src="${esc(otherData.photoURL)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`;
        } else {
            imgEl.textContent = otherData.username?.[0] || '?';
        }
    }

    // Frame on popup
    const frameEl  = document.getElementById('popupFrame');
    const frameClass = getFrameClass(otherUID, otherData);
    if (frameEl) {
        // Apply same frame styles via class on parent
        const wrapEl = document.getElementById('popupAvatarWrap');
        if (wrapEl) {
            wrapEl.className = `popup-avatar-wrap ${frameClass.replace('cf-', 'cf-')}`;
        }
        // Inline frame ring — reuse same cf- classes if needed
        frameEl.className = `popup-frame`;
    }

    // Name
    document.getElementById('popupName').textContent = otherData.username || 'User';

    // Role badge
    const badge = document.getElementById('popupRoleBadge');
    if (badge) {
        const role = (otherUID === OWNER_UID) ? 'owner' : (otherData.role || '');
        badge.className = 'popup-role-badge';
        if (role === 'owner')      { badge.className += ' owner'; badge.innerHTML = '👑 Owner';  badge.style.display = 'inline-flex'; }
        else if (role === 'admin') { badge.className += ' admin'; badge.innerHTML = '⚙️ Admin';  badge.style.display = 'inline-flex'; }
        else if (role === 'mod')   { badge.className += ' mod';   badge.innerHTML = '🛡️ Mod';    badge.style.display = 'inline-flex'; }
        else badge.style.display = 'none';
    }

    // Online status
    const onlineEl = document.getElementById('popupOnline');
    if (onlineEl) onlineEl.className = `popup-online${otherData.isOnline ? ' show' : ''}`;

    // Follow button
    const followBtn = document.getElementById('popupFollowBtn');
    if (followBtn) {
        const followSnap = await get(ref(db, `users/${myUID}/following/${otherUID}`));
        const isFollowing = followSnap.exists();
        followBtn.textContent = isFollowing ? '✓ Unfollow' : '➕ Follow';
        followBtn.className   = isFollowing ? 'popup-btn unfollow-btn' : 'popup-btn follow-btn';

        followBtn.onclick = async () => {
            try {
                if (isFollowing) {
                    await Promise.all([
                        remove(ref(db, `users/${myUID}/following/${otherUID}`)),
                        remove(ref(db, `users/${otherUID}/followers/${myUID}`)),
                        update(ref(db, `users/${myUID}`),    { followingCount: increment(-1) }),
                        update(ref(db, `users/${otherUID}`), { followersCount: increment(-1) })
                    ]);
                    followBtn.textContent = '➕ Follow';
                    followBtn.className   = 'popup-btn follow-btn';
                    showToast('Unfollowed');
                } else {
                    await Promise.all([
                        set(ref(db, `users/${myUID}/following/${otherUID}`), true),
                        set(ref(db, `users/${otherUID}/followers/${myUID}`), true),
                        update(ref(db, `users/${myUID}`),    { followingCount: increment(1) }),
                        update(ref(db, `users/${otherUID}`), { followersCount: increment(1) })
                    ]);
                    followBtn.textContent = '✓ Unfollow';
                    followBtn.className   = 'popup-btn unfollow-btn';
                    showToast('Following! 🎉');
                }
            } catch (e) {
                showToast('❌ Action failed');
            }
        };
    }

    // View profile
    const viewBtn = document.getElementById('popupViewBtn');
    if (viewBtn) {
        viewBtn.onclick = () => { window.location.href = `user-view.html?uid=${otherUID}`; };
    }

    // Block button — hidden for staff
    const blockBtn = document.getElementById('popupBlockBtn');
    if (blockBtn) {
        const targetRole = (otherUID === OWNER_UID) ? 'owner' : (otherData.role || 'member');
        const targetRank = ROLE_RANK[targetRole] || 1;

        // Hide block button if target is staff
        if (targetRank >= ROLE_RANK.mod) {
            blockBtn.style.display = 'none';
        } else {
            blockBtn.style.display = 'flex';

            const blockSnap  = await get(ref(db, `users/${myUID}/blocked/${otherUID}`));
            const isBlocked  = blockSnap.exists();

            blockBtn.textContent = isBlocked ? '🔓 Unblock' : '🚫 Block';
            blockBtn.className   = isBlocked ? 'popup-btn unblock-btn' : 'popup-btn block-btn';

            blockBtn.onclick = async () => {
                try {
                    if (isBlocked) {
                        await remove(ref(db, `users/${myUID}/blocked/${otherUID}`));
                        blockBtn.textContent = '🚫 Block';
                        blockBtn.className   = 'popup-btn block-btn';
                        showToast('✅ User unblocked');
                    } else {
                        await set(ref(db, `users/${myUID}/blocked/${otherUID}`), true);
                        blockBtn.textContent = '🔓 Unblock';
                        blockBtn.className   = 'popup-btn unblock-btn';
                        showToast('🚫 User blocked');
                        closeOverlay('avatarPopup');
                    }
                } catch (e) {
                    showToast('❌ Failed');
                }
            };
        }
    }

    popup.classList.add('open');
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
function setupSettings() {
    document.getElementById('settingsBtn')?.addEventListener('click',  () => openOverlay('settingsOverlay'));
    document.getElementById('requestsBtn')?.addEventListener('click',  () => openOverlay('requestsOverlay'));

    // Close on backdrop
    ['settingsOverlay', 'requestsOverlay', 'convoOptionsOverlay'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            if (e.target.id === id) closeOverlay(id);
        });
    });

    // Mute toggle — coming soon
    document.getElementById('settingsMute')?.addEventListener('click', () => {
        showToast('🔕 Coming soon!');
    });
}
