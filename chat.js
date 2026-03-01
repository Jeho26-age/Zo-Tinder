import { initializeApp }                                               from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }                                from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, update, remove, onValue, off, onDisconnect, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const CLOUDINARY_UPLOAD_URL    = "https://api.cloudinary.com/v1_1/duj2rx73z/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "Zo-Tinder";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";
const ROLE_RANK = { owner: 4, admin: 3, mod: 2, member: 1 };

// ── State ──────────────────────────────────────────────────────────────────
let myUID       = null;
let myData      = {};
let myRank      = 1;
let targetUID   = null;
let targetData  = {};
let targetRank  = 1;
let chatID      = null;
let myBubbleStyle    = 'bs-default';
let theirBubbleStyle = 'bs-default';
let activeMsgID = null;       // currently long-pressed message
let activeMsgMine = false;    // is it my message?
let currentBg   = 'black';    // current background theme
let customBgURL = null;       // custom image URL
let customDim   = 0.5;        // custom image dim level
let messagesListener = null;

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

function hideLoader() {
    const ol = document.getElementById('loadingOverlay');
    if (!ol) return;
    ol.style.opacity = '0';
    setTimeout(() => ol.style.display = 'none', 300);
}

function getChatID(a, b) { return [a, b].sort().join('_'); }

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(ts) {
    if (!ts) return '';
    const now  = new Date();
    const date = new Date(ts);
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)   return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function applyFrame(wrapEl, uid, data) {
    if (!wrapEl) return;

    // Clean up any previous owner PNG elements
    wrapEl.querySelectorAll('.owner-png-aura, .owner-png-frame').forEach(el => el.remove());

    const equippedFrame = data?.equippedFrame || null;
    const role = (uid === OWNER_UID) ? 'owner' : (data?.role || 'member');

    if (equippedFrame === 'frame-owner' || role === 'owner') {
        // PNG frame — same logic as user-view.js
        wrapEl.className = 'header-avatar-wrap frame-owner-png';

        const aura = document.createElement('div');
        aura.className = 'owner-png-aura';
        wrapEl.appendChild(aura);

        const frameImg = document.createElement('img');
        frameImg.className = 'owner-png-frame';
        frameImg.src = 'owner-avatar.png';
        frameImg.alt = '';
        wrapEl.appendChild(frameImg);

    } else if (equippedFrame) {
        // e.g. "frame-fire", "frame-aurora" — matches Firebase value directly
        wrapEl.className = `header-avatar-wrap ${equippedFrame}`;

    } else if (role === 'admin') {
        wrapEl.className = 'header-avatar-wrap frame-admin';
    } else if (role === 'mod') {
        wrapEl.className = 'header-avatar-wrap frame-mod';
    } else {
        wrapEl.className = 'header-avatar-wrap frame-none';
    }
}

function getBubbleStyle(data, uid) {
    // App owner always gets the owner bubble, UID-locked — cannot be equipped by others
    if (uid && uid === OWNER_UID) return 'bubble-owner';
    // Block anyone else from equipping bubble-owner
    const equipped = data?.equippedBubble || 'bs-default';
    return equipped === 'bubble-owner' ? 'bs-default' : equipped;
}

// ── AUTH + INIT ────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }

    myUID = user.uid;

    // Get target UID from URL
    const params = new URLSearchParams(window.location.search);
    targetUID = params.get('uid') || params.get('id');

    if (!targetUID) { window.location.href = 'messages.html'; return; }
    if (targetUID === myUID) { window.location.href = 'profile.html'; return; }

    // Set target UID on body for goToProfile()
    document.body.dataset.targetuid = targetUID;

    try {
        // Fetch both users + block checks in parallel
        const [mySnap, targetSnap, theyBlockedMe, iBlockedThem] = await Promise.all([
            get(ref(db, `users/${myUID}`)),
            get(ref(db, `users/${targetUID}`)),
            get(ref(db, `users/${targetUID}/blocked/${myUID}`)),
            get(ref(db, `users/${myUID}/blocked/${targetUID}`))
        ]);

        myData     = mySnap.exists()     ? mySnap.val()     : {};
        targetData = targetSnap.exists() ? targetSnap.val() : {};

        const myRole     = (myUID === OWNER_UID)     ? 'owner' : (myData.role     || 'member');
        const targetRole = (targetUID === OWNER_UID) ? 'owner' : (targetData.role || 'member');
        myRank     = ROLE_RANK[myRole]     || 1;
        targetRank = ROLE_RANK[targetRole] || 1;

        // Block checks
        if (theyBlockedMe.exists()) {
            showToast('🚫 You cannot message this user');
            setTimeout(() => window.location.href = 'messages.html', 1500);
            return;
        }
        if (iBlockedThem.exists()) {
            showToast('🚫 Unblock this user to message them');
            setTimeout(() => window.location.href = 'messages.html', 1500);
            return;
        }

        // Bubble styles
        myBubbleStyle    = getBubbleStyle(myData,     myUID);
        theirBubbleStyle = getBubbleStyle(targetData, targetUID);

        // Chat ID
        chatID = getChatID(myUID, targetUID);

        // Render header
        renderHeader();
        listenOnlineStatus();

        // ── PRESENCE: mark me as online, auto-offline on disconnect ──────
        const myPresenceRef = ref(db, `users/${myUID}`);
        const presenceData  = { isOnline: true, lastSeen: Date.now() };
        await update(myPresenceRef, presenceData);
        // onDisconnect fires even if app crashes or loses internet
        onDisconnect(myPresenceRef).update({ isOnline: false, lastSeen: Date.now() });

        // Load background
        loadBackground();

        // Load achievements for header
        loadHeaderAchievements();

        // Block menu item visibility
        setupMenuBlockBtn();

        // Setup all interactions
        setupMenu();
        setupInputBar();
        setupEmojiPicker();
        setupStickerPanel();
        setupImageUpload();
        setupBgPicker();
        setupSearch();
        setupCallButtons();
        setupMsgOptionsSheet();
        setupTypingIndicator();
        setupThemeToggle();

        // Start listening to messages
        listenMessages();

        // Ensure chat node exists
        await ensureChatExists();

        // Mark messages as delivered
        markDelivered();

    } catch (e) {
        console.error('chat.js init error:', e);
        showToast('❌ Failed to load chat');
    } finally {
        hideLoader();
    }
});

