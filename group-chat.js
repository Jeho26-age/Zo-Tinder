import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
    getDatabase, ref, get, set, push, onValue, remove, update, serverTimestamp, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ══ FIREBASE CONFIG ══════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain: "zo-tinder.firebaseapp.com",
    databaseURL: "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zo-tinder",
    storageBucket: "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId: "1:866061631708:web:f2c70a3989032095803419"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ══ CLOUDINARY CONFIG ════════════════════════════
const CLOUDINARY_CLOUD = "duj2rx73z";
const CLOUDINARY_PRESET = "Zo-Tinder";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`;

// ══ GROUP ID ═════════════════════════════════════
const _params             = new URLSearchParams(window.location.search);
const GROUP_ID            = _params.get('id')   || 'official_global';
const GROUP_NAME_FROM_URL = decodeURIComponent(_params.get('name') || '');

// Set header immediately so it never shows wrong name
(function initHeader() {
    const isOfficial = GROUP_ID === 'official_global';
    const name = isOfficial ? 'Zo-Tinder Official' : (GROUP_NAME_FROM_URL || 'Group Chat');
    const nameEl = document.getElementById('groupName');
    if (nameEl) nameEl.childNodes[0].textContent = name + ' ';
    const badge = document.getElementById('officialBadge');
    if (badge) badge.style.display = isOfficial ? '' : 'none';
    const label = document.getElementById('officialLabel');
    if (label) label.style.display = isOfficial ? '' : 'none';
    const avEl = document.getElementById('groupAv');
    if (avEl) avEl.textContent = isOfficial ? '🔥' : '💬';
    document.title = name + ' | Zo-Tinder';
})();

// ══ OWNER UID ════════════════════════════════════
// Your account is always treated as owner — no Firebase role needed
const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";

// ══ EMOJI DATA ═══════════════════════════════════
const EMOJIS = {
    recent: ['😂','❤️','🔥','😭','✨','🥺','😍','🙏','💀','😊','🤣','💕','🥰','😅','👀','😩','💯','🙄','😤','🤔'],
    faces:  ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','☺️','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
    hands:  ['👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','💪'],
    nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🦆','🦅','🦉','🦇','🐺','🦄','🐝','🦋','🐌','🐞','🐜','🐢','🦎','🐍','🐲','🦕','🦈','🐊','🐅','🐆','🦏','🦒','🦓','🦍','🦧','🐘'],
    food:   ['🍕','🍔','🌭','🍟','🌮','🌯','🥙','🥚','🍳','🥘','🍲','🍱','🍣','🍜','🍝','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹'],
    travel: ['🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🚌','🏍️','🛵','🚲','✈️','🚁','🛸','🌍','🌎','🌏','🗺️','🏔️','🌋','🏕️','🏖️','🏜️','🏝️','🏛️','🗼','🗽','⛩️','🎡','🎢','🎠'],
    activity:['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🥊','🥋','🎿','⛷️','🏂','🏋️','🤸','🏆','🥇','🥈','🥉','🎖️','🎭','🎨','🎬','🎤','🎧','🎮','🎲','🎯'],
};

const ZO_STICKERS = [
    {em:'🔥',l:'Hot'},{em:'❤️‍🔥',l:'Love'},{em:'💀',l:'Dead'},{em:'✨',l:'Vibe'},
    {em:'🫂',l:'Hug'},{em:'🥺',l:'Plead'},{em:'😈',l:'Devil'},{em:'🤙',l:'Chill'},
    {em:'💅',l:'Slay'},{em:'🙈',l:'Shy'},{em:'🫦',l:'Sus'},{em:'🌙',l:'Night'}
];

// ══ STATE ════════════════════════════════════════
let currentUser     = null;
let currentUserData = null;
let currentUserRole = "member"; // app-wide role: owner | admin | mod | member
let currentGroupRole = "member"; // group-specific role: groupAdmin | groupMod | member
let isReadMode      = false;
let isPrivate       = false;
let notifOn         = true;
let replyingTo      = null;
let currentMsgTarget = null;
let currentMsgType   = null;
let currentMsgKey    = null;
let activeTrayTab    = 'emoji';
let activeEmojiCat   = 'recent';
let longPressTimer   = null;
let postType         = 'post';
let selectedRoleOpt  = 'mod';
let selectedAdminOpt = 'promote';
let selectedBanDur   = '1h';
let currentMemberTarget = null; // { name, role, uid }
let isRecording      = false;
let toastTimer       = null;

// ══ INIT ═════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;

    // Load user data + role
    const snap = await get(ref(db, `users/${user.uid}`));
    if (snap.exists()) {
        currentUserData = snap.val();
        // Owner UID is always treated as owner
        if (user.uid === OWNER_UID) {
            currentUserRole = 'owner';
            await set(ref(db, `users/${user.uid}/role`), 'owner');
        } else {
            currentUserRole = currentUserData.role || 'member';
        }
    }

    // Block kicked/left members from re-entering (official group is always open)
    if (GROUP_ID !== 'official_global') {
        const kickedSnap = await get(ref(db, `groups/${GROUP_ID}/kicked/${user.uid}`));
        const leftSnap   = await get(ref(db, `groups/${GROUP_ID}/left/${user.uid}`));
        if (kickedSnap.exists() || leftSnap.exists()) {
            // Show blocked screen and stop
            document.body.innerHTML = `
                <div style="height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
                            background:#080808;color:white;font-family:'Nunito',sans-serif;gap:16px;padding:24px;text-align:center;">
                    <div style="font-size:3rem;">${kickedSnap.exists() ? '🚫' : '🚪'}</div>
                    <div style="font-size:1.1rem;font-weight:900;">${kickedSnap.exists() ? 'You were removed from this group' : 'You left this group'}</div>
                    <div style="font-size:13px;color:#555;">You can no longer access this group.</div>
                    <button onclick="window.location.href='group.html'"
                        style="margin-top:8px;padding:12px 28px;background:#ff3e1d;border:none;border-radius:14px;
                               color:white;font-weight:900;font-size:14px;cursor:pointer;">← Go Back</button>
                </div>`;
            return;
        }

        // Check mute status
        if (GROUP_ID !== 'official_global') {
            const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${user.uid}`));
            if (muteSnap.exists()) {
                const muteData = muteSnap.val();
                if (muteData.until && muteData.until > Date.now()) {
                    // Still muted
                    const inputArea = document.getElementById('inputArea');
                    if (inputArea) inputArea.style.display = 'none';
                    const readBanner = document.getElementById('readModeBanner');
                    if (readBanner) {
                        readBanner.textContent = `🔇 You are muted until ${new Date(muteData.until).toLocaleString()}`;
                        readBanner.classList.add('show');
                    }
                } else {
                    // Mute expired — remove it
                    await remove(ref(db, `groups/${GROUP_ID}/muted/${user.uid}`));
                }
            }
        }

        // Load group-specific role
        const groupRoleSnap = await get(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`));
        if (groupRoleSnap.exists()) {
            currentGroupRole = groupRoleSnap.val();
        }

        // Check if user is the group creator (auto groupAdmin)
        const groupMetaSnap = await get(ref(db, `groups/${GROUP_ID}/createdBy`));
        if (groupMetaSnap.exists() && groupMetaSnap.val() === user.uid) {
            currentGroupRole = 'groupAdmin';
            await set(ref(db, `groups/${GROUP_ID}/roles/${user.uid}`), 'groupAdmin');
        }
    }

    // Auto join group
    const memberRef = ref(db, `users/${user.uid}/groups/${GROUP_ID}`);
    const memberSnap = await get(memberRef);
    if (!memberSnap.exists()) await set(memberRef, true);

    // Load group meta (member count, pinned etc)
    loadGroupMeta();

    // Listen to messages realtime
    listenMessages();

    // Build waveform
    buildWaveform('wv1');

    // Init swipe to reply
    initSwipeToReply();

    // Load real members and posts from Firebase
    loadMembers();
    listenPosts();

    // Typing simulator (demo)
    setTimeout(() => {
        const ti = document.getElementById('typingIndicator');
        if (ti) { ti.classList.add('show'); setTimeout(() => ti.classList.remove('show'), 3000); }
    }, 2000);
});

// ══ LOAD GROUP META ══════════════════════════════
async function loadGroupMeta() {
    try {
        // Member count
        const usersSnap = await get(ref(db, 'users'));
        let count = 0;
        if (usersSnap.exists()) {
            usersSnap.forEach(u => { if (u.val()?.groups?.[GROUP_ID]) count++; });
        }
        const mcEl = document.getElementById('memberCount');
        if (mcEl) mcEl.textContent = count;

        // Pinned message
        const pinnedSnap = await get(ref(db, `groups/${GROUP_ID}/pinned`));
        if (pinnedSnap.exists()) {
            const pt = document.getElementById('pinnedText');
            if (pt) pt.textContent = pinnedSnap.val();
        }

        // Group meta — name, avatar, readMode, isPrivate
        const metaSnap = await get(ref(db, `groups/${GROUP_ID}`));

        if (GROUP_ID === 'official_global') {
            setHeader('Zo-Tinder Official', '🔥', '#1a0a0a', true);
            prefillEditModal('Zo-Tinder Official', 'The official Zo-Tinder community 🔥');
        } else if (metaSnap.exists()) {
            const meta = metaSnap.val();
            const name   = meta.name   || GROUP_NAME_FROM_URL || 'Group Chat';
            const avatar = meta.avatarURL || meta.emoji || '💬';
            const bg     = meta.avatarBg  || '#1a1a1a';
            setHeader(name, avatar, bg, false);
            prefillEditModal(name, meta.description || '');
            if (meta.readMode) {
                isReadMode = true;
                document.getElementById('readModeToggle')?.classList.add('on');
                document.getElementById('readModeBanner')?.classList.add('show');
                if (!canSendMessage()) document.getElementById('inputArea').style.display = 'none';
            }
            if (meta.isPrivate) {
                isPrivate = true;
                document.getElementById('privateToggle')?.classList.add('on');
            }
        }
    } catch(e) { console.error('loadGroupMeta error:', e); }
}

function setHeader(name, avatarOrEmoji, bg, isOfficial) {
    const nameEl = document.getElementById('groupName');
    if (nameEl) nameEl.childNodes[0].textContent = name + ' ';
    const badge = document.getElementById('officialBadge');
    if (badge) badge.style.display = isOfficial ? '' : 'none';
    const label = document.getElementById('officialLabel');
    if (label) label.style.display = isOfficial ? '' : 'none';
    const avEl = document.getElementById('groupAv');
    if (avEl) {
        avEl.style.background = bg;
        if (avatarOrEmoji && avatarOrEmoji.startsWith('http')) {
            avEl.innerHTML = `<img src="${avatarOrEmoji}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
        } else {
            avEl.textContent = avatarOrEmoji || '💬';
        }
    }
    document.title = name + ' | Zo-Tinder';
}