// ── ENSURE CHAT EXISTS ─────────────────────────────────────────────────────
async function ensureChatExists() {
    const chatRef = ref(db, `chats/${chatID}`);
    const snap    = await get(chatRef);
    if (!snap.exists()) {
        // Check if mutual followers — if not, create as request
        const [iFollowThem, theyFollowMe] = await Promise.all([
            get(ref(db, `users/${myUID}/following/${targetUID}`)),
            get(ref(db, `users/${targetUID}/following/${myUID}`))
        ]);

        const mutual = iFollowThem.exists() && theyFollowMe.exists();
        const isStaff = myRank >= ROLE_RANK.mod; // staff bypass

        await set(chatRef, {
            participants: { [myUID]: true, [targetUID]: true },
            isRequest:  (!mutual && !isStaff),
            requestTo:  (!mutual && !isStaff) ? targetUID : null,
            createdAt:  Date.now(),
            lastMessage: '',
            lastTime:    Date.now(),
            lastFrom:    myUID,
        });

        // Notify sender if going to requests
        if (!mutual && !isStaff) {
            showToast("💡 Your message won't be seen until they follow you back");
        }
    }
}

// ── RENDER HEADER ──────────────────────────────────────────────────────────
function renderHeader() {
    // Target avatar photo
    const avatarEl = document.getElementById('headerAvatarImg');
    if (avatarEl) {
        if (targetData.photoURL) {
            avatarEl.innerHTML = `<img src="${esc(targetData.photoURL)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarEl.textContent = targetData.username?.[0] || '?';
        }
    }

    // Target frame — uses same logic as user-view.js
    applyFrame(document.getElementById('headerAvatarWrap'), targetUID, targetData);

    // Name
    document.getElementById('headerName').textContent = targetData.username || 'User';

    // Role badge
    const badge = document.getElementById('headerRoleBadge');
    if (badge) {
        const role = (targetUID === OWNER_UID) ? 'owner' : (targetData.role || '');
        badge.className = 'role-badge';
        if      (role === 'owner') { badge.className += ' owner'; badge.innerHTML = '👑 Owner'; }
        else if (role === 'admin') { badge.className += ' admin'; badge.innerHTML = '⚙️ Admin'; }
        else if (role === 'mod')   { badge.className += ' mod';   badge.innerHTML = '🛡️ Mod'; }
    }
}

// ── ONLINE STATUS (real-time) ──────────────────────────────────────────────
function listenOnlineStatus() {
    const statusRef = ref(db, `users/${targetUID}`);
    onValue(statusRef, (snap) => {
        const data = snap.val() || {};
        const el   = document.getElementById('headerStatus');
        if (!el) return;
        if (data.isOnline) {
            el.textContent = '🟢 Online';
            el.className   = 'header-status online';
        } else if (data.lastSeen) {
            const diff = Math.floor((Date.now() - data.lastSeen) / 60000);
            let label = diff < 1 ? 'Just now' : diff < 60 ? `${diff}m ago` : diff < 1440 ? `${Math.floor(diff/60)}h ago` : 'Long ago';
            el.textContent = `Last seen ${label}`;
            el.className   = 'header-status';
        } else {
            el.textContent = '';
        }
    });
}

// ── HEADER ACHIEVEMENTS ────────────────────────────────────────────────────
async function loadHeaderAchievements() {
    const el = document.getElementById('headerAchievements');
    if (!el) return;
    try {
        const usersSnap = await get(ref(db, 'users'));
        if (!usersSnap.exists()) return;

        const users = [];
        usersSnap.forEach(child => {
            const d = child.val();
            if (d?.username) users.push({ uid: child.key, ...d });
        });

        const byFollowers = [...users].sort((a,b) => (b.followersCount||0)-(a.followersCount||0));
        const byLikes     = [...users].sort((a,b) => (b.total_likes||0)-(a.total_likes||0));

        const posFollow = byFollowers.findIndex(u => u.uid === targetUID) + 1;
        const posLikes  = byLikes.findIndex(u => u.uid === targetUID) + 1;

        const parts = [];
        if (posFollow > 0 && posFollow <= 10) parts.push(`🌐 #${posFollow} Followed`);
        if (posLikes  > 0 && posLikes  <= 10) parts.push(`🏆 #${posLikes} Battle`);

        if (parts.length) {
            el.textContent     = parts.join(' · ');
            el.style.display   = 'block';
        }
    } catch (e) { /* silently fail */ }
}

// ── BLOCK MENU BUTTON ──────────────────────────────────────────────────────
function setupMenuBlockBtn() {
    const blockBtn = document.getElementById('menuBlock');
    if (!blockBtn) return;

    // Hide block if target is staff
    if (targetRank >= ROLE_RANK.mod) {
        blockBtn.classList.add('hidden');
        return;
    }

    // Set initial label
    updateBlockLabel();
}

async function updateBlockLabel() {
    const snap    = await get(ref(db, `users/${myUID}/blocked/${targetUID}`));
    const label   = document.getElementById('menuBlockLabel');
    if (label) label.textContent = snap.exists() ? 'Unblock User' : 'Block User';
}

// ── LISTEN TO MESSAGES ─────────────────────────────────────────────────────
function listenMessages() {
    if (messagesListener) off(ref(db, `chats/${chatID}/messages`));

    const msgsRef = ref(db, `chats/${chatID}/messages`);
    messagesListener = onValue(msgsRef, (snap) => {
        renderMessages(snap);
        markRead();
    });
}

// ── RENDER MESSAGES ────────────────────────────────────────────────────────
function renderMessages(snap) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;

    const wasAtBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 60;

    chatArea.innerHTML = '';

    if (!snap.exists()) return;

    let lastDateLabel = '';

    snap.forEach(child => {
        const msgID = child.key;
        const msg   = child.val();

        // Skip deleted for me
        if (msg.deletedFor?.[myUID]) return;

        const isMine = msg.from === myUID;

        // Date separator
        const dateLabel = formatDateLabel(msg.time);
        if (dateLabel !== lastDateLabel) {
            lastDateLabel = dateLabel;
            const sep = document.createElement('div');
            sep.className = 'date-separator';
            sep.innerHTML = `<span>${esc(dateLabel)}</span>`;
            chatArea.appendChild(sep);
        }

        // Build message row
        const row = buildMessageRow(msgID, msg, isMine);
        chatArea.appendChild(row);
    });

    // Scroll to bottom if was at bottom
    if (wasAtBottom) {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

// ── BUILD MESSAGE ROW ──────────────────────────────────────────────────────
function buildMessageRow(msgID, msg, isMine) {
    const bubbleStyle = isMine ? myBubbleStyle : theirBubbleStyle;
    const row = document.createElement('div');
    row.className = `msg-row ${isMine ? 'mine' : ''} ${bubbleStyle}`;
    row.dataset.msgid = msgID;

    // Build message row — no avatar, pure bubbles
    let avatarHTML = '';

    // Bubble content
    let bubbleInner = '';
    const isDeleted = msg.deleted && msg.deletedFor === 'everyone';

    if (isDeleted) {
        bubbleInner = `<div class="bubble deleted">🚫 Message deleted</div>`;
    } else if (msg.type === 'sticker') {
        // Detect if stickerURL is a real URL or just an emoji string
        const isRealURL = msg.stickerURL && (msg.stickerURL.startsWith('http') || msg.stickerURL.startsWith('data:'));
        bubbleInner = isRealURL
            ? `<div class="msg-sticker" onclick="openImgViewer('${esc(msg.stickerURL)}', false)">
                   <img src="${esc(msg.stickerURL)}" alt="sticker" loading="lazy">
               </div>`
            : `<div class="msg-sticker-emoji">${esc(msg.stickerURL)}</div>`;
    } else if (msg.type === 'image') {
        bubbleInner = `
            <div class="msg-image" onclick="openImgViewer('${esc(msg.imageURL)}', true)">
                <img src="${esc(msg.imageURL)}" alt="photo" loading="lazy">
            </div>`;
    } else if (msg.type === 'image_once') {
        bubbleInner = buildViewOnceBubble(msgID, msg, isMine);
    } else {
        // Text — use equippedBubble style, never hardcode by UID
        if (bubbleStyle === 'bubble-owner') {
            bubbleInner = `
                <div class="bubble-owner">
                    <span class="crown-stamp">👑</span>
                    <span class="orn orn-tl">❧</span>
                    <span class="orn orn-bl">❧</span>
                    <span class="orn orn-br">❧</span>
                    <div class="bubble-content">${esc(msg.text)}</div>
                    <span class="gold-line"></span>
                </div>`;
        } else {
            bubbleInner = `<div class="bubble">${esc(msg.text)}</div>`;
        }
    }
    

    // Reactions
    let reactionsHTML = '';
    if (msg.reactions) {
        const groups = {};
        Object.values(msg.reactions).forEach(emoji => {
            groups[emoji] = (groups[emoji] || 0) + 1;
        });
        reactionsHTML = `<div class="msg-reactions">
            ${Object.entries(groups).map(([emoji, count]) =>
                `<div class="reaction-pill">${emoji}${count > 1 ? `<span>${count}</span>` : ''}</div>`
            ).join('')}
        </div>`;
    }

    // Ticks (only on my messages)
    let ticksHTML = '';
    if (isMine && !isDeleted) {
        const status = msg.status || 'sent';
        ticksHTML = `<span class="msg-ticks ${status}">${status === 'sent' ? '✓' : '✓✓'}</span>`;
    }

    // Meta
    const metaHTML = `
        <div class="msg-meta">
            <span class="msg-time">${formatTime(msg.time)}</span>
            ${ticksHTML}
        </div>`;

    row.innerHTML = `
        ${avatarHTML}
        <div class="msg-content">
            ${bubbleInner}
            ${reactionsHTML}
            ${metaHTML}
        </div>`;

    // Long press
    if (!isDeleted) {
        let pressTimer;
        row.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => openMsgOptions(msgID, msg, isMine), 600);
        });
        row.addEventListener('touchend',  () => clearTimeout(pressTimer));
        row.addEventListener('touchmove', () => clearTimeout(pressTimer));
        row.addEventListener('contextmenu', (e) => { e.preventDefault(); openMsgOptions(msgID, msg, isMine); });
    }

    return row;
}

// ── VIEW ONCE BUBBLE ───────────────────────────────────────────────────────
function buildViewOnceBubble(msgID, msg, isMine) {
    const isStaff   = myRank >= ROLE_RANK.mod;
    const isViewed  = msg.viewed && !isMine;
    const isSender  = isMine;

    if (isStaff) {
        // Staff always see full image + download
        return `
            <div class="msg-image" onclick="openImgViewer('${esc(msg.imageURL)}', true)">
                <img src="${esc(msg.imageURL)}" alt="view once" loading="lazy">
                <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);border-radius:8px;padding:2px 8px;font-size:10px;font-weight:900;color:white;">👁️ Staff</div>
            </div>`;
    }

    if (isSender) {
        if (isViewed) {
            return `
                <div class="view-once-bubble view-once-opened">
                    <div class="view-once-icon">👁️</div>
                    <div>
                        <div class="view-once-label">Opened</div>
                        <div class="view-once-sub">${msg.viewedAt ? formatTime(msg.viewedAt) : ''}</div>
                    </div>
                </div>`;
        }
        return `
            <div class="view-once-bubble">
                <div class="view-once-icon">👁️</div>
                <div>
                    <div class="view-once-label">View Once</div>
                    <div class="view-once-sub">Not opened yet</div>
                </div>
            </div>`;
    }

    // Receiver
    if (msg.viewed) {
        return `
            <div class="view-once-bubble view-once-opened">
                <div class="view-once-icon">👁️</div>
                <div>
                    <div class="view-once-label">Opened</div>
                </div>
            </div>`;
    }

    return `
        <div class="view-once-bubble" onclick="viewOnceOpen('${msgID}', '${esc(msg.imageURL)}')">
            <div class="view-once-icon">👁️</div>
            <div>
                <div class="view-once-label">Tap to view</div>
                <div class="view-once-sub">View once · disappears after</div>
            </div>
        </div>`;
}