function prefillEditModal(name, desc) {
    const n = document.getElementById('editGroupName');
    const d = document.getElementById('editGroupDesc');
    if (n) n.value = name;
    if (d) d.value = desc;
}

// ══ MESSAGES — REALTIME LISTENER ═════════════════
function listenMessages() {
    const msgsRef = query(ref(db, `messages/${GROUP_ID}`), orderByChild('timestamp'), limitToLast(50));
    onValue(msgsRef, (snap) => {
        if (!snap.exists()) return;
        const area = document.getElementById('messagesArea');
        if (!area) return;

        // Clear demo messages on first load
        if (!area.dataset.loaded) {
            area.innerHTML = `<div class="date-divider"><span>Today</span></div>`;
            area.dataset.loaded = '1';
        }

        // Render any new messages not yet in DOM
        snap.forEach(child => {
            const key  = child.key;
            const msg  = child.val();
            if (document.getElementById('msg-' + key)) return; // already rendered
            renderMessage(key, msg, area);
        });

        scrollBottom();
    });
}

// ══ RENDER A SINGLE MESSAGE ═══════════════════════
function renderMessage(key, msg, container) {
    const isOwn = msg.uid === currentUser?.uid;
    const role  = msg.senderRole || 'member';

    const row = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'own' : 'other'}`;
    row.id = 'msg-' + key;
    row.dataset.sender = msg.senderName || '';
    row.dataset.msg    = msg.text || '';
    row.dataset.key    = key;

    const roleBadgeHTML = getRoleBadgeHTML(role);

    // Reply preview
    let replyHTML = '';
    if (msg.replyTo) {
        replyHTML = `<div class="reply-preview"><strong>${esc(msg.replyTo.name)}</strong>${esc(msg.replyTo.text)}</div>`;
    }

    // Avatar (only for others)
    const initial = (msg.senderName || '?')[0].toUpperCase();
    const avatarHTML = isOwn ? '' : `
        <div class="msg-av" style="background:${msg.avatarBg || '#1a1030'};color:${msg.avatarColor || '#a78bfa'};"
             onclick="window.showUserProfile('${esc(msg.senderName)}','','','${initial}','${msg.avatarBg || '#1a1030'}','${role}','${msg.photoURL || ''}')">
             ${msg.photoURL ? `<img src="${msg.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : initial}
        </div>`;

    // Sender name row (only for others)
    const senderHTML = isOwn ? '' : `<div class="msg-sender" style="color:${msg.avatarColor || '#a78bfa'};">${esc(msg.senderName)} ${roleBadgeHTML}</div>`;

    // Bubble content
    let bubbleContent = '';
    if (msg.type === 'image') {
        bubbleContent = `<div class="bubble ${isOwn ? 'own' : 'other'} img-bubble"
            oncontextmenu="window.openMsgMenu(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchstart="window.startMsgPress(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()">
            <img src="${msg.mediaURL}" alt="image">
        </div>`;
    } else if (msg.type === 'sticker') {
        bubbleContent = `<div style="font-size:3rem;margin-bottom:2px;">${msg.text}</div>`;
    } else {
        bubbleContent = `<div class="bubble ${isOwn ? 'own' : 'other'}"
            oncontextmenu="window.openMsgMenu(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchstart="window.startMsgPress(event,this,'${isOwn ? 'own' : 'other'}','${key}')"
            ontouchend="window.clearMsgPress()" ontouchmove="window.clearMsgPress()">
            ${replyHTML}${esc(msg.text || '')}
        </div>`;
    }

    const time = msg.timestamp ? timeAgo(msg.timestamp) : 'just now';
    const timeHTML = `<div class="msg-time ${isOwn ? 'own' : ''}">${time}${isOwn ? ' ✓✓' : ''}</div>`;

    row.innerHTML = `
        <div class="msg-inner">
            ${avatarHTML}
            <div class="msg-col">
                ${senderHTML}
                ${bubbleContent}
                ${timeHTML}
            </div>
        </div>
        <div class="swipe-reply-icon">↩️</div>
    `;

    container.appendChild(row);

    // Attach swipe to this row
    attachSwipe(row);
}

// ══ SEND MESSAGE ══════════════════════════════════
async function sendMsg() {
    const input = document.getElementById('msgInput');
    const text  = input.value.trim();
    if (!text || !currentUser) return;
    if (isReadMode && !canSendMessage()) { showToast('📢 Only admins can send messages'); return; }

    // Check mute status
    if (GROUP_ID !== 'official_global') {
        const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
        if (muteSnap.exists() && muteSnap.val().until > Date.now()) {
            const until = new Date(muteSnap.val().until).toLocaleString();
            showToast(`🔇 You are muted until ${until}`);
            return;
        }
    }

    // Effective display role: app staff role > group role > member
    const effectiveRole = ['owner','admin','mod'].includes(currentUserRole) 
        ? currentUserRole 
        : (currentGroupRole !== 'member' ? currentGroupRole : 'member');
    const avatarColor = roleColor(effectiveRole);

    const msgData = {
        uid:         currentUser.uid,
        senderName:  currentUserData?.username || 'User',
        senderRole:  effectiveRole,
        avatarBg:    '#1a1030',
        avatarColor: avatarColor,
        photoURL:    currentUserData?.photoURL || '',
        text:        text,
        type:        'text',
        timestamp:   Date.now(),
    };

    if (replyingTo) {
        msgData.replyTo = { name: replyingTo.name, text: replyingTo.text };
    }

    try {
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        // Update group last message
        await update(ref(db, `groups/${GROUP_ID}`), {
            lastMessage:   text,
            lastSender:    currentUserData?.username || 'User',
            lastMessageAt: Date.now(),
        });
    } catch(e) { showToast('❌ Failed to send'); return; }

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').style.display = 'none';
    document.getElementById('voiceBtn').style.display = 'flex';
    closeReply();
    closeStickerTray();
    scrollBottom();
}
window.sendMsg = sendMsg;