// ── VIEW ONCE OPEN ─────────────────────────────────────────────────────────
window.viewOnceOpen = async function(msgID, imageURL) {
    // Show image
    openImgViewer(imageURL, false); // no download for view once

    // Mark as viewed
    try {
        await update(ref(db, `chats/${chatID}/messages/${msgID}`), {
            viewed:   true,
            viewedAt: Date.now(),
            viewedBy: myUID
        });
    } catch(e) { console.error('viewOnce error:', e); }
};

// ── IMAGE VIEWER ───────────────────────────────────────────────────────────
window.openImgViewer = function(url, canDownload) {
    const viewer  = document.getElementById('imgViewer');
    const img     = document.getElementById('imgViewerImg');
    const dlBtn   = document.getElementById('imgViewerDownload');
    if (!viewer || !img) return;
    img.src = url;
    dlBtn.style.display = canDownload ? 'block' : 'none';
    dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = url; a.download = 'photo.jpg'; a.target = '_blank';
        a.click();
    };
    viewer.classList.add('open');
};

document.getElementById('imgViewerClose')?.addEventListener('click', () => {
    document.getElementById('imgViewer').classList.remove('open');
});

// ── MARK READ ──────────────────────────────────────────────────────────────
async function markRead() {
    try {
        // Update unread count for me to 0
        await update(ref(db, `chats/${chatID}/meta/${myUID}`), { unreadCount: 0 });

        // Mark all their messages as read
        const snap = await get(ref(db, `chats/${chatID}/messages`));
        if (!snap.exists()) return;
        const updates = {};
        snap.forEach(child => {
            const msg = child.val();
            if (msg.from !== myUID && msg.status !== 'read') {
                updates[`chats/${chatID}/messages/${child.key}/status`] = 'read';
            }
        });
        if (Object.keys(updates).length) await update(ref(db), updates);
    } catch(e) { /* silently */ }
}

// ── MARK DELIVERED ─────────────────────────────────────────────────────────
async function markDelivered() {
    try {
        const snap = await get(ref(db, `chats/${chatID}/messages`));
        if (!snap.exists()) return;
        const updates = {};
        snap.forEach(child => {
            const msg = child.val();
            if (msg.from !== myUID && msg.status === 'sent') {
                updates[`chats/${chatID}/messages/${child.key}/status`] = 'delivered';
            }
        });
        if (Object.keys(updates).length) await update(ref(db), updates);
    } catch(e) { /* silently */ }
}

// ── SEND MESSAGE ───────────────────────────────────────────────────────────
async function sendMessage(payload) {
    try {
        const msgRef  = push(ref(db, `chats/${chatID}/messages`));
        const msgData = {
            from:   myUID,
            time:   Date.now(),
            status: 'sent',
            ...payload
        };

        await set(msgRef, msgData);

        // Update chat meta
        const previewText = payload.text || (payload.type === 'image' ? '📷 Photo' : payload.type === 'image_once' ? '👁️ View Once' : payload.type === 'sticker' ? '🎭 Sticker' : '');

        await update(ref(db, `chats/${chatID}`), {
            lastMessage:     previewText,
            lastMessageType: payload.type || 'text',
            lastTime:        Date.now(),
            lastFrom:        myUID,
            lastStatus:      'sent'
        });

        // Increment their unread count
        await update(ref(db, `chats/${chatID}/meta/${targetUID}`), {
            unreadCount: increment(1),
            deleted:     false
        });

    } catch(e) {
        console.error('sendMessage error:', e);
        showToast('❌ Failed to send');
    }
}

// ── INPUT BAR ──────────────────────────────────────────────────────────────
function setupInputBar() {
    const input   = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    // Send on button click
    sendBtn?.addEventListener('click', () => {
        const text = input?.value.trim();
        if (!text) return;
        input.value = '';
        input.style.height = 'auto';
        sendBtn.classList.remove('active');
        sendMessage({ type: 'text', text });
    });

    // Send on Enter (not shift+enter)
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn?.click();
        }
    });
}

// ── EMOJI PICKER ───────────────────────────────────────────────────────────
const EMOJIS = [
    '😀','😂','🥹','😊','😍','🥰','😘','😎','🤩','😏','😅','🤣',
    '😭','😢','😤','😡','🥺','😱','🤔','🫠','🥳','🤯','😴','🤤',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤️‍🔥','💫','⭐',
    '🔥','✨','💯','👍','👎','👏','🙌','🤝','🫶','💪','🫂','🙏',
    '🎉','🎊','🎈','🎁','🏆','🥇','💎','💰','🍕','🍔','🍣','🧋',
    '🐱','🐶','🦋','🌸','🌹','🌊','🌙','⚡','🌈','🍀','🦄','🐼',
];

function setupEmojiPicker() {
    const panel   = document.getElementById('emojiPanel');
    const btn     = document.getElementById('emojiBtn');
    const grid    = document.getElementById('emojiGrid');
    const input   = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    // Populate grid
    if (grid) {
        grid.innerHTML = EMOJIS.map(e =>
            `<div class="emoji-item" data-emoji="${e}">${e}</div>`
        ).join('');

        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.emoji-item');
            if (!item) return;
            const emoji = item.dataset.emoji;
            if (input) {
                const pos = input.selectionStart;
                input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
                input.focus();
                sendBtn?.classList.toggle('active', input.value.trim().length > 0);
            }
        });
    }

    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        panel?.classList.toggle('open');
        document.getElementById('stickerPanel')?.classList.remove('open');
    });
}

// ── STICKER PANEL ──────────────────────────────────────────────────────────
const DEFAULT_STICKERS = [
    '😂','❤️','🔥','💀','🎉','😭','👀','💯','🫡','🤡',
    '😏','🥹','🙄','😤','🤩','🥳','💅','👑','🫶','⚡',
    '🌚','🌝','🐸','🤌','🫠','💔','🥺','😈','🤯','🌸'
];

async function setupStickerPanel() {
    const panel   = document.getElementById('stickerPanel');
    const btn     = document.getElementById('stickerBtn');
    const defGrid = document.getElementById('defaultStickers');
    const myGrid  = document.getElementById('myStickers');

    // Default stickers
    if (defGrid) {
        defGrid.innerHTML = DEFAULT_STICKERS.map(s =>
            `<div class="sticker-item" data-sticker="${s}">${s}</div>`
        ).join('');

        defGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.sticker-item');
            if (!item) return;
            panel?.classList.remove('open');
            // Default stickers are emoji — store as stickerURL but flag as emoji
            sendMessage({ type: 'sticker', stickerURL: item.dataset.sticker, isEmoji: true });
        });
    }

    // Load custom stickers
    await loadMyStickers();

    // Add sticker button
    document.getElementById('addStickerBtn')?.addEventListener('click', () => {
        document.getElementById('stickerImgInput')?.click();
    });

    document.getElementById('stickerImgInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast('⬆️ Uploading sticker...');
        const url = await uploadToCloudinary(file);
        if (url) {
            // Save to Firebase
            const stickerRef = push(ref(db, `users/${myUID}/stickers`));
            await set(stickerRef, { imageURL: url, createdAt: Date.now() });
            await loadMyStickers();
            showToast('✅ Sticker added!');
        }
        e.target.value = '';
    });

    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        panel?.classList.toggle('open');
        document.getElementById('emojiPanel')?.classList.remove('open');
    });
}

async function loadMyStickers() {
    const myGrid = document.getElementById('myStickers');
    if (!myGrid) return;

    const snap = await get(ref(db, `users/${myUID}/stickers`));
    const addBtn = `<div class="add-sticker-btn" id="addStickerBtn">➕ <span>Add</span></div>`;

    if (!snap.exists()) {
        myGrid.innerHTML = addBtn;
        rewireAddBtn();
        return;
    }

    let html = addBtn;
    snap.forEach(child => {
        const s = child.val();
        html += `<div class="sticker-item" data-url="${esc(s.imageURL)}">
            <img src="${esc(s.imageURL)}" alt="sticker">
        </div>`;
    });
    myGrid.innerHTML = html;
    rewireAddBtn();

    // Click custom sticker to send
    myGrid.querySelectorAll('.sticker-item').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('stickerPanel')?.classList.remove('open');
            sendMessage({ type: 'sticker', stickerURL: item.dataset.url });
        });
    });
}

function rewireAddBtn() {
    document.getElementById('addStickerBtn')?.addEventListener('click', () => {
        document.getElementById('stickerImgInput')?.click();
    });
}

// ── IMAGE UPLOAD — WhatsApp preview style ─────────────────────────────────
let _mediaFile    = null;
let _mediaIsVideo = false;

function setupImageUpload() {
    const imgBtn     = document.getElementById('imageBtn');
    const fileInput  = document.getElementById('mediaFileInput');

    imgBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        _mediaFile    = file;
        _mediaIsVideo = file.type.startsWith('video/');
        _viewOnceOn   = false; // reset toggle

        // Reset toggle UI
        const toggle = document.getElementById('viewOnceToggle');
        const thumb  = document.getElementById('viewOnceThumb');
        if (toggle) toggle.style.background = '#333';
        if (thumb)  thumb.style.left        = '2px';

        // Show preview
        const imgEl   = document.getElementById('mediaPreviewImg');
        const videoEl = document.getElementById('mediaPreviewVideo');
        const url      = URL.createObjectURL(file);

        if (_mediaIsVideo) {
            if (imgEl)   { imgEl.style.display   = 'none'; imgEl.src = ''; }
            if (videoEl) { videoEl.style.display = 'block'; videoEl.src = url; }
        } else {
            if (videoEl) { videoEl.style.display = 'none'; videoEl.src = ''; }
            if (imgEl)   { imgEl.style.display   = 'block'; imgEl.src = url; }
        }

        // Clear caption
        const cap = document.getElementById('mediaCaptionInput');
        if (cap) { cap.value = ''; cap.style.height = 'auto'; }

        document.getElementById('mediaPreviewOverlay')?.classList.add('open');
        e.target.value = '';
    });
}