// ══ SEND STICKER / EMOJI ══════════════════════════
async function sendSticker(em) {
    if (!currentUser) return;
    if (isReadMode && !canSendMessage()) { showToast('📢 Only admins can send messages'); return; }
    // Check mute
    if (GROUP_ID !== 'official_global') {
        const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${currentUser.uid}`));
        if (muteSnap.exists() && muteSnap.val().until > Date.now()) {
            showToast('🔇 You are muted'); return;
        }
    }
    closeStickerTray();
    const msgData = {
        uid:        currentUser.uid,
        senderName: currentUserData?.username || 'User',
        senderRole: currentUserRole,
        text:       em,
        type:       'sticker',
        timestamp:  Date.now(),
        avatarBg:   '#1a1030',
        avatarColor: roleColor(currentUserRole),
        photoURL:   currentUserData?.photoURL || '',
    };
    try { await push(ref(db, `messages/${GROUP_ID}`), msgData); } catch(e) {}
}
window.sendSticker = sendSticker;

// ══ SEND IMAGE (Cloudinary) ═══════════════════════
async function uploadAndSendMedia(file) {
    showToast('📤 Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.secure_url) { showToast('❌ Upload failed'); return; }

        const msgData = {
            uid:        currentUser.uid,
            senderName: currentUserData?.username || 'User',
            senderRole: currentUserRole,
            text:       '',
            type:       'image',
            mediaURL:   data.secure_url,
            timestamp:  Date.now(),
            avatarBg:   '#1a1030',
            avatarColor: roleColor(currentUserRole),
            photoURL:   currentUserData?.photoURL || '',
        };
        await push(ref(db, `messages/${GROUP_ID}`), msgData);
        showToast('✅ Image sent!');
    } catch(e) { showToast('❌ Upload error'); }
}

// ══ SWIPE TO REPLY ════════════════════════════════
function initSwipeToReply() {
    document.querySelectorAll('.msg-row').forEach(row => attachSwipe(row));
}

function attachSwipe(row) {
    const inner = row.querySelector('.msg-inner');
    const icon  = row.querySelector('.swipe-reply-icon');
    if (!inner || !icon) return;

    let startX = 0, startY = 0, swiping = false, triggered = false;
    const isOwn = row.classList.contains('own');
    const threshold = 60;

    row.addEventListener('touchstart', (e) => {
        startX   = e.touches[0].clientX;
        startY   = e.touches[0].clientY;
        swiping  = false;
        triggered = false;
        inner.style.transition = 'none';
    }, { passive: true });

    row.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        if (!swiping && Math.abs(dy) > Math.abs(dx)) return; // vertical scroll
        swiping = true;

        // Only allow swipe in correct direction
        const validSwipe = isOwn ? dx > 0 : dx < 0;
        if (!validSwipe) return;

        const move = Math.min(Math.abs(dx), threshold + 10);
        inner.style.transform = isOwn ? `translateX(${move}px)` : `translateX(-${move}px)`;

        if (Math.abs(dx) >= threshold && !triggered) {
            triggered = true;
            icon.classList.add('visible');
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }, { passive: true });

    row.addEventListener('touchend', () => {
        inner.style.transition = 'transform 0.2s ease';
        inner.style.transform  = '';
        icon.classList.remove('visible');

        if (triggered) {
            const sender = row.dataset.sender || 'User';
            const msg    = row.dataset.msg    || '';
            openReply(sender, msg);
        }
        swiping = triggered = false;
    });
}
window.initSwipeToReply = initSwipeToReply;

// ══ REPLY ════════════════════════════════════════
function openReply(name, text) {
    replyingTo = { name, text };
    document.getElementById('replyName').textContent = name;
    document.getElementById('replyText').textContent = text.substring(0, 60);
    document.getElementById('replyBar').classList.add('show');
    document.getElementById('msgInput').focus();
}
window.openReply = openReply;

function closeReply() {
    replyingTo = null;
    document.getElementById('replyBar').classList.remove('show');
}
window.closeReply = closeReply;

// ══ MESSAGE MENU ══════════════════════════════════
function openMsgMenu(e, el, type, key) {
    if (e) e.preventDefault();
    clearTimeout(longPressTimer);
    currentMsgTarget = el;
    currentMsgType   = type;
    currentMsgKey    = key || null;

    const isOwn      = type === 'own';
    const canDel     = isOwn || canModerate();
    const canKickOpt = !isOwn && canAdmin(); // only group admin+ can kick from message menu
    const canPin     = canPinMsg();

    document.getElementById('msgDeleteOpt').style.display = canDel    ? '' : 'none';
    document.getElementById('msgKickOpt').style.display   = canKickOpt ? '' : 'none';

    // Show/hide pin based on permissions
    const pinOpt = document.querySelector('.sheet-option[onclick*="pin"]');
    if (pinOpt) pinOpt.style.display = canPin ? '' : 'none';

    document.getElementById('msgMenuOverlay').classList.add('show');
}
window.openMsgMenu = openMsgMenu;

function closeMsgMenu() { document.getElementById('msgMenuOverlay').classList.remove('show'); }
window.closeMsgMenu = closeMsgMenu;

function startMsgPress(e, el, type, key) { longPressTimer = setTimeout(() => openMsgMenu(e, el, type, key), 500); }
window.startMsgPress = startMsgPress;

function clearMsgPress() { clearTimeout(longPressTimer); }
window.clearMsgPress = clearMsgPress;

async function doMsgAction(action) {
    closeMsgMenu();
    if (action === 'react') { openReactPicker(); return; }
    if (action === 'reply') {
        const text   = currentMsgTarget?.innerText?.trim() || '';
        const row    = currentMsgTarget?.closest('.msg-row');
        const name   = currentMsgType === 'own' ? 'You' : (row?.dataset.sender || 'User');
        openReply(name, text); return;
    }
    if (action === 'copy') {
        navigator.clipboard?.writeText(currentMsgTarget?.innerText?.trim() || '');
        showToast('📋 Copied!');
    }
    if (action === 'pin') {
        const text = (currentMsgTarget?.innerText?.trim() || '').substring(0, 80);
        document.getElementById('pinnedText').textContent = text;
        if (canModerate()) await set(ref(db, `groups/${GROUP_ID}/pinned`), text);
        showToast('📌 Message pinned!');
    }
    if (action === 'delete') {
        currentMsgTarget?.closest('.msg-row')?.remove();
        if (currentMsgKey) {
            try { await remove(ref(db, `messages/${GROUP_ID}/${currentMsgKey}`)); } catch(e) {}
        }
        showToast('🗑️ Deleted');
    }
    if (action === 'kick') { showToast('🚫 User removed from group'); }
}
window.doMsgAction = doMsgAction;

// ══ REACT PICKER ══════════════════════════════════
function openReactPicker() {
    document.getElementById('reactOverlay').classList.add('show');
    setTimeout(() => {
        const b = document.getElementById('reactBox');
        b.style.transform = 'scale(1)'; b.style.opacity = '1';
    }, 10);
}
window.openReactPicker = openReactPicker;

function closeReactPicker() {
    document.getElementById('reactOverlay').classList.remove('show');
    const b = document.getElementById('reactBox');
    b.style.transform = 'scale(0.88)'; b.style.opacity = '0';
}
window.closeReactPicker = closeReactPicker;

function pickReact(emoji) {
    closeReactPicker();
    if (currentMsgTarget) {
        const col = currentMsgTarget.closest('.msg-col');
        let r = col?.querySelector('.msg-reactions');
        if (!r) { r = document.createElement('div'); r.className = 'msg-reactions'; currentMsgTarget.after(r); }
        const p = document.createElement('span');
        p.className = 'react-pill own-react';
        p.textContent = emoji + ' 1';
        p.onclick = function() { toggleReact(this); };
        r.appendChild(p);
    }
    showToast(emoji + ' Reaction added!');
}
window.pickReact = pickReact;

function toggleReact(pill) { pill.classList.toggle('own-react'); }
window.toggleReact = toggleReact;

// ══ SETTINGS ══════════════════════════════════════
function openSettings() {
    const isOfficial = GROUP_ID === 'official_global';

    // Leave Group — hide in official group
    const leaveBtn = document.getElementById('leaveGroupBtn');
    const leaveDivider = document.getElementById('leaveGroupDivider');
    if (leaveBtn)     leaveBtn.style.display     = isOfficial ? 'none' : '';
    if (leaveDivider) leaveDivider.style.display = isOfficial ? 'none' : '';

    // Admin-only options — only show to group admin or app staff
    const adminOpts = document.getElementById('settingsAdminSection');
    if (adminOpts) adminOpts.style.display = canAdmin() ? '' : 'none';

    // Delete group — show to group admin or app staff
    const delBtn = document.getElementById('deleteGroupBtn');
    if (delBtn) delBtn.style.display = (!isOfficial && canDisbandGroup()) ? '' : 'none';

    document.getElementById('settingsOverlay').classList.add('show');
}
window.openSettings = openSettings;

function closeSettings() { document.getElementById('settingsOverlay').classList.remove('show'); }
window.closeSettings = closeSettings;

async function toggleReadMode() {
    if (!canAdmin()) { showToast('⛔ Admins only'); return; }
    isReadMode = !isReadMode;
    document.getElementById('readModeToggle').classList.toggle('on', isReadMode);
    document.getElementById('readModeBanner').classList.toggle('show', isReadMode);
    document.getElementById('inputArea').style.display = (isReadMode && !canSendMessage()) ? 'none' : '';
    await update(ref(db, `groups/${GROUP_ID}`), { readMode: isReadMode });
    showToast(isReadMode ? '📢 Announcement mode ON' : '💬 Chat mode ON');
}
window.toggleReadMode = toggleReadMode;

async function togglePrivate() {
    if (!canAdmin()) { showToast('⛔ Admins only'); return; }
    isPrivate = !isPrivate;
    document.getElementById('privateToggle').classList.toggle('on', isPrivate);
    await update(ref(db, `groups/${GROUP_ID}`), { isPrivate });
    showToast(isPrivate ? '🔒 Group is now private' : '🌐 Group is now public');
}
window.togglePrivate = togglePrivate;

function toggleNotif() {
    notifOn = !notifOn;
    document.getElementById('notifToggle').classList.toggle('on', notifOn);
    showToast(notifOn ? '🔔 Notifications ON' : '🔕 Notifications OFF');
}
window.toggleNotif = toggleNotif;

function editGroupInfo() { closeSettings(); document.getElementById('editGroupOverlay').classList.add('show'); }
window.editGroupInfo = editGroupInfo;

function closeEditGroup(e) {
    if (!e || e.target.id === 'editGroupOverlay') document.getElementById('editGroupOverlay').classList.remove('show');
}
window.closeEditGroup = closeEditGroup;

async function saveGroupEdit() {
    if (!canAdmin()) { showToast('⛔ Admins only'); return; }
    const name = document.getElementById('editGroupName').value.trim();
    const desc = document.getElementById('editGroupDesc').value.trim();
    if (!name) { showToast('⚠️ Name cannot be empty'); return; }
    setHeader(name, null, null, GROUP_ID === 'official_global');
    await update(ref(db, `groups/${GROUP_ID}`), { name, description: desc });
    closeEditGroup();
    showToast('✅ Group updated!');
}
window.saveGroupEdit = saveGroupEdit;

async function changeGroupAvatar() {
    if (!canAdmin()) { showToast('⛔ Admins only'); return; }
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        showToast('⬆️ Uploading avatar...'); closeSettings();
        try {
            const fd = new FormData();
            fd.append('file', file); fd.append('upload_preset', CLOUDINARY_PRESET); fd.append('folder', 'group-avatars');
            const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.secure_url) { showToast('❌ Upload failed'); return; }
            await update(ref(db, `groups/${GROUP_ID}`), { avatarURL: data.secure_url });
            setHeader(null, data.secure_url, '#1a1a1a', GROUP_ID === 'official_global');
            showToast('✅ Avatar updated!');
        } catch(err) { showToast('❌ Upload failed'); }
    };
    input.click();
}
window.changeGroupAvatar = changeGroupAvatar;

// clearChat removed — no deleteGroup either
// ── CLEAR CHAT (admin/owner only) ─────────────────
async function clearChat() {
    if (!canAdmin()) { showToast('⛔ Admins only'); return; }
    closeSettings();
    const confirmed = confirm('Clear all messages for everyone? This cannot be undone.');
    if (!confirmed) return;
    try {
        await remove(ref(db, `messages/${GROUP_ID}`));
        document.getElementById('messagesArea').innerHTML =
            '<div class="date-divider"><span>Today</span></div>';
        showToast('🗑️ Chat cleared');
    } catch(e) {
        console.error('clearChat error:', e);
        showToast('❌ Failed to clear chat');
    }
}
window.clearChat = clearChat;

// ══ DELETE GROUP ══════════════════════════════════
async function deleteGroup() {
    if (!canDisbandGroup()) { showToast('⛔ Group Admin only'); return; }
    if (GROUP_ID === 'official_global') { showToast('⛔ Cannot delete official group'); return; }
    closeSettings();
    const confirmed = confirm('Delete this group permanently? All messages and data will be lost. This cannot be undone.');
    if (!confirmed) return;
    try {
        await Promise.all([
            remove(ref(db, `groups/${GROUP_ID}`)),
            remove(ref(db, `messages/${GROUP_ID}`)),
            remove(ref(db, `posts/${GROUP_ID}`)),
        ]);
        // Remove from all members' group lists
        const usersSnap = await get(ref(db, 'users'));
        if (usersSnap.exists()) {
            const ops = [];
            usersSnap.forEach(child => {
                if (child.val()?.groups?.[GROUP_ID]) {
                    ops.push(remove(ref(db, `users/${child.key}/groups/${GROUP_ID}`)));
                }
            });
            await Promise.all(ops);
        }
        showToast('🗑️ Group deleted');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed to delete group'); }
}
window.deleteGroup = deleteGroup;

// ══ LEAVE GROUP (member initiated) ══════════════
async function leaveGroup() {
    if (GROUP_ID === 'official_global') { showToast('⛔ You cannot leave the official group'); return; }
    closeSettings();
    const confirmed = confirm('Leave this group? You will not be able to rejoin.');
    if (!confirmed) return;

    try {
        await Promise.all([
            // Mark as left (blocks re-entry)
            set(ref(db, `groups/${GROUP_ID}/left/${currentUser.uid}`), { at: Date.now() }),
            // Remove from user's group list
            remove(ref(db, `users/${currentUser.uid}/groups/${GROUP_ID}`)),
            // Remove from group members
            remove(ref(db, `groups/${GROUP_ID}/members/${currentUser.uid}`)),
            // Remove any group role
            remove(ref(db, `groups/${GROUP_ID}/roles/${currentUser.uid}`)),
        ]);
        showToast('🚪 You left the group');
        setTimeout(() => { window.location.href = 'group.html'; }, 800);
    } catch(e) { showToast('❌ Failed to leave group'); }
}
window.leaveGroup = leaveGroup;

// ══ ASSIGN ROLE ═══════════════════════════════════
function openAssignRole() {
    closeSettings();
    document.getElementById('assignRoleOverlay').classList.add('show');
}
window.openAssignRole = openAssignRole;

function closeAssignRole(e) {
    if (!e || e.target.id === 'assignRoleOverlay') document.getElementById('assignRoleOverlay').classList.remove('show');
}
window.closeAssignRole = closeAssignRole;

function selectRoleOpt(opt) {
    selectedRoleOpt = opt;
    document.getElementById('roleOpt-mod').classList.remove('selected', 'selected-mod');
    document.getElementById('roleOpt-member').classList.remove('selected', 'selected-mod');
    document.getElementById(`roleOpt-${opt}`).classList.add(opt === 'mod' ? 'selected-mod' : 'selected');
}
window.selectRoleOpt = selectRoleOpt;

async function confirmAssignRole() {
    if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
    const name = document.getElementById('roleTargetName').value.trim();
    if (!name) { showToast('⚠️ Enter a member name'); return; }

    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }

    // Roles stored per-group
    const newRole = selectedRoleOpt === 'mod' ? 'groupMod' : 'member';
    await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), newRole);
    closeAssignRole();
    showToast(newRole === 'groupMod' ? `🔰 ${name} is now a Group Moderator!` : `👤 ${name} role removed`);
    loadMembers();
}
window.confirmAssignRole = confirmAssignRole;

// ══ MAKE / REMOVE ADMIN ═══════════════════════════
function openPromoteAdmin() {
    closeSettings();
    document.getElementById('promoteAdminOverlay').classList.add('show');
}
window.openPromoteAdmin = openPromoteAdmin;

function closePromoteAdmin(e) {
    if (!e || e.target.id === 'promoteAdminOverlay') document.getElementById('promoteAdminOverlay').classList.remove('show');
}
window.closePromoteAdmin = closePromoteAdmin;

function selectAdminOpt(opt) {
    selectedAdminOpt = opt;
    document.getElementById('adminOpt-promote').classList.remove('selected');
    document.getElementById('adminOpt-demote').classList.remove('selected');
    document.getElementById(`adminOpt-${opt}`).classList.add('selected');
}
window.selectAdminOpt = selectAdminOpt;

async function confirmAdminAction() {
    if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
    const name = document.getElementById('adminTargetName').value.trim();
    if (!name) { showToast('⚠️ Enter a member name'); return; }

    const uid = await findUidByUsername(name);
    if (!uid) { showToast('❌ User not found'); return; }
    if (uid === OWNER_UID) { showToast('⛔ Cannot change App Owner'); return; }

    const newRole = selectedAdminOpt === 'promote' ? 'groupAdmin' : 'member';
    await set(ref(db, `groups/${GROUP_ID}/roles/${uid}`), newRole);
    closePromoteAdmin();
    showToast(newRole === 'groupAdmin' ? `🏠 ${name} is now Group Admin!` : `👤 ${name} removed as Group Admin`);
    loadMembers();
}
window.confirmAdminAction = confirmAdminAction;

// ══ MEMBER OPTIONS ════════════════════════════════
function openMemberOptions(e, name, appRole, groupRole, uid) {
    e.stopPropagation();
    currentMemberTarget = { name, appRole: appRole||'member', groupRole: groupRole||'member', uid: uid||null };

    document.getElementById('memberOptName').textContent = name;

    const targetIsAppStaff = ['owner','admin','mod'].includes(appRole);
    const targetIsGroupAdmin = groupRole === 'groupAdmin';
    const targetIsGroupMod   = groupRole === 'groupMod';
    const targetIsSelf       = uid === currentUser?.uid;

    // Cannot manage app staff or self
    const canManage = !targetIsAppStaff && !targetIsSelf && (uid !== OWNER_UID);

    // Admin actions section (groupAdmin or appStaff can see)
    document.getElementById('adminActionsSection').style.display = canAdmin() && canManage ? '' : 'none';

    // Make/Remove group admin — only groupAdmin or appStaff
    document.getElementById('optMakeAdmin').style.display   = (!targetIsGroupAdmin && canAdmin() && canManage) ? '' : 'none';
    document.getElementById('optRemoveAdmin').style.display = (targetIsGroupAdmin && canAdmin() && canManage)  ? '' : 'none';

    // Make/Remove group mod — groupAdmin or appStaff, target must not already be groupAdmin
    document.getElementById('optAssignMod').style.display   = (!targetIsGroupMod && !targetIsGroupAdmin && canAdmin() && canManage) ? '' : 'none';
    document.getElementById('optRemoveMod').style.display   = (targetIsGroupMod && canAdmin() && canManage)  ? '' : 'none';

    // Moderation section (groupMod+ or appStaff can see)
    document.getElementById('modActionsSection').style.display = (canModerate() && canManage) ? '' : 'none';

    document.getElementById('memberOptOverlay').classList.add('show');
}
window.openMemberOptions = openMemberOptions;

function closeMemberOpts() { document.getElementById('memberOptOverlay').classList.remove('show'); }
window.closeMemberOpts = closeMemberOpts;

async function memberAction(action) {
    closeMemberOpts();
    const name     = currentMemberTarget?.name || 'User';
    const targetUid = currentMemberTarget?.uid || await findUidByUsername(name);

    if (action === 'profile') { window.location.href = 'user-view.html'; return; }

    // Protect app owner from any action
    if (targetUid === OWNER_UID && action !== 'profile') { showToast('⛔ Cannot act on App Owner'); return; }

    if (action === 'makeAdmin') {
        // groupAdmin can promote to groupMod/groupAdmin; appStaff also
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        if (targetUid) await set(ref(db, `groups/${GROUP_ID}/roles/${targetUid}`), 'groupAdmin');
        showToast(`🏠 ${name} is now Group Admin!`);
        loadMembers();
    }
    if (action === 'removeAdmin') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        if (targetUid) await set(ref(db, `groups/${GROUP_ID}/roles/${targetUid}`), 'member');
        showToast(`👤 ${name} removed as Group Admin`);
        loadMembers();
    }
    if (action === 'assignMod') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        if (targetUid) await set(ref(db, `groups/${GROUP_ID}/roles/${targetUid}`), 'groupMod');
        showToast(`🔰 ${name} is now a Group Moderator!`);
        loadMembers();
    }
    if (action === 'removeMod') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        // Group mod cannot lift mute done by group admin — and cannot remove groupAdmin mods
        if (targetUid) await set(ref(db, `groups/${GROUP_ID}/roles/${targetUid}`), 'member');
        showToast(`👤 ${name} role removed`);
        loadMembers();
    }
    if (action === 'mute') {
        openMuteMember();
        return;
    }
    if (action === 'unmute') {
        if (!canModerate()) { showToast('⛔ Moderators only'); return; }
        if (targetUid) {
            const muteSnap = await get(ref(db, `groups/${GROUP_ID}/muted/${targetUid}`));
            if (muteSnap.exists()) {
                const muteData = muteSnap.val();
                // Group mod cannot lift mute done by group admin (or app staff)
                const mutedBySnap = await get(ref(db, `groups/${GROUP_ID}/roles/${muteData.by}`));
                const mutedByRole = mutedBySnap.exists() ? mutedBySnap.val() : 'member';
                if (currentGroupRole === 'groupMod' && !isAppStaff()) {
                    if (mutedByRole === 'groupAdmin' || ['owner','admin','mod'].includes(muteData.byAppRole || '')) {
                        showToast('⛔ Cannot lift mute set by Admin'); return;
                    }
                }
            }
            await remove(ref(db, `groups/${GROUP_ID}/muted/${targetUid}`));
            showToast(`🔊 ${name} unmuted`);
        }
        return;
    }
    if (action === 'warn')   { showToast(`⚠️ Warning sent to ${name}`); return; }
    if (action === 'kick') {
        if (!canAdmin()) { showToast('⛔ Group Admin only'); return; }
        if (!targetUid) { showToast('❌ User not found'); return; }
        if (targetUid === OWNER_UID) { showToast('⛔ Cannot kick App Owner'); return; }
        // Check if target is app staff — group admin cannot kick app staff
        const targetAppRole = currentMemberTarget?.appRole || 'member';
        if (['owner','admin','mod'].includes(targetAppRole) && !isAppStaff()) {
            showToast('⛔ Cannot kick App Staff'); return;
        }
        try {
            await Promise.all([
                set(ref(db, `groups/${GROUP_ID}/kicked/${targetUid}`), { by: currentUser.uid, at: Date.now() }),
                remove(ref(db, `users/${targetUid}/groups/${GROUP_ID}`)),
                remove(ref(db, `groups/${GROUP_ID}/members/${targetUid}`)),
                remove(ref(db, `groups/${GROUP_ID}/roles/${targetUid}`)),
            ]);
            showToast(`🚫 ${name} removed from group`);
            loadMembers();
        } catch(e) { showToast('❌ Failed to kick'); }
        return;
    }
}
window.memberAction = memberAction;

// ══ MUTE MEMBER ═══════════════════════════════════
let muteDurations = [
  { label:'5 min', ms: 5*60*1000 },
  { label:'1 Hour', ms: 60*60*1000 },
  { label:'6 Hours', ms: 6*60*60*1000 },
  { label:'1 Day', ms: 24*60*60*1000 },
  { label:'3 Days', ms: 3*24*60*60*1000 },
  { label:'7 Days', ms: 7*24*60*60*1000 },
];
let selectedMuteDur = 60*60*1000; // 1 hour default

function openMuteMember() {
    if (!canModerate()) { showToast('⛔ Moderators only'); return; }
    const name = currentMemberTarget?.name || 'User';
    document.getElementById('muteTargetName').textContent = name;
    // Reset selection
    document.querySelectorAll('.mute-dur-btn').forEach((b,i) => b.classList.toggle('selected', i===1));
    selectedMuteDur = 60*60*1000;
    document.getElementById('muteMemberOverlay').classList.add('show');
}
window.openMuteMember = openMuteMember;

function closeMuteMember(e) {
    if (!e || e.target.id === 'muteMemberOverlay') document.getElementById('muteMemberOverlay').classList.remove('show');
}
window.closeMuteMember = closeMuteMember;

function selectMuteDur(btn, ms) {
    document.querySelectorAll('.mute-dur-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMuteDur = ms;
}
window.selectMuteDur = selectMuteDur;

async function confirmMuteMember() {
    if (!canModerate()) { showToast('⛔ Moderators only'); return; }
    const name = currentMemberTarget?.name || 'User';
    const targetUid = currentMemberTarget?.uid || await findUidByUsername(name);
    if (!targetUid) { showToast('❌ User not found'); return; }

    const targetAppRole = currentMemberTarget?.appRole || 'member';
    if (['owner','admin','mod'].includes(targetAppRole) && !isAppStaff()) {
        showToast('⛔ Cannot mute App Staff'); return;
    }

    const until = Date.now() + selectedMuteDur;
    await set(ref(db, `groups/${GROUP_ID}/muted/${targetUid}`), {
        until,
        by: currentUser.uid,
        byAppRole: currentUserRole,
        byGroupRole: currentGroupRole,
        at: Date.now()
    });
    document.getElementById('muteMemberOverlay').classList.remove('show');
    const dur = muteDurations.find(d => d.ms === selectedMuteDur)?.label || 'some time';
    showToast(`🔇 ${name} muted for ${dur}`);
}
window.confirmMuteMember = confirmMuteMember;
function openTempBan() {
    closeMemberOpts();
    document.getElementById('banTargetName').textContent = currentMemberTarget?.name || 'this user';
    // Reset duration selection
    document.querySelectorAll('.ban-dur-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('.ban-dur-btn')?.classList.add('selected');
    selectedBanDur = '1h';
    document.getElementById('banReason').value = '';
    document.getElementById('tempBanOverlay').classList.add('show');
}
window.openTempBan = openTempBan;

function closeTempBan(e) {
    if (!e || e.target.id === 'tempBanOverlay') document.getElementById('tempBanOverlay').classList.remove('show');
}
window.closeTempBan = closeTempBan;

function selectBanDur(btn, dur) {
    document.querySelectorAll('.ban-dur-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedBanDur = dur;
}
window.selectBanDur = selectBanDur;

async function confirmTempBan() {
    if (!canModerate()) { showToast('⛔ Moderators only'); return; }
    const name   = currentMemberTarget?.name || 'User';
    const reason = document.getElementById('banReason').value.trim();
    const uid    = currentMemberTarget?.uid || await findUidByUsername(name);

    // Group mods/admins can temp-mute in group but app-level bans require app staff
    if (!isAppStaff()) {
        showToast('⛔ App Staff only for temp ban. Use Mute instead.');
        closeTempBan(); return;
    }

    const durMap = { '1h':3600000, '6h':21600000, '1d':86400000, '3d':259200000, '7d':604800000 };
    const banUntil = Date.now() + (durMap[selectedBanDur] || 3600000);

    if (uid) {
        await update(ref(db, `users/${uid}`), {
            banned: true,
            banUntil,
            banReason: reason || 'Violation of community rules',
            bannedBy:  currentUser.uid,
        });
    }

    closeTempBan();
    showToast(`⏱️ ${name} temp banned for ${selectedBanDur}${reason ? ' · ' + reason : ''}`);
}
window.confirmTempBan = confirmTempBan;

// ══ CREATE POST ════════════════════════════════════
function openCreatePost(type = 'post') {
    postType = type;
    const titles = { post:'Create Post', poll:'Create Poll', event:'Create Event', announce:'Announcement' };
    document.getElementById('createPostTitle').textContent = titles[type] || 'Create Post';
    document.getElementById('pollOptions').style.display  = type === 'poll'  ? '' : 'none';
    document.getElementById('eventFields').style.display  = type === 'event' ? '' : 'none';
    document.getElementById('createPostOverlay').classList.add('show');
}
window.openCreatePost = openCreatePost;

function closeCreatePost(e) {
    if (!e || e.target.id === 'createPostOverlay') {
        document.getElementById('createPostOverlay').classList.remove('show');
        document.getElementById('postContent').value = '';
    }
}
window.closeCreatePost = closeCreatePost;

async function submitPost() {
    const c = document.getElementById('postContent').value.trim();
    if (!c && postType !== 'event') { showToast('⚠️ Write something first'); return; }

    const postData = {
        senderUid:  currentUser.uid,
        senderName: currentUserData?.username || 'User',
        senderRole: currentUserRole,
        photoURL:   currentUserData?.photoURL || '',
        text:       c,
        type:       postType,
        timestamp:  Date.now(),
        likes:      0,
    };

    if (postType === 'poll') {
        const opts = [
            document.getElementById('pollOpt1')?.value.trim(),
            document.getElementById('pollOpt2')?.value.trim(),
            document.getElementById('pollOpt3')?.value.trim(),
        ].filter(Boolean);
        if (opts.length < 2) { showToast('⚠️ Add at least 2 options'); return; }
        postData.options = opts;
    }

    if (postType === 'event') {
        postData.eventTitle = document.getElementById('eventTitle')?.value.trim();
        postData.eventLoc   = document.getElementById('eventLoc')?.value.trim();
        postData.eventDate  = document.getElementById('eventDate')?.value.trim();
    }

    try {
        await push(ref(db, `posts/${GROUP_ID}`), postData);
        closeCreatePost();
        showToast('🚀 Post published!');
    } catch(e) {
        showToast('❌ Failed to post');
    }
}
window.submitPost = submitPost;

function likePost(btn) {
    btn.classList.toggle('liked');
    const s = btn.querySelector('span');
    if (s) { const n = parseInt(s.textContent) || 0; s.textContent = btn.classList.contains('liked') ? n+1 : Math.max(n-1,0); }
}
window.likePost = likePost;

function votePoll(opt) {
    document.querySelectorAll('.poll-option').forEach(o => o.classList.remove('voted'));
    opt.classList.add('voted');
    showToast('✅ Vote recorded!');
}
window.votePoll = votePoll;

function joinEvent(btn) {
    const going = btn.textContent === 'Join';
    btn.textContent = going ? '✓ Going' : 'Join';
    showToast(going ? "✅ You're going!" : '❌ Cancelled RSVP');
}
window.joinEvent = joinEvent;

// ══ STICKER TRAY ══════════════════════════════════
function toggleSticker() {
    const tray = document.getElementById('stickerTray');
    const bd   = document.getElementById('trayBackdrop');
    if (tray.classList.contains('show')) { closeStickerTray(); }
    else { tray.classList.add('show'); bd.classList.add('show'); renderTray('emoji'); }
}
window.toggleSticker = toggleSticker;

function closeStickerTray() {
    document.getElementById('stickerTray').classList.remove('show');
    document.getElementById('trayBackdrop').classList.remove('show');
}
window.closeStickerTray = closeStickerTray;

function switchTray(tab) {
    document.querySelectorAll('.tray-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tt-' + tab).classList.add('active');
    activeTrayTab = tab;
    document.getElementById('traySearch').classList.toggle('show', tab === 'gif');
    renderTray(tab);
}
window.switchTray = switchTray;

function renderTray(tab) {
    const body = document.getElementById('trayBody');
    body.innerHTML = '';
    if (tab === 'emoji') {
        const cats = document.createElement('div'); cats.className = 'emoji-cats';
        [{ key:'recent',icon:'🕐' },{ key:'faces',icon:'😀' },{ key:'hearts',icon:'❤️' },
         { key:'hands',icon:'👍' },{ key:'nature',icon:'🐶' },{ key:'food',icon:'🍕' },
         { key:'travel',icon:'✈️' },{ key:'activity',icon:'⚽' }].forEach(c => {
            const el = document.createElement('div');
            el.className = 'emoji-cat' + (activeEmojiCat === c.key ? ' active' : '');
            el.textContent = c.icon;
            el.onclick = () => {
                activeEmojiCat = c.key;
                document.querySelectorAll('.emoji-cat').forEach(x => x.classList.remove('active'));
                el.classList.add('active');
                renderEmojiGrid(body, EMOJIS[c.key] || []);
            };
            cats.appendChild(el);
        });
        body.appendChild(cats);
        renderEmojiGrid(body, EMOJIS[activeEmojiCat] || EMOJIS.recent);
    } else if (tab === 'stickers') {
        const grid = document.createElement('div'); grid.className = 'sticker-grid';
        ZO_STICKERS.forEach(s => {
            const item = document.createElement('div'); item.className = 'sticker-item';
            item.textContent = s.em; item.onclick = () => sendSticker(s.em); grid.appendChild(item);
        });
        body.appendChild(grid);
    } else if (tab === 'gif') {
        renderGifs(body, '');
    } else if (tab === 'mine') {
        const grid = document.createElement('div'); grid.className = 'sticker-grid';
        const add  = document.createElement('div'); add.className = 'add-sticker-btn';
        add.innerHTML = '➕<span>Add Sticker</span>'; add.onclick = () => showToast('🖼️ Upload sticker coming soon!');
        grid.appendChild(add);
        body.appendChild(grid);
        const e = document.createElement('div'); e.className = 'tray-empty';
        e.innerHTML = '<div style="font-size:2rem;margin-bottom:8px;">🎭</div><p>No custom stickers yet.<br>Tap + to add!</p>';
        body.appendChild(e);
    }
}

function renderEmojiGrid(container, emojis) {
    let g = container.querySelector('.emoji-grid'); if (g) g.remove();
    g = document.createElement('div'); g.className = 'emoji-grid';
    emojis.forEach(em => {
        const i = document.createElement('div'); i.className = 'emoji-item';
        i.textContent = em; i.onclick = () => sendEmojiToInput(em); g.appendChild(i);
    });
    container.appendChild(g);
}

function renderGifs(container, q) {
    container.innerHTML = '';
    const grid = document.createElement('div'); grid.className = 'gif-grid';
    ['🎬','🌊','🔥','😂','✨','💫','🎉','🌙','❤️','🚀','🌸','🎵'].forEach(p => {
        const item = document.createElement('div'); item.className = 'gif-item'; item.textContent = p;
        item.style.fontSize = '2.5rem';
        item.onclick = () => { sendSticker(p); showToast('🎬 Connect Giphy API for real GIFs!'); };
        grid.appendChild(item);
    });
    container.appendChild(grid);
    const note = document.createElement('div'); note.className = 'tray-empty';
    note.innerHTML = '<p style="color:#333;font-size:11px;">Connect Giphy API in group-chat.js for real GIFs 🎬</p>';
    container.appendChild(note);
}

function searchGif(q) { renderGifs(document.getElementById('trayBody'), q); }
window.searchGif = searchGif;

function sendEmojiToInput(em) {
    const i = document.getElementById('msgInput'); i.value += em; onInput(i); i.focus();
}

// ══ ATTACH ════════════════════════════════════════
function openAttach() { document.getElementById('attachOverlay').classList.add('show'); }
window.openAttach = openAttach;

function closeAttach() { document.getElementById('attachOverlay').classList.remove('show'); }
window.closeAttach = closeAttach;

function attachAction(type) {
    closeAttach();
    if (type === 'sticker') { toggleSticker(); switchTray('stickers'); return; }
    if (type === 'image' || type === 'camera') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        if (type === 'camera') input.capture = 'environment';
        input.onchange = async (e) => { if (e.target.files[0]) await uploadAndSendMedia(e.target.files[0]); };
        input.click(); return;
    }
    if (type === 'video') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'video/*';
        input.onchange = async (e) => { if (e.target.files[0]) await uploadAndSendMedia(e.target.files[0]); };
        input.click(); return;
    }
    showToast('📎 Coming soon!');
}
window.attachAction = attachAction;

// ══ VOICE RECORDING — coming soon ════════════════
function startRecording() { showToast('🎤 Voice messages coming soon!'); }
window.startRecording = startRecording;
function stopRecording() {}
window.stopRecording = stopRecording;
function playVoice(btn) { showToast('🎤 Voice messages coming soon!'); }
window.playVoice = playVoice;

// ══ USER PROFILE POPUP ════════════════════════════
function showUserProfile(name, age, location, initial, bg, role, photoURL) {
    const avEl = document.getElementById('ppAv');
    avEl.style.background = bg;
    if (photoURL) {
        avEl.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`;
    } else {
        avEl.textContent = initial;
    }
    document.getElementById('ppName').textContent = name;
    document.getElementById('ppMeta').textContent = [age, location].filter(Boolean).join(' · ');
    const badgeEl = document.getElementById('ppRoleBadge');
    if (badgeEl) badgeEl.innerHTML = getRoleBadgeHTML(role, true);
    document.getElementById('profilePopupOverlay').classList.add('show');
}
window.showUserProfile = showUserProfile;