// Called from HTML when user taps Send in media preview
window.sendMediaPreview = async function() {
    if (!_mediaFile) return;
    document.getElementById('mediaPreviewOverlay')?.classList.remove('open');

    showToast('⬆️ Uploading...');
    const url = await uploadToCloudinary(_mediaFile);
    if (!url) return;

    const caption = document.getElementById('mediaCaptionInput')?.value.trim() || '';

    if (_viewOnceOn) {
        await sendMessage({ type: 'image_once', imageURL: url, viewed: false, text: caption });
    } else {
        await sendMessage({ type: 'image', imageURL: url, text: caption });
    }
    _mediaFile = null;
};

// ── TYPING INDICATOR ───────────────────────────────────────────────────────
let typingTimer = null;

function setupTypingIndicator() {
    const input    = document.getElementById('msgInput');
    const typingRef = ref(db, `chats/${chatID}/typing/${myUID}`);

    input?.addEventListener('input', () => {
        // Write typing:true
        set(typingRef, true).catch(() => {});

        // Clear after 2.5s of no typing
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            remove(typingRef).catch(() => {});
        }, 2500);
    });

    // Clean up on disconnect
    onDisconnect(typingRef).remove();

    // Listen to other user typing
    const theirTypingRef = ref(db, `chats/${chatID}/typing/${targetUID}`);
    onValue(theirTypingRef, (snap) => {
        const indicator  = document.getElementById('typingIndicator');
        const statusEl   = document.getElementById('headerStatus');
        if (!indicator || !statusEl) return;
        if (snap.val() === true) {
            statusEl.style.display    = 'none';
            indicator.classList.add('show');
        } else {
            statusEl.style.display    = '';
            indicator.classList.remove('show');
        }
    });
}

// ── DARK / LIGHT MODE ──────────────────────────────────────────────────────
function setupThemeToggle() {
    const btn       = document.getElementById('menuThemeToggle');
    const icon      = document.getElementById('themeToggleIcon');
    const label     = document.getElementById('themeToggleLabel');

    // Load saved preference
    const saved = localStorage.getItem(`chatTheme_${chatID}`) || 'dark';
    applyColorMode(saved);
    updateToggleUI(saved);

    btn?.addEventListener('click', () => {
        const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        const next    = current === 'dark' ? 'light' : 'dark';
        applyColorMode(next);
        updateToggleUI(next);
        localStorage.setItem(`chatTheme_${chatID}`, next);
        document.getElementById('popupMenu')?.classList.remove('open');
    });

    function applyColorMode(mode) {
        document.body.classList.toggle('light-mode', mode === 'light');
    }

    function updateToggleUI(mode) {
        if (!icon || !label) return;
        if (mode === 'dark') {
            icon.textContent  = '☀️';
            label.textContent = 'Light Mode';
        } else {
            icon.textContent  = '🌙';
            label.textContent = 'Dark Mode';
        }
    }
}

// ── CLOUDINARY UPLOAD ──────────────────────────────────────────────────────
async function uploadToCloudinary(file) {
    try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res  = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: fd });
        const data = await res.json();
        return data.secure_url || null;
    } catch(e) {
        console.error('Cloudinary upload error:', e);
        showToast('❌ Upload failed');
        return null;
    }
}

// ── LONG PRESS MESSAGE OPTIONS ─────────────────────────────────────────────
function setupMsgOptionsSheet() {
    // React emojis
    document.querySelectorAll('.react-emoji').forEach(el => {
        el.addEventListener('click', () => {
            const emoji = el.dataset.emoji;
            reactToMessage(activeMsgID, emoji);
            closeOverlay('msgOptionsOverlay');
        });
    });

    // Copy
    document.getElementById('optCopy')?.addEventListener('click', async () => {
        const snap = await get(ref(db, `chats/${chatID}/messages/${activeMsgID}`));
        const msg  = snap.val();
        if (msg?.text) {
            try { await navigator.clipboard.writeText(msg.text); showToast('📋 Copied!'); }
            catch { showToast('❌ Could not copy'); }
        }
        closeOverlay('msgOptionsOverlay');
    });

    // Unsend (everyone)
    document.getElementById('optUnsend')?.addEventListener('click', async () => {
        closeOverlay('msgOptionsOverlay');
        if (!activeMsgMine) { showToast('⛔ Can only unsend your own messages'); return; }
        try {
            await update(ref(db, `chats/${chatID}/messages/${activeMsgID}`), {
                deleted:    true,
                deletedFor: 'everyone',
                text:       '',
                imageURL:   '',
            });
            showToast('🔴 Message unsent');
        } catch(e) { showToast('❌ Failed'); }
    });

    // Delete for me
    document.getElementById('optDeleteForMe')?.addEventListener('click', async () => {
        closeOverlay('msgOptionsOverlay');
        try {
            await update(ref(db, `chats/${chatID}/messages/${activeMsgID}/deletedFor`), {
                [myUID]: true
            });
            showToast('🗑️ Deleted for you');
        } catch(e) { showToast('❌ Failed'); }
    });
}

function openMsgOptions(msgID, msg, isMine) {
    activeMsgID   = msgID;
    activeMsgMine = isMine;

    // Show/hide unsend based on ownership
    const unsendBtn = document.getElementById('optUnsend');
    if (unsendBtn) unsendBtn.style.display = isMine ? 'flex' : 'none';

    // Hide copy for stickers/images
    const copyBtn = document.getElementById('optCopy');
    if (copyBtn) copyBtn.style.display = (msg.type === 'text') ? 'flex' : 'none';

    openOverlay('msgOptionsOverlay');
}

// ── REACT TO MESSAGE ───────────────────────────────────────────────────────
async function reactToMessage(msgID, emoji) {
    if (!msgID) return;
    try {
        await set(ref(db, `chats/${chatID}/messages/${msgID}/reactions/${myUID}`), emoji);
    } catch(e) { showToast('❌ Failed to react'); }
}

// ── MENU SETUP ─────────────────────────────────────────────────────────────
function setupMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const popup   = document.getElementById('popupMenu');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        popup?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!popup?.contains(e.target) && e.target !== menuBtn) {
            popup?.classList.remove('open');
        }
    });

    // Search
    document.getElementById('menuSearch')?.addEventListener('click', () => {
        popup?.classList.remove('open');
        document.getElementById('searchOverlay')?.classList.add('open');
        document.getElementById('searchMsgInput')?.focus();
    });

    // Background
    document.getElementById('menuBg')?.addEventListener('click', () => {
        popup?.classList.remove('open');
        openOverlay('bgPickerOverlay');
    });

    // Mute
    document.getElementById('menuMute')?.addEventListener('click', () => {
        popup?.classList.remove('open');
        showToast('🔕 Coming soon!');
    });

    // Block/Unblock
    document.getElementById('menuBlock')?.addEventListener('click', async () => {
        popup?.classList.remove('open');
        const snap = await get(ref(db, `users/${myUID}/blocked/${targetUID}`));
        if (snap.exists()) {
            await remove(ref(db, `users/${myUID}/blocked/${targetUID}`));
            showToast('✅ User unblocked');
            updateBlockLabel();
        } else {
            await set(ref(db, `users/${myUID}/blocked/${targetUID}`), true);
            showToast('🚫 User blocked');
            updateBlockLabel();
            setTimeout(() => window.location.href = 'messages.html', 1500);
        }
    });

    // Delete chat
    document.getElementById('menuDelete')?.addEventListener('click', async () => {
        popup?.classList.remove('open');
        try {
            await update(ref(db, `chats/${chatID}/meta/${myUID}`), { deleted: true });
            showToast('🗑️ Chat deleted');
            setTimeout(() => window.location.href = 'messages.html', 1000);
        } catch(e) { showToast('❌ Failed'); }
    });
}

// ── CALL BUTTONS ───────────────────────────────────────────────────────────
function setupCallButtons() {
    document.getElementById('callBtn')?.addEventListener('click',  () => showToast('📞 Voice call coming soon!'));
    document.getElementById('videoBtn')?.addEventListener('click', () => showToast('📹 Video call coming soon!'));
}

// ── SEARCH IN CHAT ─────────────────────────────────────────────────────────
function setupSearch() {
    const input    = document.getElementById('searchMsgInput');
    const results  = document.getElementById('searchResults');
    const cancelBtn = document.getElementById('searchCancel');

    cancelBtn?.addEventListener('click', () => {
        document.getElementById('searchOverlay')?.classList.remove('open');
        if (input) input.value = '';
        if (results) results.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--sub);font-size:13px;">Type to search messages</div>';
    });

    input?.addEventListener('input', async function() {
        const q = this.value.trim().toLowerCase();
        if (!q) {
            results.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--sub);font-size:13px;">Type to search messages</div>';
            return;
        }

        const snap = await get(ref(db, `chats/${chatID}/messages`));
        if (!snap.exists()) { results.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub);">No messages found</div>'; return; }

        let found = '';
        snap.forEach(child => {
            const msg = child.val();
            if (msg.type !== 'text' || !msg.text) return;
            if (!msg.text.toLowerCase().includes(q)) return;
            const isMine = msg.from === myUID;
            found += `
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
                    <div style="font-size:11px;color:var(--sub);margin-bottom:4px;">${isMine ? 'You' : esc(targetData.username)} · ${formatTime(msg.time)}</div>
                    <div style="font-size:14px;font-weight:600;">${esc(msg.text).replace(new RegExp(q,'gi'), m => `<mark style="background:rgba(0,242,255,0.2);color:var(--accent);border-radius:3px;">${m}</mark>`)}</div>
                </div>`;
        });

        results.innerHTML = found || '<div style="text-align:center;padding:40px;color:var(--sub);">No results found</div>';
    });
}

// ── BACKGROUND PICKER ──────────────────────────────────────────────────────
function setupBgPicker() {
    const grid = document.getElementById('bgPickerGrid');

    // Mark current selected
    updateBgSelected();

    grid?.addEventListener('click', (e) => {
        const opt = e.target.closest('.bg-option');
        if (!opt) return;
        const bg = opt.dataset.bg;

        if (bg === 'custom') {
            // Open file picker
            const fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = 'image/*';
            fileInput.onchange = async (ev) => {
                const file = ev.target.files[0];
                if (!file) return;
                showToast('⬆️ Uploading...');
                const url = await uploadToCloudinary(file);
                if (url) {
                    customBgURL = url;
                    applyBackground('custom');
                    updateBgSelected();
                    saveBgToFirebase('custom', url);
                    closeOverlay('bgPickerOverlay');
                }
            };
            fileInput.click();
            return;
        }

        applyBackground(bg);
        saveBgToFirebase(bg, null);
        updateBgSelected();
        closeOverlay('bgPickerOverlay');
    });

    // Dim slider
    document.getElementById('dimSlider')?.addEventListener('input', function() {
        customDim = this.value / 100;
        const overlay = document.querySelector('.bg-custom-overlay');
        if (overlay) overlay.style.background = `rgba(0,0,0,${customDim})`;
        saveBgToFirebase('custom', customBgURL);
    });
}