function closeProfilePopup() { document.getElementById('profilePopupOverlay').classList.remove('show'); }
window.closeProfilePopup = closeProfilePopup;

function followUser() { closeProfilePopup(); showToast('✅ Following!'); }
window.followUser = followUser;

function viewProfile() { closeProfilePopup(); window.location.href = 'user-view.html'; }
window.viewProfile = viewProfile;

// ══ MEMBERS FILTER ════════════════════════════════
function filterMembers(q) {
    document.querySelectorAll('.member-row').forEach(r => {
        const name = r.querySelector('.member-name')?.textContent || '';
        r.style.display = name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
}
window.filterMembers = filterMembers;

// ══ TABS ══════════════════════════════════════════
function switchTab(t) {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    document.getElementById('tab-' + t).classList.add('active');
    document.getElementById('content-' + t).classList.add('active');
    closeStickerTray();
}
window.switchTab = switchTab;

// ══ INPUT ════════════════════════════════════════
function onInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    const has = el.value.trim().length > 0;
    document.getElementById('sendBtn').style.display  = has ? 'flex' : 'none';
    document.getElementById('voiceBtn').style.display = has ? 'none' : 'flex';
}
window.onInput = onInput;

// ══ MISC ══════════════════════════════════════════
function scrollBottom() {
    const a = document.getElementById('messagesArea');
    if (a) setTimeout(() => { a.scrollTop = a.scrollHeight; }, 50);
}

function scrollToPinned() { showToast('📌 Scrolled to pinned message'); }
window.scrollToPinned = scrollToPinned;

function goBack() { window.location.href = 'group.html'; }
window.goBack = goBack;

function buildWaveform(id) {
    const el = document.getElementById(id); if (!el) return;
    [4,8,14,10,18,12,20,16,8,12,16,10,14,8,6,12,18,10,14,8].forEach(h => {
        const b = document.createElement('div'); b.className = 'waveform-bar'; b.style.height = h + 'px'; el.appendChild(b);
    });
}

// ══ ROLE HELPERS ══════════════════════════════════
// App-wide staff: bypass everything
function isAppStaff()   { return ['owner','admin','mod'].includes(currentUserRole); }
function isOwner()      { return currentUserRole === 'owner'; }
function isAppAdmin()   { return ['owner','admin'].includes(currentUserRole); }
function isAppMod()     { return currentUserRole === 'mod'; }

// Group-level checks (also passed by app staff)
function isGroupAdmin() { return currentGroupRole === 'groupAdmin' || isAppStaff(); }
function isGroupMod()   { return ['groupAdmin','groupMod'].includes(currentGroupRole) || isAppStaff(); }

// canAdmin = can perform group admin actions (group admin OR app staff)
function canAdmin()     { return isGroupAdmin(); }
// canModerate = can moderate the group (group mod+ OR app staff)
function canModerate()  { return isGroupMod(); }
// Legacy aliases
function canManageGroup()   { return canAdmin(); }
function canModerateGroup() { return canModerate(); }

// Can send message: always allowed unless read mode AND not admin/mod/app staff
function canSendMessage() {
    if (!isReadMode) return true;
    return isGroupAdmin() || isAppStaff();
}

// Can delete messages: own messages always; others' messages require moderation power
function canDeleteMsg(isOwn) { return isOwn || canModerate(); }

// Can pin messages: group mod+ or app staff
function canPinMsg() { return canModerate(); }

// Can kick: group admin+ or app staff
function canKick() { return canAdmin(); }

// Can disband group: group admin, app staff
function canDisbandGroup() { return isGroupAdmin() || isAppStaff(); }

function roleColor(role) {
    const map = { owner:'#ffd700', admin:'#ff3e1d', mod:'#a78bfa', groupAdmin:'#ff9500', groupMod:'#7bc8f8', member:'#a78bfa' };
    return map[role] || '#a78bfa';
}

function getRoleBadgeHTML(role, large = false) {
    const size = large ? 'font-size:11px;padding:4px 10px;' : '';
    if (role === 'owner')      return `<span class="sender-role-badge owner" style="${size}">👑 Owner</span>`;
    if (role === 'admin')      return `<span class="sender-role-badge admin" style="${size}">⚙️ App Admin</span>`;
    if (role === 'mod')        return `<span class="sender-role-badge mod" style="${size}">🛡️ App Mod</span>`;
    if (role === 'groupAdmin') return `<span class="sender-role-badge admin" style="background:rgba(255,149,0,0.15);color:#ff9500;${size}">🏠 Admin</span>`;
    if (role === 'groupMod')   return `<span class="sender-role-badge mod" style="background:rgba(123,200,248,0.15);color:#7bc8f8;${size}">🔰 Mod</span>`;
    return '';
}

// ══ FIND USER BY USERNAME ════════════════════════
async function findUidByUsername(username) {
    try {
        const snap = await get(ref(db, 'users'));
        if (!snap.exists()) return null;
        let found = null;
        snap.forEach(child => {
            if ((child.val()?.username || '').toLowerCase() === username.toLowerCase()) {
                found = child.key;
            }
        });
        return found;
    } catch(e) { return null; }
}

// ══ TOAST ════════════════════════════════════════
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
window.showToast = showToast;

// ══ HELPERS ══════════════════════════════════════
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function timeAgo(timestamp) {
    const diff  = Date.now() - timestamp;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Now';
    if (mins < 60)  return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    return `${days}d`;
}

// ══ SCROLL TO BOTTOM ON LOAD ══════════════════════
window.addEventListener('load', () => scrollBottom());

// ══ LOAD MEMBERS FROM FIREBASE ═══════════════════
async function loadMembers() {
    const list = document.getElementById('membersList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">Loading members...</div>';

    try {
        const [usersSnap, groupRolesSnap, kickedSnap] = await Promise.all([
            get(ref(db, 'users')),
            get(ref(db, `groups/${GROUP_ID}/roles`)),
            get(ref(db, `groups/${GROUP_ID}/kicked`))
        ]);

        if (!usersSnap.exists()) { list.innerHTML = ''; return; }

        const groupRoles = groupRolesSnap.exists() ? groupRolesSnap.val() : {};
        const kicked     = kickedSnap.exists() ? kickedSnap.val() : {};

        // Determine buckets: owner (app), admin (app), mod (app), groupAdmin, groupMod, member
        const buckets = { owner:[], appAdmin:[], appMod:[], groupAdmin:[], groupMod:[], member:[] };
        let onlineCount = 0;

        usersSnap.forEach(child => {
            const u = child.val();
            const uid = child.key;
            if (!u?.groups?.[GROUP_ID]) return; // not in this group
            if (kicked[uid]) return; // kicked — skip
            const appRole   = (uid === OWNER_UID) ? 'owner' : (u.role || 'member');
            const groupRole = groupRoles[uid] || 'member';
            if (u.isOnline) onlineCount++;

            // Determine display bucket
            let bucket;
            if (appRole === 'owner')  bucket = 'owner';
            else if (appRole === 'admin') bucket = 'appAdmin';
            else if (appRole === 'mod')   bucket = 'appMod';
            else if (groupRole === 'groupAdmin') bucket = 'groupAdmin';
            else if (groupRole === 'groupMod')   bucket = 'groupMod';
            else bucket = 'member';

            buckets[bucket].push({ uid, ...u, appRole, groupRole });
        });

        // Update online count
        const oc = document.getElementById('onlineCount');
        if (oc) oc.textContent = onlineCount;

        list.innerHTML = '';

        const sectionDefs = [
            { key:'owner',      label:'👑 App Owner' },
            { key:'appAdmin',   label:'⚙️ App Admins' },
            { key:'appMod',     label:'🛡️ App Moderators' },
            { key:'groupAdmin', label:'🏠 Group Admin' },
            { key:'groupMod',   label:'🔰 Group Moderators' },
            { key:'member',     label:'👤 Members' },
        ];

        sectionDefs.forEach(({ key, label }) => {
            if (!buckets[key].length) return;

            const sectionLabel = document.createElement('div');
            sectionLabel.className = 'members-section-label';
            sectionLabel.style.marginTop = key !== 'owner' ? '14px' : '';
            sectionLabel.textContent = label;
            list.appendChild(sectionLabel);

            buckets[key].forEach(u => {
                const initial = (u.username || '?')[0].toUpperCase();
                // Display role badge: app role takes priority
                const displayRole = u.appRole !== 'member' ? u.appRole : u.groupRole;
                const roleClass = { owner:'role-owner', admin:'role-admin', mod:'role-mod', groupAdmin:'role-admin', groupMod:'role-mod', member:'' }[displayRole] || '';
                const roleBadge = displayRole !== 'member'
                    ? `<span class="member-role ${roleClass}">${getRoleBadgeHTML(displayRole)}</span>` : '';
                const onlineDot = u.isOnline ? '<div class="member-online-dot"></div>' : '';
                const isOwnerRow = u.uid === OWNER_UID;

                const row = document.createElement('div');
                row.className = 'member-row';
                row.dataset.uid = u.uid;
                row.dataset.name = u.username || 'User';
                row.dataset.appRole = u.appRole;
                row.dataset.groupRole = u.groupRole;
                row.innerHTML = `
                    <div class="member-av" style="background:${isOwnerRow ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : '#1a1030'};color:#fff;">
                        ${u.photoURL ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : initial}
                        ${onlineDot}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${esc(u.username || 'User')} ${roleBadge}</div>
                        <div class="member-sub">${esc(u.khaw || '')}${u.age ? ' · ' + u.age : ''}</div>
                    </div>
                    <div class="member-more" id="more-${u.uid}">⋯</div>
                `;
                row.querySelector('.member-av').onclick = () =>
                    showUserProfile(u.username, u.age, u.khaw, initial, '#1a1030', displayRole, u.photoURL || '');
                row.querySelector(`#more-${u.uid}`).onclick = (e) => {
                    e.stopPropagation();
                    openMemberOptions(e, u.username, u.appRole, u.groupRole, u.uid);
                };
                list.appendChild(row);
            });
        });

        if (list.children.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;font-size:13px;">No members yet</div>';
        }
    } catch(e) {
        console.error('loadMembers error:', e);
        list.innerHTML = '<div style="padding:20px;text-align:center;color:#444;">Failed to load members</div>';
    }
}
window.loadMembers = loadMembers;

// ══ LOAD POSTS FROM FIREBASE ══════════════════════
function listenPosts() {
    const postsRef = query(ref(db, `posts/${GROUP_ID}`), orderByChild('timestamp'), limitToLast(30));
    onValue(postsRef, (snap) => {
        const area = document.getElementById('postsArea');
        if (!area) return;

        // Remove old post cards, keep create-post UI
        area.querySelectorAll('.post-card').forEach(c => c.remove());

        if (!snap.exists()) return;

        const posts = [];
        snap.forEach(child => posts.push({ key: child.key, ...child.val() }));
        posts.reverse(); // newest first

        posts.forEach(post => {
            const card = buildPostCard(post);
            area.appendChild(card);
        });
    });
}

function buildPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = 'post-' + post.key;

    const initial    = (post.senderName || '?')[0].toUpperCase();
    const roleBadge  = getRoleBadgeHTML(post.senderRole || 'member');
    const timeStr    = post.timestamp ? timeAgo(post.timestamp) : '';
    const badgeMap   = { post:'', poll:'<span class="post-badge badge-poll">📊 POLL</span>', event:'<span class="post-badge badge-event">📅 EVENT</span>', announce:'<span class="post-badge badge-announce">📢 ANNOUNCE</span>' };
    const typeBadge  = badgeMap[post.type] || '';

    // Body content
    let bodyHTML = `<div class="post-text">${esc(post.text || '')}</div>`;

    if (post.type === 'poll' && post.options) {
        const total = Object.values(post.votes || {}).length || 1;
        bodyHTML += post.options.map((opt, i) => {
            const votes = Object.values(post.votes || {}).filter(v => v === i).length;
            const pct   = Math.round((votes / total) * 100);
            return `<div class="poll-option" onclick="votePoll(this)">
                <div class="poll-bar" style="width:${pct}%"></div>
                <div class="poll-label"><span>${esc(opt)}</span><span class="poll-pct">${pct}%</span></div>
            </div>`;
        }).join('');
    }

    if (post.type === 'event' && post.eventTitle) {
        const [month, day] = post.eventDate ? post.eventDate.split(' ') : ['', ''];
        bodyHTML += `<div class="event-card">
            <div class="event-date-box"><div class="event-month">${esc(month)}</div><div class="event-day">${esc(day)}</div></div>
            <div class="event-info"><div class="event-title">${esc(post.eventTitle)}</div><div class="event-sub">📍 ${esc(post.eventLoc || '')}</div></div>
            <div class="event-join" onclick="joinEvent(this)">Join</div>
        </div>`;
    }

    const avatarStyle = post.senderUid === OWNER_UID
        ? 'background:linear-gradient(135deg,var(--accent),var(--accent2));'
        : 'background:#1a1030;color:#a78bfa;';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-av" style="${avatarStyle}">
                ${post.photoURL ? `<img src="${post.photoURL}" style="width:100%;height:100%;object-fit:cover;">` : initial}
            </div>
            <div class="post-meta">
                <div class="post-author">${esc(post.senderName || 'User')} ${roleBadge}</div>
                <div class="post-time">${timeStr}</div>
            </div>
            ${typeBadge}
        </div>
        <div class="post-body">${bodyHTML}</div>
        <div class="post-actions">
            <div class="post-action" onclick="likePost(this)">❤️ Like <span>${post.likes || 0}</span></div>
            <div class="post-action" onclick="showToast('💬 Comments coming soon!')">💬 Comment</div>
            <div class="post-action" onclick="showToast('🔗 Link copied!')">🔗 Share</div>
        </div>
    `;
    return card;
}