function applyBackground(bg) {
    currentBg = bg;
    const bgEl = document.getElementById('chatBg');
    if (!bgEl) return;

    bgEl.innerHTML = '';
    bgEl.removeAttribute('style');

    // Remove all bg- classes
    const toRemove = [...bgEl.classList].filter(c => c.startsWith('bg-'));
    toRemove.forEach(c => bgEl.classList.remove(c));

    if (bg === 'custom' && customBgURL) {
        bgEl.classList.add('bg-custom');
        bgEl.style.backgroundImage    = `url(${customBgURL})`;
        bgEl.style.backgroundSize     = 'cover';
        bgEl.style.backgroundPosition = 'center';
        const overlay = document.createElement('div');
        overlay.className = 'bg-custom-overlay';
        overlay.style.background = `rgba(0,0,0,${customDim})`;
        bgEl.appendChild(overlay);
        document.getElementById('dimSliderWrap').style.display = 'block';
    } else {
        // Only black or white
        const safeBg = (bg === 'white') ? 'white' : 'black';
        bgEl.classList.add(`bg-${safeBg}`);
        document.getElementById('dimSliderWrap').style.display = 'none';
        // Apply light/dark mode to body based on bg
        document.body.classList.toggle('light-mode', safeBg === 'white');
    }
}

function loadBackground() {
    const themeRef = ref(db, `chats/${chatID}/theme`);
    // Use onValue so BOTH users see the change in real time when either sets it
    onValue(themeRef, (snap) => {
        if (!snap.exists()) {
            applyBackground('black');
            updateBgSelected();
            return;
        }
        const data = snap.val();
        currentBg  = data.theme || 'black';
        customDim  = data.opacity ?? 0.5;

        if (data.type === 'custom' && data.imageURL) {
            customBgURL = data.imageURL;
            const slider = document.getElementById('dimSlider');
            if (slider) slider.value = customDim * 100;
        } else {
            customBgURL = null;
        }

        applyBackground(currentBg);
        updateBgSelected();
    });
}

function injectAnimatedElements(bg, container) {
    if (bg === 'starfall') {
        for (let i = 0; i < 30; i++) {
            const s = document.createElement('div');
            s.className = 'star';
            const size = Math.random() * 3 + 1;
            s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;animation-duration:${Math.random()*4+3}s;animation-delay:${Math.random()*5}s;opacity:${Math.random()*.8+.2};`;
            container.appendChild(s);
        }
    } else if (bg === 'wave') {
        for (let i = 0; i < 3; i++) {
            const w = document.createElement('div');
            w.className = 'wave-el';
            w.style.cssText = `animation-duration:${4+i*2}s;animation-delay:${i*1.5}s;opacity:${0.3-i*0.08};`;
            container.appendChild(w);
        }
    } else if (bg === 'particles') {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random()*6+2;
            const colors = ['rgba(0,242,255,', 'rgba(167,139,250,', 'rgba(245,200,66,'];
            const color = colors[Math.floor(Math.random()*colors.length)];
            p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;background:${color}0.4);animation-duration:${Math.random()*3+2}s;animation-delay:${Math.random()*3}s;`;
            container.appendChild(p);
        }
    } else if (bg === 'snow') {
        for (let i = 0; i < 25; i++) {
            const s = document.createElement('div');
            s.className = 'snowflake';
            s.textContent = '❄';
            s.style.cssText = `left:${Math.random()*100}%;font-size:${Math.random()*10+8}px;animation-duration:${Math.random()*5+5}s;animation-delay:${Math.random()*5}s;opacity:${Math.random()*.6+.2};`;
            container.appendChild(s);
        }
    } else if (bg === 'petalfall') {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'petal';
            p.textContent = ['🌸','🌺','🌹'][Math.floor(Math.random()*3)];
            p.style.cssText = `left:${Math.random()*100}%;font-size:${Math.random()*10+10}px;animation-duration:${Math.random()*6+6}s;animation-delay:${Math.random()*6}s;`;
            container.appendChild(p);
        }
    }
}

function updateBgSelected() {
    document.querySelectorAll('.bg-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.bg === currentBg);
    });
}

async function saveBgToFirebase(theme, imageURL) {
    try {
        // Save to shared chat node — both users see the same theme
        await update(ref(db, `chats/${chatID}/theme`), {
            type:      theme === 'custom' ? 'custom' : 'preset',
            theme,
            imageURL:  imageURL || null,
            opacity:   customDim,
            setBy:     myUID,
            setAt:     Date.now()
        });
    } catch(e) { console.error('saveBg error:', e); }
}

// ── PAGE VISIBILITY — update presence when user switches tabs ────────────
document.addEventListener('visibilitychange', async () => {
    if (!myUID) return;
    const presenceRef = ref(db, `users/${myUID}`);
    if (document.hidden) {
        await update(presenceRef, { isOnline: false, lastSeen: Date.now() });
    } else {
        await update(presenceRef, { isOnline: true, lastSeen: Date.now() });
    }
});

// ── BEFORE UNLOAD — best-effort sync presence ─────────────────────────────
window.addEventListener('beforeunload', () => {
    if (!myUID) return;
    // Use sendBeacon for reliability on page close
    const url = `https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app/users/${myUID}.json`;
    const blob = new Blob([JSON.stringify({ isOnline: false, lastSeen: Date.now() })], { type: 'application/json' });
    navigator.sendBeacon(url + '?x-http-method-override=PATCH', blob);
});


